"""
API package for the Customer 360 Web Dashboard

This package contains API endpoint implementations for various features
of the Customer 360 solution.
"""

from flask import Blueprint

# Create API blueprint
api = Blueprint('api', __name__, url_prefix='/api')

# Import all routes
from web_dashboard.api import etl_routes
from web_dashboard.api import general_routes

# Register sub-blueprints
api.register_blueprint(etl_routes.etl_bp)
api.register_blueprint(general_routes.general_bp)