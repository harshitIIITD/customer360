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
from web_dashboard.api import api as api_blueprint

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Register API Blueprint
app.register_blueprint(api_blueprint)

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

# Start the Flask app when executed directly
if __name__ == '__main__':
    app.run(debug=True)