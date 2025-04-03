"""
AutoGen Agent Implementation for Customer 360

This module defines AutoGen agents for the Customer 360 data product solution.
"""

import os
import sys
import logging
from pathlib import Path
import autogen
from typing import List, Dict, Any, Optional

# Add project root to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from database.setup_db import get_db_connection
from tools import scan_source, extract_attributes, validate_mapping

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_data_steward_agent(config_list):
    """Create the Data Steward AutoGen agent."""
    return autogen.AssistantAgent(
        name="DataSteward",
        system_message="""You are the Data Steward Agent responsible for identifying, 
        validating, and documenting data source information for a Customer 360 data product.
        
        Your tasks include:
        1. Identifying all available data sources
        2. Validating source system metadata
        3. Documenting new data sources or updating existing ones
        
        Use the available functions to work with data source information.
        Provide clear, concise responses focused on data sources and their attributes.
        """,
        llm_config={
            "config_list": config_list,
            "functions": [
                {
                    "name": "identify_sources",
                    "description": "Identify all available data sources from the database",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                },
                {
                    "name": "validate_source",
                    "description": "Validate a data source system",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "source_details": {
                                "type": "object",
                                "description": "Dict with source system details"
                            },
                            "source_id": {
                                "type": "integer",
                                "description": "ID of the source system"
                            }
                        },
                        "required": ["source_details", "source_id"]
                    }
                },
                {
                    "name": "document_source",
                    "description": "Document a new data source or update an existing one",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "source_details": {
                                "type": "object",
                                "description": "Dict with source system details"
                            }
                        },
                        "required": ["source_details"]
                    }
                },
                {
                    "name": "scan_source",
                    "description": "Scan a source system and extract its schema",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "source_id": {
                                "type": "integer",
                                "description": "ID of the source system to scan"
                            }
                        },
                        "required": ["source_id"]
                    }
                }
            ]
        }
    )
    
def create_domain_expert_agent(config_list):
    """Create the Domain Expert AutoGen agent."""
    return autogen.AssistantAgent(
        name="DomainExpert",
        system_message="""You are the Domain Expert Agent responsible for providing business context 
        and requirements for retail banking data in a Customer 360 data product.
        
        Your tasks include:
        1. Defining business requirements for customer data
        2. Validating data attributes from a business perspective
        3. Suggesting improvements to the data product based on banking industry best practices
        
        Use the available functions to provide banking domain expertise.
        Make sure all recommendations align with standard banking practices and regulations.
        """,
        llm_config={
            "config_list": config_list,
            "functions": [
                {
                    "name": "define_requirements",
                    "description": "Define business requirements for the Customer 360 data product",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                },
                {
                    "name": "validate_attribute",
                    "description": "Validate a customer attribute from a business perspective",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "attribute_details": {
                                "type": "object",
                                "description": "Dict with attribute details"
                            },
                            "attribute_id": {
                                "type": "integer",
                                "description": "ID of the attribute"
                            }
                        },
                        "required": ["attribute_details", "attribute_id"]
                    }
                },
                {
                    "name": "suggest_improvements",
                    "description": "Suggest improvements to the Customer 360 data product",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "data_product_details": {
                                "type": "object",
                                "description": "Dict with current data product details"
                            }
                        },
                        "required": ["data_product_details"]
                    }
                }
            ]
        }
    )
    
def create_data_engineer_agent(config_list):
    """Create the Data Engineer AutoGen agent."""
    return autogen.AssistantAgent(
        name="DataEngineer",
        system_message="""You are the Data Engineer Agent responsible for implementing data extraction, 
        transformation, and loading (ETL) processes for a Customer 360 data product.
        
        Your tasks include:
        1. Generating ETL code for data sources based on mappings
        2. Validating transformation logic 
        3. Executing ETL processes to load data into the Customer 360 view
        
        Use the available functions to work with data transformations.
        Write clear and efficient code for ETL processes.
        """,
        llm_config={
            "config_list": config_list,
            "functions": [
                {
                    "name": "generate_etl_code",
                    "description": "Generate ETL code for a data source based on mappings",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "source_id": {
                                "type": "integer",
                                "description": "ID of the source system"
                            },
                            "mapping_details": {
                                "type": "object",
                                "description": "Dict with mapping details"
                            }
                        },
                        "required": ["source_id"]
                    }
                },
                {
                    "name": "validate_transformation",
                    "description": "Validate a transformation code snippet",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "transformation_code": {
                                "type": "string",
                                "description": "Code for the transformation"
                            }
                        },
                        "required": ["transformation_code"]
                    }
                },
                {
                    "name": "execute_etl",
                    "description": "Execute ETL process for a data source",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "source_id": {
                                "type": "integer",
                                "description": "ID of the source system"
                            },
                            "mapping_details": {
                                "type": "object",
                                "description": "Dict with mapping details"
                            }
                        },
                        "required": ["source_id"]
                    }
                }
            ]
        }
    )
    
