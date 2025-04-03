"""
CrewAI Crew Implementation for Customer 360

This module sets up the CrewAI crew for the Customer 360 agentic solution.
"""

import os
import sys
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from crewai import Crew, Process

# Add project root to path for imports
sys.path.append(str(Path(__file__).parent.parent))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_customer360_crew(agents: Dict[str, Any], tasks: List[Any], config: Dict[str, Any]) -> Crew:
    """
    Create a CrewAI crew for the Customer 360 solution.
    
    Args:
        agents: Dictionary of CrewAI agent instances
        tasks: List of CrewAI task instances
        config: Application configuration
        
    Returns:
        CrewAI Crew instance
    """
    try:
        # Extract crew configuration
        crewai_config = config.get('crewai', {})
        verbose = crewai_config.get('verbose', True)
        memory = crewai_config.get('memory_enabled', True)
        
        # Determine the process to use
        process_type = Process.sequential
        
        # Create the crew
        crew = Crew(
            agents=list(agents.values()),
            tasks=tasks,
            verbose=verbose,
            process=process_type,
            memory=memory
        )
        
        logger.info(f"Created Customer360 crew with {len(agents)} agents and {len(tasks)} tasks")
        
        return crew
    except Exception as e:
        logger.error(f"Error creating Customer360 crew: {e}")
        raise

def run_customer360_crew(crew: Crew, workflow_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run the Customer360 crew on the specified workflow.
    
    Args:
        crew: The CrewAI crew to run
        workflow_config: Workflow configuration from config.yaml
        
    Returns:
        Dictionary with workflow results
    """
    try:
        logger.info(f"Running Customer360 crew for workflow: {workflow_config.get('name')}")
        
        # Record start time
        import time
        start_time = time.time()
        
        # Run the crew
        result = crew.kickoff()
        
        # Record end time
        end_time = time.time()
        
        # Format the result
        workflow_result = {
            "success": True,
            "workflow_name": workflow_config.get('name'),
            "description": workflow_config.get('description'),
            "execution_time": end_time - start_time,
            "result": str(result),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        logger.info(f"Customer360 crew execution completed in {workflow_result['execution_time']:.2f} seconds")
        
        return workflow_result
    except Exception as e:
        logger.error(f"Error running Customer360 crew: {e}")
        
        return {
            "success": False,
            "workflow_name": workflow_config.get('name'),
            "error": str(e)
        }