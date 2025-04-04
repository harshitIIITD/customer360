#!/usr/bin/env python3
"""
ETL Process Manager for Customer360 Data Integration

Handles the execution, tracking, and management of ETL processes for the Customer360 data product.
"""

import os
import json
import time
import logging
import sqlite3
import threading
import uuid
import schedule
import random
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Union
from croniter import croniter  # For cron expression parsing

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import shared database functions
from database.setup_db import get_db_connection

# Singleton instance
_etl_manager_instance = None

def get_etl_manager(db_path: Optional[str] = None) -> 'ETLProcessManager':
    """
    Get a singleton instance of the ETL Process Manager.
    
    Args:
        db_path: Optional path to the database. If None, uses the default database.
        
    Returns:
        ETLProcessManager instance
    """
    global _etl_manager_instance
    if _etl_manager_instance is None:
        _etl_manager_instance = ETLProcessManager(db_path)
    return _etl_manager_instance

class ETLProcessManager:
    """
    Manages ETL processes for Customer360 data integration.
    
    This class provides functionality for:
    1. Submitting and executing ETL jobs
    2. Tracking job progress and status
    3. Managing job queues and execution
    4. Logging job results and errors
    5. Providing job history and statistics
    """
    
    # Job status constants
    STATUS_QUEUED = "queued"
    STATUS_RUNNING = "running"
    STATUS_COMPLETED = "completed"
    STATUS_ERROR = "error"
    STATUS_CANCELLED = "cancelled"
    
    # Job type constants
    JOB_TYPE_FULL_ETL = "full_etl"
    JOB_TYPE_EXTRACT = "extract"
    JOB_TYPE_TRANSFORM = "transform"
    JOB_TYPE_LOAD = "load"
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize the ETL Process Manager.
        
        Args:
            db_path: Optional path to the database. If None, uses the default database.
        """
        self.db_path = db_path
        self.job_threads = {}
        self._setup_database()
        
    def _setup_database(self) -> None:
        """
        Set up the ETL job tracking tables in the database if they don't exist.
        """
        try:
            conn = get_db_connection(self.db_path)
            cursor = conn.cursor()
            
            # Create ETL jobs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS etl_jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT UNIQUE NOT NULL,
                    job_name TEXT NOT NULL,
                    job_type TEXT NOT NULL,
                    source_id INTEGER,
                    status TEXT NOT NULL,
                    progress_percentage REAL DEFAULT 0,
                    records_processed INTEGER DEFAULT 0,
                    records_failed INTEGER DEFAULT 0,
                    error_message TEXT,
                    created_by TEXT,
                    start_time TIMESTAMP,
                    end_time TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (source_id) REFERENCES source_systems(id)
                )
            """)
            
            # Create ETL job steps table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS etl_job_steps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT NOT NULL,
                    step_id TEXT UNIQUE NOT NULL,
                    step_name TEXT NOT NULL,
                    step_type TEXT NOT NULL,
                    step_order INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    records_processed INTEGER DEFAULT 0,
                    records_failed INTEGER DEFAULT 0,
                    start_time TIMESTAMP,
                    end_time TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (job_id) REFERENCES etl_jobs(job_id)
                )
            """)
            
            # Create ETL job logs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS etl_job_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT NOT NULL,
                    step_id TEXT,
                    log_level TEXT NOT NULL,
                    message TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (job_id) REFERENCES etl_jobs(job_id),
                    FOREIGN KEY (step_id) REFERENCES etl_job_steps(step_id)
                )
            """)
            
            # Create ETL scheduled processes table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS etl_scheduled_processes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    process_id TEXT UNIQUE NOT NULL,
                    process_name TEXT NOT NULL,
                    source_system INTEGER,
                    target_system TEXT NOT NULL,
                    job_type TEXT NOT NULL,
                    cron_schedule TEXT NOT NULL,
                    enabled BOOLEAN NOT NULL DEFAULT 1,
                    last_run TIMESTAMP,
                    next_run TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (source_system) REFERENCES source_systems(id)
                )
            """)
            
            # Create data lineage tracking table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS data_lineage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lineage_id TEXT UNIQUE NOT NULL,
                    source_system INTEGER NOT NULL,
                    source_table TEXT NOT NULL,
                    source_column TEXT,
                    target_table TEXT NOT NULL,
                    target_column TEXT,
                    transformation TEXT,
                    job_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (source_system) REFERENCES source_systems(id),
                    FOREIGN KEY (job_id) REFERENCES etl_jobs(job_id)
                )
            """)
            
            # Create ETL scheduled jobs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS etl_scheduled_jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    process_id TEXT UNIQUE NOT NULL,
                    process_name TEXT NOT NULL,
                    job_type TEXT NOT NULL,
                    source_system INTEGER,
                    target_system TEXT,
                    cron_schedule TEXT NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            conn.close()
            
            logger.info("ETL job tracking tables initialized")
            
            # Start the scheduler if it's not already running
            self._setup_scheduler()
            
        except Exception as e:
            logger.error(f"Error setting up ETL database tables: {e}")
            raise

    def _setup_scheduler(self) -> None:
        """
        Set up the job scheduler thread to process scheduled ETL jobs.
        """
        self.scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.scheduler_thread.start()
        logger.info("ETL job scheduler started")
        
    def _run_scheduler(self) -> None:
        """
        Run the scheduler in a background thread to process scheduled jobs.
        """
        # Check for scheduled jobs every minute
        while True:
            try:
                self._process_scheduled_jobs()
                time.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Error in scheduler thread: {e}")
                time.sleep(300)  # If there's an error, retry after 5 minutes
                
    def _process_scheduled_jobs(self) -> None:
        """
        Process all scheduled jobs and start any that are due to run.
        """
        try:
            conn = get_db_connection(self.db_path)
            cursor = conn.cursor()
            
            # Get all active scheduled jobs
            cursor.execute("""
                SELECT process_id, process_name, job_type, source_system, 
                       target_system, cron_schedule
                FROM etl_scheduled_jobs
                WHERE is_active = 1
            """)
            
            scheduled_jobs = cursor.fetchall()
            current_time = datetime.now()
            
            for job in scheduled_jobs:
                # Calculate next run time based on cron schedule
                cron = croniter(job['cron_schedule'], current_time)
                next_run = cron.get_next(datetime)
                
                # If it's time to run this job
                if next_run <= current_time:
                    # Submit a new ETL job
                    job_name = f"Scheduled: {job['process_name']}"
                    self.submit_job(
                        job_name=job_name,
                        job_type=job['job_type'],
                        source_id=job['source_system'],
                        created_by=f"scheduler:{job['process_id']}"
                    )
                    
                    logger.info(f"Started scheduled job: {job_name}")
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error processing scheduled jobs: {e}")
            
    def submit_job(self, job_name: str, job_type: str, source_id: Optional[int] = None,
                  created_by: Optional[str] = None) -> Dict[str, Any]:
        """
        Submit a new ETL job for processing.
        
        Args:
            job_name: Name of the ETL job
            job_type: Type of ETL job (one of the JOB_TYPE_* constants)
            source_id: Optional ID of the source system
            created_by: Optional identifier of who created this job
            
        Returns:
            Dictionary with job information
        """
        try:
            # Generate a unique job ID
            job_id = str(uuid.uuid4())
            current_time = datetime.now()
            
            conn = get_db_connection(self.db_path)
            cursor = conn.cursor()
            
            # Insert the new job
            cursor.execute("""
                INSERT INTO etl_jobs (
                    job_id, job_name, job_type, source_id, status,
                    created_by, start_time, created_at, last_updated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (job_id, job_name, job_type, source_id, self.STATUS_QUEUED,
                 created_by, current_time, current_time, current_time))
            
            conn.commit()
            conn.close()
            
            # Start job execution in a separate thread
            thread = threading.Thread(
                target=self._execute_job,
                args=(job_id,),
                daemon=True
            )
            thread.start()
            
            # Store thread reference
            self.job_threads[job_id] = thread
            
            logger.info(f"Job submitted: {job_id} - {job_name}")
            
            return {
                "success": True,
                "job_id": job_id,
                "job_name": job_name,
                "status": self.STATUS_QUEUED
            }
            
        except Exception as e:
            logger.error(f"Error submitting job: {e}")
            return {
                "success": False,
                "error": str(e)
            }
            
    def _execute_job(self, job_id: str) -> None:
        """
        Execute an ETL job in a separate thread.
        
        Args:
            job_id: ID of the job to execute
        """
        try:
            conn = get_db_connection(self.db_path)
            cursor = conn.cursor()
            
            # Update job status to running
            cursor.execute("""
                UPDATE etl_jobs
                SET status = ?, last_updated = ?
                WHERE job_id = ?
            """, (self.STATUS_RUNNING, datetime.now(), job_id))
            
            conn.commit()
            
            # Get job details
            cursor.execute("""
                SELECT job_name, job_type, source_id FROM etl_jobs WHERE job_id = ?
            """, (job_id,))
            
            job = cursor.fetchone()
            if not job:
                logger.error(f"Job not found: {job_id}")
                return
                
            job_name = job['job_name']
            job_type = job['job_type']
            source_id = job['source_id']
            
            # Log start of job execution
            self._add_job_log(conn, job_id, None, "INFO", f"Started job execution: {job_name}")
            
            # Create job steps based on job type
            steps = []
            
            if job_type == self.JOB_TYPE_FULL_ETL:
                steps = [
                    {"name": "Extract Data", "type": "extract", "order": 1},
                    {"name": "Transform Data", "type": "transform", "order": 2},
                    {"name": "Load Data", "type": "load", "order": 3}
                ]
            elif job_type == self.JOB_TYPE_EXTRACT:
                steps = [{"name": "Extract Data", "type": "extract", "order": 1}]
            elif job_type == self.JOB_TYPE_TRANSFORM:
                steps = [{"name": "Transform Data", "type": "transform", "order": 1}]
            elif job_type == self.JOB_TYPE_LOAD:
                steps = [{"name": "Load Data", "type": "load", "order": 1}]
            
            # Create and execute each step
            total_records_processed = 0
            total_records_failed = 0
            error_encountered = False
            
            for step_index, step in enumerate(steps):
                step_id = str(uuid.uuid4())
                step_name = step["name"]
                step_type = step["type"]
                step_order = step["order"]
                step_start_time = datetime.now()
                
                # Insert step record
                cursor.execute("""
                    INSERT INTO etl_job_steps (
                        job_id, step_id, step_name, step_type, step_order,
                        status, start_time
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (job_id, step_id, step_name, step_type, step_order, 
                      self.STATUS_RUNNING, step_start_time))
                
                conn.commit()
                
                # Log start of step
                self._add_job_log(
                    conn, job_id, step_id, "INFO", 
                    f"Started step {step_order}: {step_name}"
                )
                
                try:
                    # Here we would normally call specific processing logic
                    # For now, we'll simulate processing with random success/failure
                    
                    # Simulate processing time
                    processing_time = random.uniform(1, 5)
                    time.sleep(processing_time)
                    
                    # Simulate processing records
                    records_processed = random.randint(100, 5000)
                    records_failed = random.randint(0, int(records_processed * 0.05))  # 0-5% failure rate
                    
                    # Update job progress
                    progress_percentage = ((step_index + 1) / len(steps)) * 100
                    
                    # Update etl_jobs table with progress
                    cursor.execute("""
                        UPDATE etl_jobs
                        SET progress_percentage = ?,
                            records_processed = records_processed + ?,
                            records_failed = records_failed + ?,
                            last_updated = ?
                        WHERE job_id = ?
                    """, (progress_percentage, records_processed, records_failed, 
                          datetime.now(), job_id))
                    
                    # Update step as completed
                    step_end_time = datetime.now()
                    cursor.execute("""
                        UPDATE etl_job_steps
                        SET status = ?,
                            records_processed = ?,
                            records_failed = ?,
                            end_time = ?
                        WHERE step_id = ?
                    """, (self.STATUS_COMPLETED, records_processed, records_failed, 
                          step_end_time, step_id))
                    
                    conn.commit()
                    
                    # Log step completion
                    self._add_job_log(
                        conn, job_id, step_id, "INFO",
                        f"Completed step {step_order}: {step_name}. Processed: {records_processed}, Failed: {records_failed}"
                    )
                    
                    # Update totals
                    total_records_processed += records_processed
                    total_records_failed += records_failed
                    
                except Exception as e:
                    error_message = f"Error in step {step_order} ({step_name}): {str(e)}"
                    logger.error(error_message)
                    
                    # Update step as error
                    step_end_time = datetime.now()
                    cursor.execute("""
                        UPDATE etl_job_steps
                        SET status = ?, end_time = ?
                        WHERE step_id = ?
                    """, (self.STATUS_ERROR, step_end_time, step_id))
                    
                    # Log error
                    self._add_job_log(
                        conn, job_id, step_id, "ERROR", error_message
                    )
                    
                    error_encountered = True
                    break  # Stop processing remaining steps
            
            # Complete the job
            job_end_time = datetime.now()
            job_status = self.STATUS_ERROR if error_encountered else self.STATUS_COMPLETED
            
            cursor.execute("""
                UPDATE etl_jobs
                SET status = ?,
                    progress_percentage = ?,
                    records_processed = ?,
                    records_failed = ?,
                    end_time = ?,
                    last_updated = ?
                WHERE job_id = ?
            """, (job_status, 100 if not error_encountered else None,
                 total_records_processed, total_records_failed,
                 job_end_time, job_end_time, job_id))
            
            conn.commit()
            
            # Log job completion
            self._add_job_log(
                conn, job_id, None, "INFO" if not error_encountered else "ERROR",
                f"Job completed with status {job_status}. Total records processed: {total_records_processed}, failed: {total_records_failed}"
            )
            
            conn.close()
            
        except Exception as e:
            error_message = f"Error executing job {job_id}: {str(e)}"
            logger.error(error_message)
            
            try:
                # Update job status to error
                conn = get_db_connection(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute("""
                    UPDATE etl_jobs
                    SET status = ?,
                        error_message = ?,
                        end_time = ?,
                        last_updated = ?
                    WHERE job_id = ?
                """, (self.STATUS_ERROR, str(e), datetime.now(), datetime.now(), job_id))
                
                # Add error log
                self._add_job_log(conn, job_id, None, "ERROR", error_message)
                
                conn.commit()
                conn.close()
            except Exception as inner_error:
                logger.error(f"Failed to update job error status: {inner_error}")

    def _add_job_log(self, conn, job_id: str, step_id: Optional[str], 
                    log_level: str, message: str) -> None:
        """
        Add a log entry for a job or job step.
        
        Args:
            conn: Database connection
            job_id: ID of the job
            step_id: Optional ID of the job step
            log_level: Log level (INFO, WARNING, ERROR)
            message: Log message
        """
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO etl_job_logs (job_id, step_id, log_level, message)
                VALUES (?, ?, ?, ?)
            """, (job_id, step_id, log_level, message))
            
            conn.commit()
            
        except Exception as e:
            logger.error(f"Error adding job log: {e}")

    def get_job(self, job_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific ETL job.
        
        Args:
            job_id: ID of the job
            
        Returns:
            Dictionary with job information or None if job not found
        """
        try:
            conn = get_db_connection(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get job details
            cursor.execute("""
                SELECT * FROM etl_jobs WHERE job_id = ?
            """, (job_id,))
            
            job = cursor.fetchone()
            if not job:
                return None
                
            job_dict = dict(job)
            
            # Get job steps
            cursor.execute("""
                SELECT * FROM etl_job_steps WHERE job_id = ? ORDER BY step_order
            """, (job_id,))
            
            steps = [dict(row) for row in cursor.fetchall()]
            job_dict['steps'] = steps
            
            # Get job logs
            cursor.execute("""
                SELECT * FROM etl_job_logs WHERE job_id = ? ORDER BY timestamp DESC LIMIT 100
            """, (job_id,))
            
            logs = [dict(row) for row in cursor.fetchall()]
            job_dict['logs'] = logs
            
            conn.close()
            return job_dict
            
        except Exception as e:
            logger.error(f"Error getting job details: {e}")
            return None

    def get_active_jobs(self) -> List[Dict[str, Any]]:
        """
        Get all currently active (running or queued) ETL jobs.
        
        Returns:
            List of dictionaries with job information
        """
        try:
            conn = get_db_connection(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get active jobs
            cursor.execute("""
                SELECT * FROM etl_jobs 
                WHERE status IN (?, ?)
                ORDER BY start_time DESC
            """, (self.STATUS_RUNNING, self.STATUS_QUEUED))
            
            jobs = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            return jobs
            
        except Exception as e:
            logger.error(f"Error getting active jobs: {e}")
            return []

    def get_job_history(self, limit: int = 20, offset: int = 0, 
                       status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get ETL job history with pagination and optional filtering.
        
        Args:
            limit: Maximum number of jobs to return
            offset: Number of jobs to skip for pagination
            status_filter: Optional job status to filter by
            
        Returns:
            List of dictionaries with job information
        """
        try:
            conn = get_db_connection(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Base query
            query = "SELECT * FROM etl_jobs"
            params = []
            
            # Add status filter if provided
            if status_filter:
                query += " WHERE status = ?"
                params.append(status_filter)
                
            # Add order by and pagination
            query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            jobs = [dict(row) for row in cursor.fetchall()]
            
            conn.close()
            return jobs
            
        except Exception as e:
            logger.error(f"Error getting job history: {e}")
            return []

    def create_job(self, job_name: str, job_type: str, source_id: Optional[int] = None,
                  created_by: Optional[str] = None, parameters: Optional[Dict] = None) -> str:
        """
        Create a new ETL job and queue it for processing.
        
        Args:
            job_name: Name of the ETL job
            job_type: Type of ETL job (one of the JOB_TYPE_* constants)
            source_id: Optional ID of the source system
            created_by: Optional identifier of who created this job
            parameters: Optional parameters for the job
            
        Returns:
            Job ID if successful, None otherwise
        """
        try:
            # Generate a unique job ID
            job_id = str(uuid.uuid4())
            current_time = datetime.now()
            
            conn = get_db_connection(self.db_path)
            cursor = conn.cursor()
            
            # Insert the new job
            cursor.execute("""
                INSERT INTO etl_jobs (
                    job_id, job_name, job_type, source_id, status,
                    created_by, start_time, created_at, last_updated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (job_id, job_name, job_type, source_id, self.STATUS_QUEUED,
                 created_by, current_time, current_time, current_time))
            
            conn.commit()
            
            # Store parameters if provided (would need an additional table in a real implementation)
            if parameters:
                # For demonstration purposes, we'll just log them
                self._add_job_log(conn, job_id, None, "INFO", f"Job parameters: {json.dumps(parameters)}")
            
            conn.close()
            
            # Start job execution in a separate thread
            thread = threading.Thread(
                target=self._execute_job,
                args=(job_id,),
                daemon=True
            )
            thread.start()
            
            # Store thread reference
            self.job_threads[job_id] = thread
            
            logger.info(f"Job created: {job_id} - {job_name}")
            
            return job_id
            
        except Exception as e:
            logger.error(f"Error creating job: {e}")
            return None

    def update_job_status(self, job_id: str, status: str) -> bool:
        """
        Update the status of an ETL job.
        
        Args:
            job_id: ID of the job to update
            status: New job status
            
        Returns:
            True if successful, False otherwise
        """
        try:
            conn = get_db_connection(self.db_path)
            cursor = conn.cursor()
            
            # Check if job exists
            cursor.execute("SELECT id FROM etl_jobs WHERE job_id = ?", (job_id,))
            if not cursor.fetchone():
                conn.close()
                return False
                
            current_time = datetime.now()
            
            # Update job status
            cursor.execute("""
                UPDATE etl_jobs
                SET status = ?, last_updated = ?
                WHERE job_id = ?
            """, (status, current_time, job_id))
            
            # If job is cancelled, add a log entry
            if status == self.STATUS_CANCELLED:
                self._add_job_log(conn, job_id, None, "WARNING", "Job cancelled by user")
                
                # If job has an end_time that is None, set it
                cursor.execute("""
                    UPDATE etl_jobs
                    SET end_time = ?
                    WHERE job_id = ? AND end_time IS NULL
                """, (current_time, job_id))
            
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating job status: {e}")
            return False

    def get_job_statistics(self, time_period: Optional[str] = None) -> Dict[str, Any]:
        """
        Get ETL job statistics for different time periods.
        
        Args:
            time_period: Time period to get statistics for ('today', 'week', 'month', 'all')
            
        Returns:
            Dictionary with job statistics
        """
        try:
            conn = get_db_connection(self.db_path)
            cursor = conn.cursor()
            
            # Build date filter based on time_period
            date_filter = ""
            params = []
            
            if time_period == 'today':
                date_filter = "WHERE DATE(created_at) = DATE('now')"
            elif time_period == 'week':
                date_filter = "WHERE DATE(created_at) >= DATE('now', '-7 days')"
            elif time_period == 'month':
                date_filter = "WHERE DATE(created_at) >= DATE('now', '-30 days')"
            
            # Get total job counts by status
            cursor.execute(f"""
                SELECT status, COUNT(*) as count
                FROM etl_jobs
                {date_filter}
                GROUP BY status
            """, params)
            
            status_counts = {}
            for row in cursor.fetchall():
                status_counts[row[0]] = row[1]
                
            # Get average processing time for completed jobs
            cursor.execute(f"""
                SELECT AVG(JULIANDAY(end_time) - JULIANDAY(start_time)) * 86400 as avg_seconds
                FROM etl_jobs
                WHERE status = ? AND end_time IS NOT NULL {date_filter}
            """, [self.STATUS_COMPLETED] + params)
            
            avg_processing_time = cursor.fetchone()[0] or 0
            
            # Get total records processed and failed
            cursor.execute(f"""
                SELECT 
                    SUM(records_processed) as total_processed,
                    SUM(records_failed) as total_failed
                FROM etl_jobs
                {date_filter}
            """, params)
            
            row = cursor.fetchone()
            total_processed = row[0] or 0
            total_failed = row[1] or 0
            
            # Get average records processed per job
            cursor.execute(f"""
                SELECT AVG(records_processed) as avg_processed
                FROM etl_jobs
                WHERE records_processed > 0 {date_filter}
            """, params)
            
            avg_records_processed = cursor.fetchone()[0] or 0
            
            # Get job counts by type
            cursor.execute(f"""
                SELECT job_type, COUNT(*) as count
                FROM etl_jobs
                {date_filter}
                GROUP BY job_type
            """, params)
            
            job_type_counts = {}
            for row in cursor.fetchall():
                job_type_counts[row[0]] = row[1]
                
            conn.close()
            
            # Build final statistics object
            stats = {
                'time_period': time_period or 'all',
                'total_jobs': sum(status_counts.values()) if status_counts else 0,
                'status_counts': status_counts,
                'job_type_counts': job_type_counts,
                'avg_processing_time_seconds': avg_processing_time,
                'total_records_processed': total_processed,
                'total_records_failed': total_failed,
                'avg_records_processed': avg_records_processed,
                'failure_rate': (total_failed / total_processed * 100) if total_processed > 0 else 0,
                'success_rate': ((total_processed - total_failed) / total_processed * 100) if total_processed > 0 else 0
            }
            
            return {
                'success': True,
                'statistics': stats
            }
            
        except Exception as e:
            logger.error(f"Error getting job statistics: {e}")
            return {
                'success': False,
                'error': str(e)
            }

if __name__ == "__main__":
    # Simple command-line interface for testing
    import argparse
    
    parser = argparse.ArgumentParser(description="ETL Process Manager CLI")
    parser.add_argument("--submit", action="store_true", help="Submit a test ETL job")
    parser.add_argument("--list", action="store_true", help="List all ETL jobs")
    parser.add_argument("--stats", action="store_true", help="Show ETL job statistics")
    parser.add_argument("--job-id", help="Get details for a specific job ID")
    
    args = parser.parse_args()
    
    etl_manager = get_etl_manager()
    
    if args.submit:
        result = etl_manager.submit_job(
            job_name="Test ETL Job",
            job_type=ETLProcessManager.JOB_TYPE_FULL_ETL,
            source_id=1,  # Assuming source ID 1 exists
            created_by="cli_user"
        )
        
        if result["success"]:
            print(f"Job submitted successfully! Job ID: {result['job_id']}")
        else:
            print(f"Job submission failed: {result['error']}")
            
    elif args.list:
        active_jobs = etl_manager.get_active_jobs()
        history = etl_manager.get_job_history()
        
        print("\n=== Active ETL Jobs ===")
        for job in active_jobs:
            print(f"ID: {job['job_id']}, Name: {job['job_name']}, Status: {job['status']}, Progress: {job['progress_percentage']}%")
            
        print("\n=== ETL Job History ===")
        for job in history:
            print(f"ID: {job['job_id']}, Name: {job['job_name']}, Status: {job['status']}, Records: {job['records_processed']}")
            
    elif args.stats:
        stats = etl_manager.get_job_statistics()
        
        if stats["success"]:
            print("\n=== ETL Job Statistics ===")
            print(f"Status Counts: {stats['statistics']['status_counts']}")
            print(f"Type Counts: {stats['statistics']['type_counts']}")
            print(f"Total Records Processed: {stats['statistics']['total_processed']}")
            print(f"Total Records Failed: {stats['statistics']['total_failed']}")
            print(f"Average Duration (seconds): {stats['statistics']['average_duration']}")
        else:
            print(f"Failed to get statistics: {stats['error']}")
            
    elif args.job_id:
        job = etl_manager.get_job(args.job_id)
        
        if job:
            print("\n=== ETL Job Details ===")
            print(f"ID: {job['job_id']}")
            print(f"Name: {job['job_name']}")
            print(f"Type: {job['job_type']}")
            print(f"Status: {job['status']}")
            print(f"Progress: {job['progress_percentage']}%")
            print(f"Records Processed: {job['records_processed']}")
            print(f"Records Failed: {job['records_failed']}")
            print(f"Started: {job['start_time']}")
            print(f"Ended: {job['end_time']}")
            print(f"Duration: {job['duration']} seconds")
            
            if job["error_message"]:
                print(f"\nError: {job['error_message']}")
                
            print("\nSteps:")
            for step in job["steps"]:
                print(f"  - {step['step_name']}: {step['status']}, Processed: {step['records_processed']}, Failed: {step['records_failed']}")
                
            print("\nRecent Logs:")
            for log in job["logs"][:5]:
                print(f"  [{log['timestamp']}] [{log['log_level']}] {log['message']}")
        else:
            print(f"Job not found: {args.job_id}")
    else:
        parser.print_help()