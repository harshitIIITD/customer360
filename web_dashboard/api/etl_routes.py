#!/usr/bin/env python3
"""
ETL Routes for the Customer 360 Web Dashboard

This module provides API endpoints for managing ETL processes in the Customer 360 solution.
"""

import logging
from flask import request, jsonify, Blueprint
from web_dashboard.api import api
from tools.etl_process_manager import get_etl_manager, ETLProcessManager

# Set up logging
logger = logging.getLogger(__name__)

# Helper functions
def format_response(success, data=None, error=None):
    """Format a standardized API response"""
    response = {"success": success}
    if data:
        response["data"] = data
    if error:
        response["error"] = error
    return jsonify(response)

# Get ETL manager instance
etl_manager = get_etl_manager()

# ETL Job endpoints
@api.route('/etl/jobs', methods=['POST'])
def submit_etl_job():
    """Submit a new ETL job"""
    try:
        data = request.json
        job_name = data.get('job_name')
        job_type = data.get('job_type')
        source_id = data.get('source_id')
        created_by = data.get('created_by', request.remote_addr)
        
        if not job_name or not job_type:
            return format_response(False, error="Job name and type are required")
            
        result = etl_manager.submit_job(job_name, job_type, source_id, created_by)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error submitting ETL job: {e}")
        return format_response(False, error=str(e))

@api.route('/etl/jobs', methods=['GET'])
def get_etl_jobs():
    """Get list of ETL jobs based on status"""
    try:
        status_filter = request.args.get('status')
        
        if status_filter == 'active':
            jobs = etl_manager.get_active_jobs()
            return format_response(True, data={"jobs": jobs})
        else:
            limit = int(request.args.get('limit', 50))
            jobs = etl_manager.get_job_history(limit)
            return format_response(True, data={"jobs": jobs})
            
    except Exception as e:
        logger.error(f"Error getting ETL jobs: {e}")
        return format_response(False, error=str(e))

@api.route('/etl/jobs/<job_id>', methods=['GET'])
def get_etl_job(job_id):
    """Get details for a specific ETL job"""
    try:
        job = etl_manager.get_job(job_id)
        
        if job:
            return format_response(True, data={"job": job})
        else:
            return format_response(False, error=f"Job not found: {job_id}")
            
    except Exception as e:
        logger.error(f"Error getting ETL job details: {e}")
        return format_response(False, error=str(e))
        
@api.route('/etl/jobs/<job_id>/cancel', methods=['POST'])
def cancel_etl_job(job_id):
    """Cancel an ETL job"""
    try:
        result = etl_manager.cancel_job(job_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error cancelling ETL job: {e}")
        return format_response(False, error=str(e))

@api.route('/etl/statistics', methods=['GET'])
def get_etl_statistics():
    """Get ETL job statistics"""
    try:
        result = etl_manager.get_job_statistics()
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error getting ETL statistics: {e}")
        return format_response(False, error=str(e))

# ETL Scheduled Jobs endpoints
@api.route('/etl/scheduled-jobs', methods=['GET'])
def get_scheduled_etl_jobs():
    """Get list of scheduled ETL jobs"""
    try:
        scheduled_jobs = etl_manager.get_scheduled_jobs()
        return format_response(True, data={"scheduled_jobs": scheduled_jobs})
            
    except Exception as e:
        logger.error(f"Error getting scheduled ETL jobs: {e}")
        return format_response(False, error=str(e))

@api.route('/etl/scheduled-jobs', methods=['POST'])
def create_scheduled_etl_job():
    """Create a new scheduled ETL job"""
    try:
        data = request.json
        process_name = data.get('process_name')
        job_type = data.get('job_type')
        source_system = data.get('source_system')
        target_system = data.get('target_system')
        cron_schedule = data.get('cron_schedule')
        
        if not process_name or not job_type or not target_system or not cron_schedule:
            return format_response(False, error="Missing required fields")
            
        result = etl_manager.create_scheduled_job(
            process_name=process_name,
            job_type=job_type,
            source_system=source_system,
            target_system=target_system,
            cron_schedule=cron_schedule
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error creating scheduled ETL job: {e}")
        return format_response(False, error=str(e))

@api.route('/etl/scheduled-jobs/<process_id>', methods=['PUT'])
def update_scheduled_etl_job(process_id):
    """Update a scheduled ETL job"""
    try:
        data = request.json
        result = etl_manager.update_scheduled_job(process_id, data)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error updating scheduled ETL job: {e}")
        return format_response(False, error=str(e))

@api.route('/etl/scheduled-jobs/<process_id>', methods=['DELETE'])
def delete_scheduled_etl_job(process_id):
    """Delete a scheduled ETL job"""
    try:
        result = etl_manager.delete_scheduled_job(process_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error deleting scheduled ETL job: {e}")
        return format_response(False, error=str(e))

# Data Lineage endpoints
@api.route('/etl/lineage', methods=['GET'])
def get_data_lineage():
    """Get data lineage information with optional filters"""
    try:
        target_table = request.args.get('target_table')
        source_system = request.args.get('source_system')
        
        if source_system and source_system.isdigit():
            source_system = int(source_system)
            
        result = etl_manager.get_data_lineage(
            target_table=target_table,
            source_system=source_system
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error getting data lineage: {e}")
        return format_response(False, error=str(e))

@api.route('/etl/lineage/column', methods=['GET'])
def get_column_lineage():
    """Get lineage for a specific column"""
    try:
        target_column = request.args.get('column')
        target_table = request.args.get('table')
        
        if not target_column or not target_table:
            return format_response(False, error="Column and table parameters are required")
            
        result = etl_manager.get_column_lineage(
            target_column=target_column,
            target_table=target_table
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error getting column lineage: {e}")
        return format_response(False, error=str(e))

@api.route('/etl/lineage', methods=['POST'])
def track_data_lineage():
    """Track data lineage for a specific data field or table"""
    try:
        data = request.json
        source_system = data.get('source_system')
        source_table = data.get('source_table')
        source_column = data.get('source_column')
        target_table = data.get('target_table')
        target_column = data.get('target_column')
        transformation = data.get('transformation')
        job_id = data.get('job_id')
        
        if not source_system or not source_table or not target_table:
            return format_response(False, error="Missing required fields")
            
        result = etl_manager.track_data_lineage(
            source_system=source_system,
            source_table=source_table,
            source_column=source_column,
            target_table=target_table,
            target_column=target_column,
            transformation=transformation,
            job_id=job_id
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error tracking data lineage: {e}")
        return format_response(False, error=str(e))