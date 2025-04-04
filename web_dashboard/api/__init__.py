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