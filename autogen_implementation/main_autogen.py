"""
AutoGen Implementation for Customer 360

This is the main entry point for the AutoGen implementation of the
Customer 360 agentic solution.
"""

import os
import sys
import logging
import autogen
from pathlib import Path
from typing import Dict, Any, Optional

# Add project root to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from database.setup_db import get_db_connection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_autogen(config: Dict[str, Any], workflow_name: str = "default") -> bool:
    """
    Run the AutoGen implementation of the Customer 360 solution.
    
    Args:
        config: The application configuration
        workflow_name: Name of the workflow to run
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Initialize agents
        from .agents import initialize_agents, get_user_proxy
        
        logger.info("Initializing AutoGen agents for Customer 360...")
        agents = initialize_agents(config)
        
        # Get the workflow configuration
        if 'workflows' not in config or workflow_name not in config['workflows']:
            logger.error(f"Workflow {workflow_name} not found in configuration")
            return False
            
        workflow_config = config['workflows'][workflow_name]
        
        # Set up the group chat
        from .workflows import create_customer360_groupchat, run_customer360_task
        
        logger.info(f"Setting up group chat for workflow: {workflow_name}")
        groupchat = create_customer360_groupchat(agents, config)
        
        # Execute the workflow
        logger.info(f"Executing workflow: {workflow_config['name']}")
        success = run_customer360_task(groupchat, workflow_config)
        
        if success:
            logger.info(f"AutoGen workflow {workflow_name} completed successfully")
        else:
            logger.error(f"AutoGen workflow {workflow_name} failed")
            
        return success
        
    except Exception as e:
        logger.error(f"Error running AutoGen implementation: {e}")
        return False

if __name__ == "__main__":
    # This is for testing the AutoGen implementation directly
    import yaml
    
    # Load configuration
    config_path = Path(__file__).parent.parent / "data" / "config.yaml"
    with open(config_path, 'r') as config_file:
        config = yaml.safe_load(config_file)
    
    # Run the implementation
    success = run_autogen(config)
    
    sys.exit(0 if success else 1)