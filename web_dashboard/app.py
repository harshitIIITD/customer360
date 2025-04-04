"""
Customer 360 Web Dashboard

This module implements the Flask application serving the Customer360 dashboard.
It provides both the web interface and the API endpoints needed for the UI
to interact with the Customer360 agents.
"""

import os
import sys
import json
import logging
from pathlib import Path
from flask import Flask, jsonify, render_template, request

# Add project root to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from agents.specialized_agents import DataStewardAgent, DomainExpertAgent, MappingAgent, DataEngineerAgent

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Initialize agent instances for API calls
data_steward = DataStewardAgent()
domain_expert = DomainExpertAgent()
mapping_agent = MappingAgent()
data_engineer = DataEngineerAgent()

# Helper functions
def format_response(success, data=None, error=None):
    """Format a standardized API response"""
    response = {"success": success}
    if data:
        response.update(data)
    if error:
        response["error"] = error
    return jsonify(response)

# Web Routes
@app.route('/')
def index():
    """Render the main dashboard page"""
    return render_template('index.html')

# API Routes for Customer360 data
@app.route('/api/customer360-data')
def get_customer360_data():
    """Get data from the Customer 360 view"""
    try:
        limit = request.args.get('limit', 100, type=int)
        
        # Parse any filters from query params
        filters = {}
        if request.args.get('data_source'):
            filters['data_source'] = request.args.get('data_source')
            
        result = data_engineer.action_get_customer_360_data(limit, filters)
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error getting Customer360 data: {e}")
        return format_response(False, error=str(e))

@app.route('/api/data-quality')
def get_data_quality():
    """Get data quality metrics for the Customer 360 view"""
    try:
        result = data_engineer.action_get_data_quality_metrics()
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error getting data quality metrics: {e}")
        return format_response(False, error=str(e))

@app.route('/api/data-lineage')
def get_data_lineage():
    """Get data lineage for Customer 360 attributes"""
    try:
        attribute = request.args.get('attribute')
        result = data_engineer.action_get_data_lineage(attribute)
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error getting data lineage: {e}")
        return format_response(False, error=str(e))

@app.route('/api/fix-data-quality', methods=['POST'])
def fix_data_quality_issue():
    """Fix data quality issues automatically"""
    try:
        data = request.json
        issue_id = data.get('issue_id')
        attribute = data.get('attribute')
        fix_type = data.get('fix_type')
        parameters = data.get('parameters', {})
        
        if not issue_id and not attribute:
            return format_response(False, error="Either issue_id or attribute is required")
            
        result = data_engineer.action_fix_data_quality(issue_id, attribute, fix_type, parameters)
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error fixing data quality: {e}")
        return format_response(False, error=str(e))

@app.route('/api/data-quality/fields')
def get_field_issues():
    """Get data quality issues for specific fields"""
    try:
        attribute = request.args.get('attribute')
        severity = request.args.get('severity')
        result = data_engineer.action_get_field_issues(attribute, severity)
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error getting field issues: {e}")
        return format_response(False, error=str(e))

@app.route('/api/data-quality/history')
def get_quality_history():
    """Get historical data quality metrics"""
    try:
        range_param = request.args.get('range', '30days')
        result = data_engineer.action_get_quality_history(range_param)
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error getting quality history: {e}")
        return format_response(False, error=str(e))

# API Routes for Source Systems
@app.route('/api/source-systems')
def get_source_systems():
    """Get list of registered source systems"""
    try:
        result = data_steward.action_get_source_systems()
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error getting source systems: {e}")
        return format_response(False, error=str(e))

@app.route('/api/register-source', methods=['POST'])
def register_source_system():
    """Register a new source system"""
    try:
        data = request.json
        name = data.get('name')
        description = data.get('description', '')
        owner = data.get('owner', '')
        
        if not name:
            return format_response(False, error="Name is required")
        
        result = data_steward.action_register_source_system(name, description, owner)
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error registering source system: {e}")
        return format_response(False, error=str(e))

@app.route('/api/scan-source/<int:source_id>')
def scan_source_system(source_id):
    """Scan a source system to extract its schema"""
    try:
        result = data_steward.action_scan_source_system(source_id)
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error scanning source system: {e}")
        return format_response(False, error=str(e))

@app.route('/api/source-sample/<int:source_id>')
def get_source_sample(source_id):
    """Get sample data from a source system"""
    try:
        attribute_name = request.args.get('attribute')
        result = data_steward.action_get_sample_data(source_id, attribute_name)
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error getting sample data: {e}")
        return format_response(False, error=str(e))

# API Routes for Customer Attributes
@app.route('/api/customer-attributes')
def get_customer_attributes():
    """Get list of defined customer attributes"""
    try:
        category = request.args.get('category')
        result = domain_expert.action_get_customer_attributes(category)
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error getting customer attributes: {e}")
        return format_response(False, error=str(e))

