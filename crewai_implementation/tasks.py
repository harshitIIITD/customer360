"""
CrewAI Tasks for Customer 360

This module defines the tasks that CrewAI agents will perform in the
Customer 360 agentic solution.
"""

import os
import sys
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List, Callable
from crewai import Task

# Add project root to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from tools import scan_source, extract_attributes, validate_mapping, validate_all_mappings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_source_discovery_task(agents):
    """
    Create a task to discover and document data sources.
    
    Args:
        agents: Dictionary of CrewAI agent instances
        
    Returns:
        CrewAI Task instance
    """
    return Task(
        description="""
        Identify all available data source systems that should be included in the Customer 360 data product.
        For each source system, document its:
        1. Name and description
        2. Type of customer data it contains
        3. Key attributes that are valuable for the Customer 360 view
        4. Any known data quality issues
        
        You should scan each source system to understand its schema and available attributes.
        Document your findings comprehensively.
        """,
        agent=agents["data_steward"],
        expected_output="""
        A comprehensive list of all identified source systems with their details,
        including name, description, data types, and key attributes.
        Each source should be properly documented in the system.
        """,
        tools=[scan_source],
        context=[
            "This is the first step in building the Customer 360 data product.",
            "A complete understanding of all source systems is essential for proper mapping."
        ]
    )

def create_attribute_mapping_task(agents):
    """
    Create a task to map source attributes to target attributes.
    
    Args:
        agents: Dictionary of CrewAI agent instances
        
    Returns:
        CrewAI Task instance
    """
    return Task(
        description="""
        For each data source identified in the previous step:
        1. Extract all available attributes from each source system
        2. Analyze each attribute to determine its appropriateness for the Customer 360 view
        3. Suggest mappings from source attributes to target Customer 360 attributes
        4. Document transformation rules needed for each mapping
        
        Work with the Domain Expert to ensure mappings align with business requirements.
        """,
        agent=agents["mapping"],
        expected_output="""
        A comprehensive set of source-to-target attribute mappings for all relevant source systems.
        Each mapping should include:
        - Source system and attribute
        - Target Customer 360 attribute
        - Transformation logic (if needed)
        - Data quality considerations
        """,
        tools=[extract_attributes],
        context=[
            "These mappings will form the foundation of the Customer 360 data integration.",
            "Consider both technical feasibility and business value when suggesting mappings."
        ]
    )

def create_mapping_validation_task(agents):
    """
    Create a task to validate the suggested mappings.
    
    Args:
        agents: Dictionary of CrewAI agent instances
        
    Returns:
        CrewAI Task instance
    """
    return Task(
        description="""
        Review and validate all suggested source-to-target attribute mappings:
        1. Check each mapping for technical correctness
        2. Validate transformations with sample data
        3. Identify and resolve any conflicts or inconsistencies
        4. Ensure all required target attributes have valid source mappings
        
        Document any issues found and how they were resolved.
        """,
        agent=agents["mapping"],
        expected_output="""
        A validation report for all mappings indicating:
        - Total number of mappings validated
        - Number of mappings that passed validation
        - Number of mappings that failed validation with reasons
        - Recommendations for addressing any mapping issues
        """,
        tools=[validate_mapping, validate_all_mappings],
        context=[
            "Proper validation ensures data quality in the final Customer 360 view.",
            "Consider both technical correctness and business value in your validation."
        ]
    )

def create_etl_generation_task(agents):
    """
    Create a task to generate ETL code based on validated mappings.
    
    Args:
        agents: Dictionary of CrewAI agent instances
        
    Returns:
        CrewAI Task instance
    """
    return Task(
        description="""
        Generate ETL (Extract, Transform, Load) code for each validated mapping:
        1. Create extraction logic for each source system
        2. Implement transformation logic based on mapping rules
        3. Develop loading logic to populate the Customer 360 target
        4. Include error handling and logging
        
        The code should be efficient, maintainable, and follow best practices.
        """,
        agent=agents["data_engineer"],
        expected_output="""
        Complete ETL code implementation for all source systems, including:
        - Extraction scripts for each source
        - Transformation logic implementing all mappings
        - Loading code for the Customer 360 target
        - Documentation of the ETL process
        - Error handling and logging implementation
        """,
        tools=[],
        context=[
            "The ETL code will be used in production to populate the Customer 360 data product.",
            "Consider performance, maintainability, and error handling in your design."
        ]
    )

def create_certification_task(agents):
    """
    Create a task to certify the Customer 360 data product.
    
    Args:
        agents: Dictionary of CrewAI agent instances
        
    Returns:
        CrewAI Task instance
    """
    return Task(
        description="""
        Perform certification of the Customer 360 data product:
        1. Review all source systems, mappings, and ETL code
        2. Verify that all business requirements are satisfied
        3. Ensure data quality standards are met
        4. Check compliance with relevant regulations (GDPR, CCPA, etc.)
        5. Create formal certification documentation
        
        Work with the Domain Expert to validate business value.
        """,
        agent=agents["certification"],
        expected_output="""
        A comprehensive certification report including:
        - Overall certification status (approved, conditionally approved, or rejected)
        - Compliance assessment results
        - Data quality metrics
        - Business value assessment
        - Any conditions or recommendations for improvement
        - Formal certification documentation
        """,
        tools=[],
        context=[
            "Certification is the final step before the Customer 360 data product goes into production.",
            "The certification should consider technical quality, business value, and compliance aspects."
        ]
    )

def create_tasks_for_workflow(agents, workflow_config):
    """
    Create tasks for a specific workflow configuration.
    
    Args:
        agents: Dictionary of CrewAI agent instances
        workflow_config: Workflow configuration from config.yaml
        
    Returns:
        List of CrewAI Task instances
    """
    task_map = {
        "source_discovery": create_source_discovery_task,
        "attribute_mapping": create_attribute_mapping_task,
        "mapping_validation": create_mapping_validation_task,
        "etl_generation": create_etl_generation_task,
        "certification": create_certification_task
    }
    
    tasks = []
    
    # Create tasks for each step in the workflow
    for step in workflow_config.get('steps', []):
        step_name = step.get('name')
        
        if step_name in task_map:
            task_creator = task_map[step_name]
            task = task_creator(agents)
            tasks.append(task)
            logger.info(f"Created task for workflow step: {step_name}")
        else:
            logger.warning(f"No task creator found for step: {step_name}")
    
    logger.info(f"Created {len(tasks)} tasks for workflow: {workflow_config.get('name')}")
    return tasks