#!/usr/bin/env python3
"""
ETL Routes for the Customer 360 Web Dashboard

This module provides API endpoints for managing ETL processes in the Customer 360 solution.
"""

import logging
from flask import request, jsonify, Blueprint
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add parent directory to path to import from tools
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from tools.etl_process_manager import ETLProcessManager

# Set up logging
logger = logging.getLogger(__name__)

# Create Blueprint
etl_bp = Blueprint('etl', __name__)

# Initialize ETL Process Manager
etl_manager = ETLProcessManager()

@etl_bp.route('/jobs', methods=['GET'])
def get_jobs():
    """Get a list of ETL jobs based on status filter"""
    status = request.args.get('status', None)
    limit = int(request.args.get('limit', 20))
    offset = int(request.args.get('offset', 0))
    
    if status in ['running', 'active']:
        jobs = etl_manager.get_active_jobs()
        return jsonify({
            'success': True,
            'jobs': jobs,
            'total': len(jobs)
        })
    else:
        jobs = etl_manager.get_job_history(limit=limit, offset=offset, status_filter=status)
        # For pagination, we would typically get the total count separately
        # This is a simplified version
        return jsonify({
            'success': True,
            'jobs': jobs,
            'total': len(jobs) + offset  # This is an approximation
        })

@etl_bp.route('/jobs/<job_id>', methods=['GET'])
def get_job_details(job_id):
    """Get detailed information about a specific job"""
    job = etl_manager.get_job(job_id)
    
    if job:
        return jsonify({
            'success': True,
            'job': job
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Job not found'
        }), 404

@etl_bp.route('/jobs', methods=['POST'])
def create_job():
    """Create a new ETL job"""
    data = request.get_json()
    
    if not data:
        return jsonify({
            'success': False,
            'error': 'No data provided'
        }), 400
        
    required_fields = ['job_name', 'job_type', 'source_id']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'error': f'Missing required field: {field}'
            }), 400
    
    # Set default values
    data['created_by'] = data.get('created_by', 'system')
    
    # Create job
    job_id = etl_manager.create_job(
        job_name=data['job_name'],
        job_type=data['job_type'],
        source_id=data['source_id'],
        created_by=data['created_by'],
        parameters=data.get('parameters', {})
    )
    
    if job_id:
        return jsonify({
            'success': True,
            'job_id': job_id,
            'message': 'Job created successfully'
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Failed to create job'
        }), 500

@etl_bp.route('/jobs/<job_id>/cancel', methods=['POST'])
def cancel_job(job_id):
    """Cancel a running or queued job"""
    result = etl_manager.update_job_status(job_id, ETLProcessManager.STATUS_CANCELLED)
    
    if result:
        return jsonify({
            'success': True,
            'message': 'Job cancelled successfully'
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Failed to cancel job'
        }), 500

@etl_bp.route('/jobs/<job_id>/restart', methods=['POST'])
def restart_job(job_id):
    """Restart a completed, cancelled, or failed job"""
    # First get the original job details
    original_job = etl_manager.get_job(job_id)
    
    if not original_job:
        return jsonify({
            'success': False,
            'error': 'Job not found'
        }), 404
        
    # Create a new job with the same parameters
    new_job_id = etl_manager.create_job(
        job_name=f"Restart of {original_job['job_name']}",
        job_type=original_job['job_type'],
        source_id=original_job['source_id'],
        created_by=original_job['created_by'],
        parameters={}  # We would need to store parameters in the DB to properly implement this
    )
    
    if new_job_id:
        return jsonify({
            'success': True,
            'original_job_id': job_id,
            'new_job_id': new_job_id,
            'message': 'Job restarted successfully'
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Failed to restart job'
        }), 500

@etl_bp.route('/statistics', methods=['GET'])
def get_statistics():
    """Get ETL job statistics"""
    time_period = request.args.get('period', None)
    
    if time_period not in ['today', 'week', 'month', 'all', None]:
        return jsonify({
            'success': False,
            'error': 'Invalid time period'
        }), 400
        
    stats = etl_manager.get_job_statistics(time_period)
    return jsonify(stats)

@etl_bp.route('/job-types', methods=['GET'])
def get_job_types():
    """Get available job types"""
    # In a real application, this might be dynamic or stored in a database
    job_types = [
        {'id': 'FULL_LOAD', 'name': 'Full Load', 'description': 'Process all data from the source system'},
        {'id': 'INCREMENTAL', 'name': 'Incremental Load', 'description': 'Process only new or changed data since the last run'},
        {'id': 'VALIDATION', 'name': 'Data Validation', 'description': 'Validate data quality without loading'},
        {'id': 'TRANSFORMATION', 'name': 'Data Transformation', 'description': 'Transform existing data in the warehouse'}
    ]
    
    return jsonify({
        'success': True,
        'job_types': job_types
    })