@app.route('/api/define-attribute', methods=['POST'])
def define_customer_attribute():
    """Define a new target customer attribute"""
    try:
        data = request.json
        name = data.get('name')
        data_type = data.get('data_type')
        description = data.get('description', '')
        is_pii = data.get('is_pii', False)
        category = data.get('category', 'other')
        
        if not name or not data_type:
            return format_response(False, error="Name and data type are required")
        
        result = domain_expert.action_define_customer_attribute(
            name, data_type, description, is_pii, category
        )
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error defining customer attribute: {e}")
        return format_response(False, error=str(e))

# API Routes for Data Mappings
@app.route('/api/mappings')
def get_mappings():
    """Get existing mappings"""
    try:
        source_id = request.args.get('source_id', type=int)
        target_id = request.args.get('target_id', type=int)
        status = request.args.get('status')
        
        result = mapping_agent.action_get_mappings(source_id, target_id, status)
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error getting mappings: {e}")
        return format_response(False, error=str(e))

@app.route('/api/create-mapping', methods=['POST'])
def create_mapping():
    """Create a new data mapping"""
    try:
        data = request.json
        source_system_id = int(data.get('source_system_id'))
        source_attribute = data.get('source_attribute')
        target_attribute_id = int(data.get('target_attribute_id'))
        transformation_logic = data.get('transformation_logic', '')
        created_by = data.get('created_by', 'web_dashboard')
        
        if not source_system_id or not source_attribute or not target_attribute_id:
            return format_response(False, error="Source system, source attribute, and target attribute are required")
        
        result = mapping_agent.action_create_mapping(
            source_system_id, source_attribute, target_attribute_id, transformation_logic, created_by
        )
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error creating mapping: {e}")
        return format_response(False, error=str(e))

@app.route('/api/validate-mapping/<int:mapping_id>')
def validate_mapping(mapping_id):
    """Validate a specific mapping"""
    try:
        result = mapping_agent.action_validate_mapping(mapping_id)
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error validating mapping: {e}")
        return format_response(False, error=str(e))

@app.route('/api/validate-all-mappings')
def validate_all_mappings():
    """Validate all mappings"""
    try:
        source_id = request.args.get('source_id', type=int)
        result = mapping_agent.action_validate_all_mappings(source_id)
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error validating all mappings: {e}")
        return format_response(False, error=str(e))

@app.route('/api/suggest-mappings/<int:source_id>')
def suggest_mappings(source_id):
    """Suggest potential mappings for a source system"""
    try:
        use_ml = request.args.get('use_ml', 'false').lower() == 'true'
        
        if use_ml:
            result = mapping_agent.action_ml_suggest_mappings(source_id)
        else:
            result = mapping_agent.action_suggest_mappings(source_id)
            
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error suggesting mappings: {e}")
        return format_response(False, error=str(e))

@app.route('/api/learn-from-feedback', methods=['POST'])
def learn_from_feedback():
    """Learn from user feedback on mapping suggestions"""
    try:
        data = request.json
        mapping_id = int(data.get('mapping_id'))
        is_approved = data.get('is_approved')
        feedback = data.get('feedback', None)
        
        if mapping_id is None or is_approved is None:
            return format_response(False, error="Mapping ID and approval status are required")
        
        result = mapping_agent.action_learn_from_feedback(mapping_id, is_approved, feedback)
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error learning from feedback: {e}")
        return format_response(False, error=str(e))

# API Routes for Customer 360 Building
@app.route('/api/build-customer360', methods=['POST'])
def build_customer360():
    """Build the Customer 360 view"""
    try:
        data = request.json
        include_pending = data.get('include_pending', False)
        
        result = data_engineer.action_build_customer_360(include_pending)
        return format_response(result.get('success', False), result)
    except Exception as e:
        logger.error(f"Error building Customer 360: {e}")
        return format_response(False, error=str(e))

# System status and health check endpoint
@app.route('/api/system-summary')
def get_system_summary():
    """Get system-wide statistics and health metrics"""
    try:
        # Gather statistics from various agents
        source_systems = data_steward.action_get_source_systems()
        customer_attributes = domain_expert.action_get_customer_attributes()
        mappings_stats = mapping_agent.action_get_mapping_stats()
        customer_count = data_engineer.action_get_customer_count()
        
        # Combine into a system summary
        summary = {
            "source_systems": len(source_systems.get("source_systems", [])),
            "customer_attributes": len(customer_attributes.get("attributes", [])),
            "data_mappings": mappings_stats.get("total_mappings", 0),
            "customer_records": customer_count.get("customer_count", 0),
            "mapping_status": mappings_stats.get("status_counts", {}),
            "attribute_categories": customer_attributes.get("category_counts", {})
        }
        
        return format_response(True, data={"system_summary": summary})
    except Exception as e:
        logger.error(f"Error getting system summary: {e}")
        return format_response(False, error=str(e))

# Start the Flask app when executed directly
if __name__ == '__main__':
    app.run(debug=True)