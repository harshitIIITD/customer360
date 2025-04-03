"""
AutoGen Workflows for Customer 360

This module defines the workflow implementation using AutoGen GroupChat.
"""

import os
import sys
import logging
import autogen
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add project root to path for imports
sys.path.append(str(Path(__file__).parent.parent))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_customer360_groupchat(agents, config):
    """
    Create a group chat with all the Customer 360 agents.
    
    Args:
        agents: Dictionary of agent instances
        config: Application configuration
        
    Returns:
        AutoGen GroupChat instance
    """
    try:
        # Extract agent instances
        data_steward = agents["data_steward"]
        domain_expert = agents["domain_expert"]
        data_engineer = agents["data_engineer"] 
        mapping_agent = agents["mapping"]
        certification_agent = agents["certification"]
        user_proxy = agents["user_proxy"]
        
        # Create the group chat
        groupchat = autogen.GroupChat(
            agents=[
                user_proxy,
                data_steward, 
                domain_expert,
                data_engineer,
                mapping_agent,
                certification_agent
            ],
            messages=[],
            max_round=config.get("autogen", {}).get("max_round", 10)
        )
        
        # Create the group chat manager
        manager = autogen.GroupChatManager(
            groupchat=groupchat,
            llm_config={"config_list": []}  # Empty config list since agents have their own configs
        )
        
        return {
            "chat": groupchat,
            "manager": manager,
            "user_proxy": user_proxy
        }
        
    except Exception as e:
        logger.error(f"Error creating group chat: {e}")
        raise

def generate_task_prompt(workflow_config):
    """
    Generate a prompt for the workflow task.
    
    Args:
        workflow_config: Configuration for the workflow
        
    Returns:
        Task prompt string
    """
    # Start with the basic description
    prompt = f"# {workflow_config['name'].upper()} TASK\n\n"
    prompt += f"{workflow_config.get('description', 'Customer 360 data product workflow')}\n\n"
    
    # Add steps
    prompt += "## Steps to Execute:\n\n"
    
    for i, step in enumerate(workflow_config.get('steps', []), 1):
        prompt += f"{i}. {step.get('name', 'Unnamed step')} - "
        agent = step.get('agent', 'unknown')
        action = step.get('action', 'unknown')
        
        # Map agent and action to descriptive text
        if agent == "data_steward":
            if action == "identify_sources":
                prompt += "Identify all available data sources for the Customer 360 view\n"
            elif action == "validate_source":
                prompt += "Validate a data source system's metadata\n"
            elif action == "document_source":
                prompt += "Document a new data source or update an existing one\n"
        elif agent == "domain_expert":
            if action == "define_requirements":
                prompt += "Define business requirements for the Customer 360 data product\n"
            elif action == "validate_attribute":
                prompt += "Validate customer attributes from a business perspective\n"
            elif action == "suggest_improvements":
                prompt += "Suggest improvements to the Customer 360 data product\n"
        elif agent == "data_engineer":
            if action == "generate_etl_code":
                prompt += "Generate ETL code for a data source based on mappings\n"
            elif action == "validate_transformation":
                prompt += "Validate transformation logic for data quality\n"
            elif action == "execute_etl":
                prompt += "Execute ETL process to load data into Customer 360\n"
        elif agent == "mapping":
            if action == "suggest_mappings":
                prompt += "Suggest mappings from source attributes to target attributes\n"
            elif action == "validate_mapping":
                prompt += "Validate proposed mappings for data quality\n"
            elif action == "store_mapping":
                prompt += "Store approved mappings in the database\n"
        elif agent == "certification":
            if action == "create_certification":
                prompt += "Create a new certification request for the data product\n"
            elif action == "check_status":
                prompt += "Check the status of a certification\n"
            elif action == "generate_report":
                prompt += "Generate a certification status report\n"
        else:
            prompt += f"Perform {action} operation\n"
    
    # Add final instructions
    prompt += "\nWork collaboratively to complete these steps. Each agent should use their specialized functions when appropriate."
    prompt += "\nAt the end, provide a summary of what was accomplished."
    prompt += "\nReply with 'TASK COMPLETED' when all steps are finished."
    
    return prompt

def run_customer360_task(groupchat, workflow_config):
    """
    Run a Customer 360 task using the group chat.
    
    Args:
        groupchat: The group chat information
        workflow_config: Configuration for the workflow
        
    Returns:
        True if the task was completed successfully, False otherwise
    """
    try:
        # Generate the task prompt
        task_prompt = generate_task_prompt(workflow_config)
        
        # Get the components
        manager = groupchat["manager"]
        user_proxy = groupchat["user_proxy"]
        
        # Initiate the chat with the task
        user_proxy.initiate_chat(
            manager,
            message=task_prompt
        )
        
        # Check the last message to see if the task was completed
        chat_history = groupchat["chat"].messages
        if chat_history and "TASK COMPLETED" in chat_history[-1].get("content", ""):
            return True
        else:
            logger.warning("Task did not complete successfully - no completion message found")
            return False
            
    except Exception as e:
        logger.error(f"Error running Customer 360 task: {e}")
        return False