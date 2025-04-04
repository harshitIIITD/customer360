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
            
    def create_scheduled_job(self, process_name: str, job_type: str,
                             source_system: Optional[int] = None, target_system: Optional[str] = None,
                             cron_schedule: str = "0 0 * * *") -> Dict[str, Any]:
        """
        Create a new scheduled ETL job.
        
        Args:
            process_name: Name of the ETL process
            job_type: Type of ETL job to run
            source_system: Optional ID of the source system
            target_system: Optional name of target system
            cron_schedule: Cron expression for the schedule (default: daily at midnight)
            
        Returns:
            Dictionary with operation result
        """
        try:
            # Generate a unique process ID
            process_id = str(uuid.uuid4())
            
            conn = get_db_connection(self.db_path)
            cursor = conn.cursor()
            
            # Insert the scheduled job
            cursor.execute("""
                INSERT INTO etl_scheduled_jobs (
                    process_id, process_name, job_type, source_system,
                    target_system, cron_schedule, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (process_id, process_name, job_type, source_system,
                 target_system, cron_schedule, True))
            
            conn.commit()
            
            # Return the created scheduled job
            cursor.execute("""
                SELECT * FROM etl_scheduled_jobs WHERE process_id = ?
            """, (process_id,))
            
            scheduled_job = dict(cursor.fetchone())
            conn.close()
            
            return {
                "success": True,
                "process_id": process_id,
                "scheduled_job": scheduled_job
            }
            
        except Exception as e:
            logger.error(f"Error creating scheduled job: {e}")
            return {
                "success": False,
                "error": str(e)
            }
            
    def update_scheduled_job(self, process_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update an existing scheduled ETL job.
        
        Args:
            process_id: ID of the scheduled job to update
            updates: Dictionary of fields to update
            
        Returns:
            Dictionary with operation result
        """
        try:
            conn = get_db_connection(self.db_path)
            cursor = conn.cursor()
            
            # Check if the scheduled job exists
            cursor.execute("""
                SELECT COUNT(*) FROM etl_scheduled_jobs WHERE process_id = ?
            """, (process_id,))
            
            if cursor.fetchone()[0] == 0:
                conn.close()
                return {
                    "success": False,
                    "error": f"Scheduled job not found: {process_id}"
                }
                
            # Build the UPDATE query dynamically based on provided fields
            allowed_fields = {
                'process_name', 'job_type', 'source_system', 
                'target_system', 'cron_schedule', 'is_active'
            }
            
            # Filter out fields that aren't in the allowed list
            valid_updates = {k: v for k, v in updates.items() if k in allowed_fields}
            
            if not valid_updates:
                conn.close()
                return {
                    "success": False,
                    "error": "No valid fields to update"
                }
                
            # Build the SQL query
            sql_parts = []
            params = []
            
            for field, value in valid_updates.items():
                sql_parts.append(f"{field} = ?")
                params.append(value)
                
            # Add the process_id as the last parameter
            params.append(process_id)
            
            # Execute the update
            cursor.execute(f"""
                UPDATE etl_scheduled_jobs
                SET {', '.join(sql_parts)}
                WHERE process_id = ?
            """, params)
            
            conn.commit()
            
            # Return the updated scheduled job
            cursor.execute("""
                SELECT * FROM etl_scheduled_jobs WHERE process_id = ?
            """, (process_id,))
            
            updated_job = dict(cursor.fetchone())
            conn.close()
            
            return {
                "success": True,
                "scheduled_job": updated_job
            }
            
        except Exception as e:
            logger.error(f"Error updating scheduled job: {e}")
            return {
                "success": False,
                "error": str(e)
            }
            
    def delete_scheduled_job(self, process_id: str) -> Dict[str, Any]:
        """
        Delete a scheduled ETL job.
        
        Args:
            process_id: ID of the scheduled job to delete
            
        Returns:
            Dictionary with operation result
        """
        try:
            conn = get_db_connection(self.db_path)
            cursor = conn.cursor()
            
            # Check if the scheduled job exists
            cursor.execute("""
                SELECT COUNT(*) FROM etl_scheduled_jobs WHERE process_id = ?
            """, (process_id,))
            
            if cursor.fetchone()[0] == 0:
                conn.close()
                return {
                    "success": False,
                    "error": f"Scheduled job not found: {process_id}"
                }
                
            # Delete the scheduled job
            cursor.execute("""
                DELETE FROM etl_scheduled_jobs WHERE process_id = ?
            """, (process_id,))
            
            conn.commit()
            conn.close()
            
            return {
                "success": True,
                "message": f"Scheduled job deleted: {process_id}"
            }
            
        except Exception as e:
            logger.error(f"Error deleting scheduled job: {e}")
            return {
                "success": False,
                "error": str(e)
            }
            
    def get_scheduled_jobs(self, is_active: Optional[bool] = None) -> Dict[str, Any]:
        """
        Get all scheduled ETL jobs, optionally filtered by active status.
        
        Args:
            is_active: Optional filter for active/inactive jobs
            
        Returns:
            Dictionary with scheduled jobs
        """
        try:
            conn = get_db_connection(self.db_path)
            cursor = conn.cursor()
            
            query = "SELECT * FROM etl_scheduled_jobs"
            params = []
            
            # Apply filter if provided
            if is_active is not None:
                query += " WHERE is_active = ?"
                params.append(is_active)
                
            # Execute the query
            cursor.execute(query, params)
            
            scheduled_jobs = [dict(job) for job in cursor.fetchall()]
            conn.close()
            
            return {
                "success": True,
                "scheduled_jobs": scheduled_jobs
            }
            
        except Exception as e:
            logger.error(f"Error getting scheduled jobs: {e}")
            return {
                "success": False,
                "error": str(e)
            }
            
    def trigger_scheduled_job(self, process_id: str) -> Dict[str, Any]:
        """
        Manually trigger a scheduled ETL job.
        
        Args:
            process_id: ID of the scheduled job to trigger
            
        Returns:
            Dictionary with job execution details
        """
        try:
            conn = get_db_connection(self.db_path)
            cursor = conn.cursor()
            
            # Get the scheduled job details
            cursor.execute("""
                SELECT * FROM etl_scheduled_jobs WHERE process_id = ?
            """, (process_id,))
            
            job = cursor.fetchone()
            
            if not job:
                conn.close()
                return {
                    "success": False,
                    "error": f"Scheduled job not found: {process_id}"
                }
                
            job = dict(job)
            
            # Create a new ETL job based on the scheduled job details
            job_name = f"{job['process_name']}_manual_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            result = self.submit_job(
                job_name=job_name,
                job_type=job['job_type'],
                source_id=job['source_system'],
                created_by=f"scheduler:{process_id}"
            )
            
            conn.close()
            
            return result
            
        except Exception as e:
            logger.error(f"Error triggering scheduled job: {e}")
            return {
                "success": False,
                "error": str(e)
            }
            
    def track_data_lineage(self, source_system: str, target_system: str, 
                           dataset_name: str, transformation_type: str,
                           job_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Track data lineage for ETL operations.
        
        Args:
            source_system: Source system name
            target_system: Target system name
            dataset_name: Name of the dataset being processed
            transformation_type: Type of transformation applied
            job_id: Optional job ID to associate with this lineage entry
            
        Returns:
            Dictionary with operation result
        """
        try:
            # Generate a unique lineage ID
            lineage_id = str(uuid.uuid4())
            
            conn = get_db_connection(self.db_path)
            cursor = conn.cursor()
            
            # Insert the data lineage record
            cursor.execute("""
                INSERT INTO data_lineage (
                    lineage_id, source_system, target_system, 
                    dataset_name, transformation_type, job_id,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (lineage_id, source_system, target_system, 
                 dataset_name, transformation_type, job_id,
                 datetime.now(), datetime.now()))
            
            conn.commit()
            
            # Return the created lineage record
            cursor.execute("""
                SELECT * FROM data_lineage WHERE lineage_id = ?
            """, (lineage_id,))
            
            lineage = dict(cursor.fetchone())
            conn.close()
            
            return {
                "success": True,
                "lineage_id": lineage_id,
                "lineage": lineage
            }
            
        except Exception as e:
            logger.error(f"Error tracking data lineage: {e}")
            return {
                "success": False,
                "error": str(e)
            }
            
    def get_data_lineage(self, dataset_name: Optional[str] = None, 
                         source_system: Optional[str] = None) -> Dict[str, Any]:
        """
        Get data lineage information, optionally filtered by dataset or source system.
        
        Args:
            dataset_name: Optional dataset name to filter by
            source_system: Optional source system to filter by
            
        Returns:
            Dictionary with data lineage records
        """
        try:
            conn = get_db_connection(self.db_path)
            cursor = conn.cursor()
            
            query = "SELECT * FROM data_lineage"
            params = []
            where_clauses = []
            
            # Apply filters if provided
            if dataset_name is not None:
                where_clauses.append("dataset_name = ?")
                params.append(dataset_name)
                
            if source_system is not None:
                where_clauses.append("source_system = ?")
                params.append(source_system)
                
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
                
            # Execute the query
            cursor.execute(query, params)
            
            lineage_records = [dict(record) for record in cursor.fetchall()]
            conn.close()
            
            return {
                "success": True,
                "lineage_records": lineage_records
            }
            
        except Exception as e:
            logger.error(f"Error getting data lineage: {e}")
            return {
                "success": False,
                "error": str(e)
            }
            
    def build_data_lineage_graph(self, dataset_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Build a graph representation of data lineage for visualization.
        
        Args:
            dataset_name: Optional dataset name to filter by
            
        Returns:
            Dictionary with nodes and edges for graph visualization
        """
        try:
            lineage_data = self.get_data_lineage(dataset_name=dataset_name)
            
            if not lineage_data.get("success"):
                return lineage_data
                
            lineage_records = lineage_data.get("lineage_records", [])
            
            # Build nodes and edges for graph visualization
            nodes = set()
            edges = []
            
            for record in lineage_records:
                source = record["source_system"]
                target = record["target_system"]
                dataset = record["dataset_name"]
                transform = record["transformation_type"]
                
                # Add nodes
                nodes.add(source)
                nodes.add(target)
                
                # Add edge
                edges.append({
                    "source": source,
                    "target": target,
                    "dataset": dataset,
                    "transformation": transform,
                    "lineage_id": record["lineage_id"]
                })
                
            return {
                "success": True,
                "graph": {
                    "nodes": list(nodes),
                    "edges": edges
                }
            }
            
        except Exception as e:
            logger.error(f"Error building data lineage graph: {e}")
            return {
                "success": False,
                "error": str(e)
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