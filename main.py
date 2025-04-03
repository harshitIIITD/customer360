#!/usr/bin/env python3
"""
Customer 360 Data Product with Agentic Solution

This is the main entry point for the Customer 360 data product solution,
which uses multiple specialized agents to build a comprehensive banking
customer view.
"""

import os
import sys
import logging
import argparse
import yaml
from pathlib import Path
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def load_config(config_path: str = None) -> Dict[str, Any]:
    """
    Load the application configuration from the YAML file.
    
    Args:
        config_path: Path to the configuration file
        
    Returns:
        Configuration dictionary
    """
    if config_path is None:
        config_path = os.path.join("data", "config.yaml")
        
    try:
        with open(config_path, 'r') as config_file:
            config = yaml.safe_load(config_file)
            
        logger.info(f"Loaded configuration from {config_path}")
        return config
    except Exception as e:
        logger.error(f"Error loading configuration: {e}")
        return {}
        
def initialize_database(config: Dict[str, Any]) -> bool:
    """
    Initialize the database for the Customer 360 solution.
    
    Args:
        config: The application configuration
        
    Returns:
        True if successful, False otherwise
    """
    try:
        from database.setup_db import init_db
        
        db_path = config.get('database', {}).get('path', 'customer360.db')
        schema_path = config.get('database', {}).get('schema_path', 'database/schema.sql')
        
        logger.info(f"Initializing database: {db_path}")
        init_db(db_path, schema_path)
        
        logger.info("Database initialization completed")
        return True
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False

def run_workflow(config: Dict[str, Any], framework: str, workflow_name: str) -> bool:
    """
    Run a workflow using the specified agent framework.
    
    Args:
        config: The application configuration
        framework: Agent framework to use ('autogen' or 'crewai')
        workflow_name: Name of the workflow to run
        
    Returns:
        True if successful, False otherwise
    """
    try:
        if framework == 'autogen':
            from autogen_implementation.main_autogen import run_autogen
            logger.info(f"Running workflow {workflow_name} using AutoGen framework")
            return run_autogen(config, workflow_name)
            
        elif framework == 'crewai':
            from crewai_implementation.main_crewai import run_crewai
            logger.info(f"Running workflow {workflow_name} using CrewAI framework")
            return run_crewai(config, workflow_name)
            
        else:
            logger.error(f"Unsupported framework: {framework}")
            return False
            
    except Exception as e:
        logger.error(f"Error running workflow: {e}")
        return False

def main():
    """Main entry point for the Customer 360 application."""
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description="Customer 360 Data Product with Agentic Solution")
    parser.add_argument("--config", help="Path to the configuration file", default="data/config.yaml")
    parser.add_argument("--framework", choices=["autogen", "crewai"], 
                        help="Agent framework to use", default="autogen")
    parser.add_argument("--workflow", help="Name of the workflow to run", default="default")
    parser.add_argument("--init-db", action="store_true", help="Initialize the database")
    
    args = parser.parse_args()
    
    # Load configuration
    config = load_config(args.config)
    if not config:
        logger.error("Failed to load configuration")
        return 1
        
    # Initialize the database if requested
    if args.init_db:
        if not initialize_database(config):
            logger.error("Database initialization failed")
            return 1
    
    # Run the specified workflow
    if run_workflow(config, args.framework, args.workflow):
        logger.info(f"Workflow {args.workflow} completed successfully")
        return 0
    else:
        logger.error(f"Workflow {args.workflow} failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())