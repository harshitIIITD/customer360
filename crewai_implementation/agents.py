"""
CrewAI Agent Implementation for Customer 360

This module defines CrewAI agents for the Customer 360 data product solution.
"""

import os
import sys
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from crewai import Agent

# Add project root to path for imports
sys.path.append(str(Path(__file__).parent.parent))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_data_steward_agent(config: Dict[str, Any]) -> Agent:
    """
    Create a Data Steward Agent using CrewAI.
    
    Args:
        config: Application configuration
        
    Returns:
        CrewAI Agent instance
    """
    llm_config = config.get('llm', {})
    agent_config = config.get('agents', {}).get('data_steward', {})
    
    return Agent(
        role="Data Steward",
        goal="Accurately identify, validate, and document all data sources for the Customer 360 data product",
        backstory="""You are an expert Data Steward responsible for managing metadata about all 
        banking data sources. You ensure that source system information is accurate, 
        up-to-date, and properly documented. You have deep knowledge of data management 
        best practices and understand how to catalog and govern data assets.""",
        verbose=True,
        allow_delegation=True,
        tools=[],  # Tools are handled separately in our implementation
        llm_config={
            "provider": llm_config.get('provider', 'ollama'),
            "model": llm_config.get('model_name', 'llama3'),
            "temperature": llm_config.get('temperature', 0.2),
            "max_tokens": llm_config.get('max_tokens', 2000)
        }
    )

def create_domain_expert_agent(config: Dict[str, Any]) -> Agent:
    """
    Create a Domain Expert Agent using CrewAI.
    
    Args:
        config: Application configuration
        
    Returns:
        CrewAI Agent instance
    """
    llm_config = config.get('llm', {})
    agent_config = config.get('agents', {}).get('domain_expert', {})
    
    return Agent(
        role="Banking Domain Expert",
        goal="Provide expert banking industry context and requirements for the Customer 360 data product",
        backstory="""You are a seasoned banking industry expert with decades of experience in 
        retail banking operations, customer relationship management, and regulatory compliance. 
        You understand what data is most valuable for creating a complete view of banking customers 
        and how this data should be used to improve customer experience and drive business value.""",
        verbose=True,
        allow_delegation=True,
        tools=[],  # Tools are handled separately in our implementation
        llm_config={
            "provider": llm_config.get('provider', 'ollama'),
            "model": llm_config.get('model_name', 'llama3'),
            "temperature": llm_config.get('temperature', 0.2),
            "max_tokens": llm_config.get('max_tokens', 2000)
        }
    )

def create_data_engineer_agent(config: Dict[str, Any]) -> Agent:
    """
    Create a Data Engineer Agent using CrewAI.
    
    Args:
        config: Application configuration
        
    Returns:
        CrewAI Agent instance
    """
    llm_config = config.get('llm', {})
    agent_config = config.get('agents', {}).get('data_engineer', {})
    
    return Agent(
        role="Data Engineer",
        goal="Implement efficient and reliable data extraction, transformation, and loading processes for the Customer 360 data product",
        backstory="""You are a skilled data engineer with extensive experience in ETL development, 
        database systems, and data integration. You excel at writing clean, efficient code that can 
        handle large volumes of banking data while maintaining data quality and performance. 
        You're familiar with best practices for data transformation and have a strong focus on 
        building maintainable data pipelines.""",
        verbose=True,
        allow_delegation=True,
        tools=[],  # Tools are handled separately in our implementation
        llm_config={
            "provider": llm_config.get('provider', 'ollama'),
            "model": llm_config.get('model_name', 'llama3'),
            "temperature": llm_config.get('temperature', 0.2),
            "max_tokens": llm_config.get('max_tokens', 2000)
        }
    )

def create_mapping_agent(config: Dict[str, Any]) -> Agent:
    """
    Create a Mapping Agent using CrewAI.
    
    Args:
        config: Application configuration
        
    Returns:
        CrewAI Agent instance
    """
    llm_config = config.get('llm', {})
    agent_config = config.get('agents', {}).get('mapping', {})
    
    return Agent(
        role="Data Mapping Specialist",
        goal="Create accurate and efficient mappings between source data attributes and Customer 360 target attributes",
        backstory="""You are a data integration specialist with deep expertise in data mapping 
        and transformation. You understand the complexities of banking data from multiple systems 
        and how to harmonize these disparate sources into a consistent Customer 360 view. 
        You're meticulous about data quality and ensuring proper data lineage documentation.""",
        verbose=True,
        allow_delegation=True,
        tools=[],  # Tools are handled separately in our implementation
        llm_config={
            "provider": llm_config.get('provider', 'ollama'),
            "model": llm_config.get('model_name', 'llama3'),
            "temperature": llm_config.get('temperature', 0.2),
            "max_tokens": llm_config.get('max_tokens', 2000)
        }
    )

def create_certification_agent(config: Dict[str, Any]) -> Agent:
    """
    Create a Certification Agent using CrewAI.
    
    Args:
        config: Application configuration
        
    Returns:
        CrewAI Agent instance
    """
    llm_config = config.get('llm', {})
    agent_config = config.get('agents', {}).get('certification', {})
    
    return Agent(
        role="Data Product Certifier",
        goal="Ensure the Customer 360 data product meets all quality, compliance, and business value requirements",
        backstory="""You are responsible for the formal certification of data products in the 
        organization. You have a background in data governance, regulatory compliance, and data quality 
        assessment. You understand banking industry regulations and standards, and you ensure 
        that all data products meet internal and external requirements before being approved 
        for production use.""",
        verbose=True,
        allow_delegation=True,
        tools=[],  # Tools are handled separately in our implementation
        llm_config={
            "provider": llm_config.get('provider', 'ollama'),
            "model": llm_config.get('model_name', 'llama3'),
            "temperature": llm_config.get('temperature', 0.2),
            "max_tokens": llm_config.get('max_tokens', 2000)
        }
    )

def create_crew_agents(config: Dict[str, Any]) -> Dict[str, Agent]:
    """
    Create all CrewAI agents for the Customer 360 solution.
    
    Args:
        config: Application configuration
        
    Returns:
        Dictionary of CrewAI Agent instances
    """
    try:
        agents = {
            "data_steward": create_data_steward_agent(config),
            "domain_expert": create_domain_expert_agent(config),
            "data_engineer": create_data_engineer_agent(config),
            "mapping": create_mapping_agent(config),
            "certification": create_certification_agent(config)
        }
        
        logger.info(f"Created {len(agents)} CrewAI agents for Customer 360")
        
        return agents
    except Exception as e:
        logger.error(f"Error creating CrewAI agents: {e}")
        raise