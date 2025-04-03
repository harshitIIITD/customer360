#!/usr/bin/env python3
"""
Customer 360 Agentic Solution

This is the main entry point for the Customer 360 data product solution
that uses multiple specialized agents to create a unified customer view 
for retail banking.
"""

import os
import sys
import argparse
import logging
import yaml
from pathlib import Path
import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("Customer360")

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import from our modules
from database.setup_db import create_database
from agents import DataStewardAgent, DomainExpertAgent, DataEngineerAgent, MappingAgent, CertificationAgent
from tools import scan_source, extract_attributes, validate_mapping, validate_all_mappings

def load_config():
    """Load the configuration from the YAML file."""
    config_path = Path(__file__).parent / "data" / "config.yaml"
    try:
        with open(config_path, 'r') as config_file:
            config = yaml.safe_load(config_file)
            logger.info("Configuration loaded successfully")
            return config
    except Exception as e:
        logger.error(f"Error loading configuration: {e}")
        return {}

def create_agents(config):
    """Create agent instances based on configuration."""
    agents = {}
    agent_classes = {
        "data_steward": DataStewardAgent,
        "domain_expert": DomainExpertAgent,
        "data_engineer": DataEngineerAgent,
        "mapping": MappingAgent,
        "certification": CertificationAgent
    }
    
    if not config or 'agents' not in config:
        logger.warning("No agent configuration found, using defaults")
        # Create default agents if no config
        for agent_name, agent_class in agent_classes.items():
            agents[agent_name] = agent_class()
        return agents
    
    # Create agents from configuration
    for agent_name, agent_class in agent_classes.items():
        if agent_name in config['agents'] and config['agents'][agent_name].get('enabled', True):
            model_name = config['agents'][agent_name].get('model_name', "llama3")
            agents[agent_name] = agent_class(model_name=model_name)
            logger.info(f"Created {agent_name} agent with model {model_name}")
        else:
            logger.info(f"Agent {agent_name} is disabled in configuration")
    
    return agents

def run_workflow(workflow_name, agents, config):
    """Run a specific workflow from the configuration."""
    if 'workflows' not in config or workflow_name not in config['workflows']:
        logger.error(f"Workflow {workflow_name} not found in configuration")
        return False
    
    workflow = config['workflows'][workflow_name]
    logger.info(f"Starting workflow: {workflow['name']} - {workflow['description']}")
    
    # Store workflow state
    workflow_state = {"success": True, "results": {}}
    
    # Execute each step in the workflow
    for step in workflow.get('steps', []):
        step_name = step.get('name', 'unnamed_step')
        agent_name = step.get('agent')
        action = step.get('action')
        
        logger.info(f"Executing workflow step: {step_name} with agent {agent_name}, action {action}")
        
        if agent_name not in agents:
            logger.error(f"Agent {agent_name} not found for step {step_name}")
            workflow_state["success"] = False
            continue
            
        # Prepare inputs based on previous results and any step-specific inputs
        inputs = step.get('inputs', {}).copy()
        inputs['action'] = action
        
        # Add results from previous steps if referenced
        for input_name, input_value in list(inputs.items()):
            if isinstance(input_value, str) and input_value.startswith("$result."):
                # Parse reference to previous result: $result.step_name.result_key
                parts = input_value.split(".")
                if len(parts) >= 3:
                    prev_step = parts[1]
                    result_key = ".".join(parts[2:])
                    if prev_step in workflow_state["results"]:
                        prev_result = workflow_state["results"][prev_step]
                        if result_key in prev_result:
                            inputs[input_name] = prev_result[result_key]
        
        # Run the agent
        agent = agents[agent_name]
        result = agent.run(inputs)
        
        # Store the result for potential use by later steps
        workflow_state["results"][step_name] = result
        
        if not result.get('success', False):
            logger.error(f"Step {step_name} failed: {result.get('error', 'Unknown error')}")
            workflow_state["success"] = False
    
    logger.info(f"Workflow {workflow_name} completed with status: {'SUCCESS' if workflow_state['success'] else 'FAILURE'}")
    return workflow_state

def setup_environment():
    """Set up the environment for the application."""
    # Set the current date for agent prompts
    os.environ["CURRENT_DATE"] = datetime.datetime.now().strftime("%Y-%m-%d")
    
    # Ensure the database exists
    db_created = create_database()
    if not db_created:
        logger.error("Failed to create or verify database")
        return False
    
    return True

def main():
    """Main entry point for the application."""
    parser = argparse.ArgumentParser(description="Customer 360 Agentic Solution")
    parser.add_argument(
        "--workflow", "-w",
        default="default",
        help="Name of the workflow to run (default: 'default')"
    )
    parser.add_argument(
        "--implementation", "-i",
        choices=["native", "autogen", "crewai"],
        default="native",
        help="Implementation to use (default: 'native')"
    )
    args = parser.parse_args()
    
    # Setup environment
    if not setup_environment():
        return 1
    
    # Load configuration
    config = load_config()
    if not config:
        logger.error("Failed to load configuration")
        return 1
    
    if args.implementation == "native":
        # Create agents
        agents = create_agents(config)
        if not agents:
            logger.error("Failed to create agents")
            return 1
        
        # Run the specified workflow
        result = run_workflow(args.workflow, agents, config)
        if not result["success"]:
            logger.error("Workflow execution failed")
            return 1
    
    elif args.implementation == "autogen":
        # Use the AutoGen implementation
        logger.info("Using AutoGen implementation")
        from autogen_implementation.main_autogen import run_autogen
        result = run_autogen(config, args.workflow)
        if not result:
            logger.error("AutoGen implementation failed")
            return 1
    
    elif args.implementation == "crewai":
        # Use the CrewAI implementation
        logger.info("Using CrewAI implementation")
        from crewai_implementation.main_crewai import run_crewai
        result = run_crewai(config, args.workflow)
        if not result:
            logger.error("CrewAI implementation failed")
            return 1
    
    logger.info("Customer 360 application completed successfully")
    return 0

if __name__ == "__main__":
    sys.exit(main())