def create_mapping_agent(config_list):
    """Create the Mapping AutoGen agent."""
    return autogen.AssistantAgent(
        name="MappingAgent",
        system_message="""You are the Mapping Agent responsible for automating the creation of 
        source-to-target attribute mapping for a Customer 360 data product.
        
        Your tasks include:
        1. Suggesting mappings from source attributes to target attributes
        2. Validating proposed mappings
        3. Storing approved mappings in the database
        
        Use the available functions to create and validate data mappings.
        Ensure mappings are accurate and follow data integration best practices.
        """,
        llm_config={
            "config_list": config_list,
            "functions": [
                {
                    "name": "suggest_mappings",
                    "description": "Suggest mappings from source attributes to target attributes",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "source_id": {
                                "type": "integer",
                                "description": "ID of the source system"
                            },
                            "source_attributes": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "List of source attributes for mapping suggestions"
                            }
                        },
                        "required": ["source_id", "source_attributes"]
                    }
                },
                {
                    "name": "validate_mapping",
                    "description": "Validate a proposed mapping",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "mapping_details": {
                                "type": "object",
                                "description": "Dict with mapping details"
                            }
                        },
                        "required": ["mapping_details"]
                    }
                },
                {
                    "name": "store_mapping",
                    "description": "Store a mapping in the database",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "mapping_details": {
                                "type": "object",
                                "description": "Dict with mapping details"
                            }
                        },
                        "required": ["mapping_details"]
                    }
                },
                {
                    "name": "extract_attributes",
                    "description": "Extract all attributes from a source system",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "source_id": {
                                "type": "integer",
                                "description": "ID of the source system"
                            }
                        },
                        "required": ["source_id"]
                    }
                }
            ]
        }
    )
    
def create_certification_agent(config_list):
    """Create the Certification AutoGen agent."""
    return autogen.AssistantAgent(
        name="CertificationAgent",
        system_message="""You are the Certification Agent responsible for facilitating and
        documenting the data product certification process for a Customer 360 data product.
        
        Your tasks include:
        1. Creating certification requests
        2. Checking certification status
        3. Generating certification reports
        
        Use the available functions to manage the certification process.
        Ensure proper documentation of all certification activities.
        """,
        llm_config={
            "config_list": config_list,
            "functions": [
                {
                    "name": "create_certification",
                    "description": "Create a new certification request",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "certification_type": {
                                "type": "string",
                                "description": "Type of certification (data_quality, compliance, business_value)"
                            },
                            "cert_data": {
                                "type": "object",
                                "description": "Dict with certification data"
                            }
                        },
                        "required": ["certification_type"]
                    }
                },
                {
                    "name": "check_status",
                    "description": "Check the status of a certification",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "certification_id": {
                                "type": "integer",
                                "description": "ID of the certification"
                            }
                        },
                        "required": ["certification_id"]
                    }
                },
                {
                    "name": "generate_report",
                    "description": "Generate a certification status report",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            ]
        }
    )
    
