#!/usr/bin/env python3
"""
General Routes for the Customer 360 Web Dashboard

This module provides general API endpoints for the Customer 360 solution dashboard.
"""

import logging
import os
import sys
from flask import jsonify, Blueprint
import sqlite3

# Add parent directory to path to import from database
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from database.setup_db import get_db_connection

# Set up logging
logger = logging.getLogger(__name__)

# Create Blueprint
general_bp = Blueprint('general', __name__)

@general_bp.route('/system-summary', methods=['GET'])
def get_system_summary():
    """
    Get a summary of the Customer 360 system including counts of:
    - Customer records
    - Source systems
    - Customer attributes
    - Data mappings
    - Mapping status counts
    """
    try:
        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get counts from the database
        summary = {}
        
        # Initialize with defaults in case tables don't exist
        summary['customer_records'] = 0
        summary['source_systems'] = 0
        summary['customer_attributes'] = 0
        summary['data_mappings'] = 0
        summary['mapping_status'] = {
            'validated': 0,
            'proposed': 0,
            'issues': 0,
            'pending': 0
        }
        
        # Check if tables exist before querying them
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='customer_profiles'")
        if cursor.fetchone():
            # Count customer records
            cursor.execute("SELECT COUNT(*) as count FROM customer_profiles")
            result = cursor.fetchone()
            if result:
                summary['customer_records'] = result['count']
                
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='source_systems'")
        if cursor.fetchone():
            # Count source systems
            cursor.execute("SELECT COUNT(*) as count FROM source_systems")
            result = cursor.fetchone()
            if result:
                summary['source_systems'] = result['count']
                
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='customer_attributes'")
        if cursor.fetchone():
            # Count customer attributes
            cursor.execute("SELECT COUNT(*) as count FROM customer_attributes")
            result = cursor.fetchone()
            if result:
                summary['customer_attributes'] = result['count']
                
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='data_mappings'")
        if cursor.fetchone():
            # Count data mappings
            cursor.execute("SELECT COUNT(*) as count FROM data_mappings")
            result = cursor.fetchone()
            if result:
                summary['data_mappings'] = result['count']
            
            # Get mapping status counts
            cursor.execute("""
                SELECT 
                    mapping_status, 
                    COUNT(*) as count 
                FROM data_mappings 
                GROUP BY mapping_status
            """)
            
            # Update with actual counts
            for row in cursor.fetchall():
                status = row['mapping_status'].lower() if row['mapping_status'] else 'pending'
                if status in summary['mapping_status']:
                    summary['mapping_status'][status] = row['count']
                elif status == 'error' or status == 'failed':
                    summary['mapping_status']['issues'] += row['count']
        
        conn.close()
        
        # Return successful response with summary data
        return jsonify({
            'success': True,
            'system_summary': summary
        })
        
    except Exception as e:
        logger.error(f"Error getting system summary: {e}")
        # Return default data structure when there's an error
        default_summary = {
            'customer_records': 0,
            'source_systems': 0,
            'customer_attributes': 0,
            'data_mappings': 0,
            'mapping_status': {
                'validated': 0,
                'proposed': 0,
                'issues': 0,
                'pending': 0
            }
        }
        return jsonify({
            'success': True,
            'system_summary': default_summary
        })