"""
CrewAI Implementation for Customer 360

This is the main entry point for the CrewAI implementation of the 
Customer 360 agentic solution.
"""

import os
import sys
import logging
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

def run_crewai(config: Dict[str, Any], workflow_name: str = "default") -> bool:
    """
    Run the CrewAI implementation of the Customer 360 solution.
    
    Args:
        config: The application configuration
        workflow_name: Name of the workflow to run
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Get the workflow configuration
        if 'workflows' not in config or workflow_name not in config['workflows']:
            logger.error(f"Workflow {workflow_name} not found in configuration")
            return False
            
        workflow_config = config['workflows'][workflow_name]
        
        # Create the agents
        from .agents import create_crew_agents
        logger.info("Creating CrewAI agents for Customer 360...")
        agents = create_crew_agents(config)
        
        # Create the tasks based on the workflow configuration
        from .tasks import create_tasks_for_workflow
        logger.info(f"Creating tasks for workflow: {workflow_name}")
        tasks = create_tasks_for_workflow(agents, workflow_config)
        
        # Create and run the crew
        from .crew import create_customer360_crew, run_customer360_crew
        
        logger.info("Setting up CrewAI crew...")
        crew = create_customer360_crew(agents, tasks, config)
        
        logger.info(f"Executing workflow: {workflow_config['name']}")
        result = run_customer360_crew(crew, workflow_config)
        
        if result.get('success', False):
            logger.info(f"CrewAI workflow {workflow_name} completed successfully")
            return True
        else:
            logger.error(f"CrewAI workflow {workflow_name} failed: {result.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        logger.error(f"Error running CrewAI implementation: {e}")
        return False

if __name__ == "__main__":
    # This is for testing the CrewAI implementation directly
    import yaml
    
    # Load configuration
    config_path = Path(__file__).parent.parent / "data" / "config.yaml"
    with open(config_path, 'r') as config_file:
        config = yaml.safe_load(config_file)
    
    # Run the implementation
    success = run_crewai(config)
    
    sys.exit(0 if success else 1)