def create_user_proxy(config_list):
    """Create the user proxy agent that will interface with the other agents."""
    return autogen.UserProxyAgent(
        name="UserProxy",
        is_termination_msg=lambda x: x.get("content", "") and "TASK COMPLETED" in x.get("content", ""),
        human_input_mode="NEVER",
        function_map={
            # Data Steward functions
            "identify_sources": lambda: get_data_steward_agent().run({"action": "identify_sources"}),
            "validate_source": lambda source_details, source_id: get_data_steward_agent().run({
                "action": "validate_source", 
                "source_details": source_details,
                "source_id": source_id
            }),
            "document_source": lambda source_details: get_data_steward_agent().run({
                "action": "document_source",
                "source_details": source_details
            }),
            "scan_source": scan_source,
            
            # Domain Expert functions  
            "define_requirements": lambda: get_domain_expert_agent().run({"action": "define_requirements"}),
            "validate_attribute": lambda attribute_details, attribute_id: get_domain_expert_agent().run({
                "action": "validate_attribute",
                "attribute_details": attribute_details,
                "attribute_id": attribute_id
            }),
            "suggest_improvements": lambda data_product_details: get_domain_expert_agent().run({
                "action": "suggest_improvements",
                "data_product_details": data_product_details
            }),
            
            # Data Engineer functions
            "generate_etl_code": lambda source_id, mapping_details=None: get_data_engineer_agent().run({
                "action": "generate_etl_code",
                "source_id": source_id,
                "mapping_details": mapping_details or {}
            }),
            "validate_transformation": lambda transformation_code: get_data_engineer_agent().run({
                "action": "validate_transformation",
                "transformation_code": transformation_code
            }),
            "execute_etl": lambda source_id, mapping_details=None: get_data_engineer_agent().run({
                "action": "execute_etl",
                "source_id": source_id,
                "mapping_details": mapping_details or {}
            }),
            
            # Mapping functions
            "suggest_mappings": lambda source_id, source_attributes: get_mapping_agent().run({
                "action": "suggest_mappings",
                "source_id": source_id,
                "source_attributes": source_attributes
            }),
            "validate_mapping": validate_mapping,
            "store_mapping": lambda mapping_details: get_mapping_agent().run({
                "action": "store_mapping",
                "mapping_details": mapping_details
            }),
            "extract_attributes": extract_attributes,
            
            # Certification functions
            "create_certification": lambda certification_type, cert_data=None: get_certification_agent().run({
                "action": "create_certification",
                "certification_type": certification_type,
                "cert_data": cert_data or {}
            }),
            "check_status": lambda certification_id: get_certification_agent().run({
                "action": "check_status",
                "certification_id": certification_id
            }),
            "generate_report": lambda: get_certification_agent().run({"action": "generate_report"})
        }
    )

# Global agent instances
_data_steward_agent = None
_domain_expert_agent = None
_data_engineer_agent = None
_mapping_agent = None
_certification_agent = None
_user_proxy = None
_config_list = []

def initialize_agents(config):
    """Initialize all agents with the given configuration."""
    global _data_steward_agent, _domain_expert_agent, _data_engineer_agent, _mapping_agent, _certification_agent, _user_proxy, _config_list
    
    from .config_list import get_config_list
    
    # Get LLM configuration
    provider = config.get('llm', {}).get('provider', 'ollama')
    _config_list = get_config_list(provider)
    
    # Create the agents
    _data_steward_agent = create_data_steward_agent(_config_list)
    _domain_expert_agent = create_domain_expert_agent(_config_list)
    _data_engineer_agent = create_data_engineer_agent(_config_list)
    _mapping_agent = create_mapping_agent(_config_list)
    _certification_agent = create_certification_agent(_config_list)
    _user_proxy = create_user_proxy(_config_list)
    
    return {
        "data_steward": _data_steward_agent,
        "domain_expert": _domain_expert_agent,
        "data_engineer": _data_engineer_agent,
        "mapping": _mapping_agent,
        "certification": _certification_agent,
        "user_proxy": _user_proxy
    }

# Getter functions for agents
def get_data_steward_agent():
    """Get the Data Steward agent instance."""
    global _data_steward_agent
    if _data_steward_agent is None:
        raise ValueError("Agents not initialized. Call initialize_agents() first.")
    return _data_steward_agent

def get_domain_expert_agent():
    """Get the Domain Expert agent instance."""
    global _domain_expert_agent
    if _domain_expert_agent is None:
        raise ValueError("Agents not initialized. Call initialize_agents() first.")
    return _domain_expert_agent

def get_data_engineer_agent():
    """Get the Data Engineer agent instance."""
    global _data_engineer_agent
    if _data_engineer_agent is None:
        raise ValueError("Agents not initialized. Call initialize_agents() first.")
    return _data_engineer_agent

def get_mapping_agent():
    """Get the Mapping agent instance."""
    global _mapping_agent
    if _mapping_agent is None:
        raise ValueError("Agents not initialized. Call initialize_agents() first.")
    return _mapping_agent

def get_certification_agent():
    """Get the Certification agent instance."""
    global _certification_agent
    if _certification_agent is None:
        raise ValueError("Agents not initialized. Call initialize_agents() first.")
    return _certification_agent

def get_user_proxy():
    """Get the User Proxy agent instance."""
    global _user_proxy
    if _user_proxy is None:
        raise ValueError("Agents not initialized. Call initialize_agents() first.")
    return _user_proxy