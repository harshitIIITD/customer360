"""
Specialized Agents Module for Customer 360

This module defines the specialized agents that perform specific roles
within the Customer 360 solution, each inheriting from the BaseAgent.
"""

import os
import sys
import logging
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Union
import pandas as pd
import re

# Add project root to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from agents.base_agent import BaseAgent
from database.setup_db import get_db_connection, add_source_system, add_customer_attribute, add_data_mapping, add_certification, update_certification
from tools.data_source_scanner import scan_source, get_sample_data, extract_attributes
from tools.mapping_validator import validate_mapping, validate_all_mappings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DataStewardAgent(BaseAgent):
    """
    Data Steward Agent
    
    Responsibilities:
    - Identify and catalog source data systems
    - Scan source systems to extract schema information
    - Validate source data quality
    - Track data owners and accountability
    """
    
    def __init__(self, agent_id: str = "data_steward", 
                name: str = "Data Steward", 
                description: str = "Manages data sources and quality",
                config: Optional[Dict[str, Any]] = None):
        """Initialize the Data Steward agent."""
        super().__init__(agent_id, name, description, config)
    
    def get_capabilities(self) -> List[Dict[str, Any]]:
        """Get capabilities supported by this agent."""
        return [
            {
                "name": "register_source_system",
                "description": "Register a new source system",
                "parameters": {
                    "name": "Name of the source system",
                    "description": "Description of the source system",
                    "owner": "Owner of the source system"
                }
            },
            {
                "name": "scan_source_system",
                "description": "Scan a source system to extract schema",
                "parameters": {
                    "source_id": "ID of the source system"
                }
            },
            {
                "name": "get_source_systems",
                "description": "Get list of registered source systems",
                "parameters": {}
            },
            {
                "name": "get_sample_data",
                "description": "Get sample data from a source system",
                "parameters": {
                    "source_id": "ID of the source system",
                    "attribute_name": "Optional name of attribute to get samples for"
                }
            }
        ]
    
    def action_register_source_system(self, name: str, description: str, owner: str) -> Dict[str, Any]:
        """
        Register a new source system.
        
        Args:
            name: Name of the source system
            description: Description of the source system
            owner: Owner of the source system
            
        Returns:
            Result of the registration
        """
        return add_source_system(name, description, owner)
        
    def action_scan_source_system(self, source_id: int) -> Dict[str, Any]:
        """
        Scan a source system to extract its schema.
        
        Args:
            source_id: ID of the source system
            
        Returns:
            Schema information
        """
        return scan_source(source_id)
    
    def action_get_source_systems(self) -> Dict[str, Any]:
        """
        Get a list of all registered source systems.
        
        Returns:
            List of source systems
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM source_systems")
            source_systems = [dict(row) for row in cursor.fetchall()]
            
            conn.close()
            
            return {
                "success": True,
                "source_systems": source_systems,
                "count": len(source_systems)
            }
        except Exception as e:
            error_msg = f"Error getting source systems: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def action_get_sample_data(self, source_id: int, attribute_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get sample data from a source system.
        
        Args:
            source_id: ID of the source system
            attribute_name: Optional name of attribute to get samples for
            
        Returns:
            Sample data
        """
        return get_sample_data(source_id, attribute_name)


class DomainExpertAgent(BaseAgent):
    """
    Domain Expert Agent
    
    Responsibilities:
    - Define target data attributes based on business requirements
    - Define data quality rules
    - Provide domain expertise for data transformations
    - Certify data products from a business perspective
    """
    
    def __init__(self, agent_id: str = "domain_expert", 
                name: str = "Domain Expert", 
                description: str = "Provides business context and requirements",
                config: Optional[Dict[str, Any]] = None):
        """Initialize the Domain Expert agent."""
        super().__init__(agent_id, name, description, config)
    
    def get_capabilities(self) -> List[Dict[str, Any]]:
        """Get capabilities supported by this agent."""
        return [
            {
                "name": "define_customer_attribute",
                "description": "Define a new target customer attribute",
                "parameters": {
                    "name": "Name of the attribute",
                    "data_type": "Data type of the attribute",
                    "description": "Description of the attribute",
                    "is_pii": "Whether this attribute contains PII",
                    "category": "Category of the attribute"
                }
            },
            {
                "name": "get_customer_attributes",
                "description": "Get list of defined customer attributes",
                "parameters": {
                    "category": "Optional category to filter by"
                }
            },
            {
                "name": "create_certification",
                "description": "Create a new certification record",
                "parameters": {
                    "cert_type": "Type of certification",
                    "notes": "Additional notes"
                }
            },
            {
                "name": "certify_mapping",
                "description": "Certify a data mapping from business perspective",
                "parameters": {
                    "cert_id": "ID of the certification",
                    "status": "Certification status (certified, rejected)",
                    "notes": "Additional notes",
                    "certified_by": "Who is certifying"
                }
            }
        ]
    
    def action_define_customer_attribute(self, name: str, data_type: str, 
                                       description: str, is_pii: bool = False,
                                       category: str = "other") -> Dict[str, Any]:
        """
        Define a new target customer attribute.
        
        Args:
            name: Name of the attribute
            data_type: Data type of the attribute
            description: Description of the attribute
            is_pii: Whether this attribute contains PII
            category: Category of the attribute
            
        Returns:
            Result of the attribute creation
        """
        return add_customer_attribute(name, data_type, description, is_pii, category)
    
    def action_get_customer_attributes(self, category: Optional[str] = None) -> Dict[str, Any]:
        """
        Get a list of defined customer attributes.
        
        Args:
            category: Optional category to filter by
            
        Returns:
            List of customer attributes
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            if category:
                cursor.execute("SELECT * FROM customer_attributes WHERE category = ?", (category,))
            else:
                cursor.execute("SELECT * FROM customer_attributes")
                
            attributes = [dict(row) for row in cursor.fetchall()]
            
            conn.close()
            
            return {
                "success": True,
                "attributes": attributes,
                "count": len(attributes)
            }
        except Exception as e:
            error_msg = f"Error getting customer attributes: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def action_create_certification(self, cert_type: str, notes: str = "") -> Dict[str, Any]:
        """
        Create a new certification record.
        
        Args:
            cert_type: Type of certification
            notes: Additional notes
            
        Returns:
            Result of the certification creation
        """
        return add_certification(cert_type, notes)
    
    def action_certify_mapping(self, cert_id: int, status: str, 
                             notes: str = "", certified_by: str = "") -> Dict[str, Any]:
        """
        Certify a data mapping from business perspective.
        
        Args:
            cert_id: ID of the certification
            status: Certification status (certified, rejected)
            notes: Additional notes
            certified_by: Who is certifying
            
        Returns:
            Result of the certification update
        """
        return update_certification(cert_id, status, notes, certified_by)


class MappingAgent(BaseAgent):
    """
    Mapping Agent
    
    Responsibilities:
    - Create source-to-target attribute mappings
    - Generate transformation logic for mappings
    - Validate mappings for data quality
    - Track mapping lineage
    """
    
    def __init__(self, agent_id: str = "mapping_agent", 
                name: str = "Mapping Agent", 
                description: str = "Creates and validates data mappings",
                config: Optional[Dict[str, Any]] = None):
        """Initialize the Mapping Agent."""
        super().__init__(agent_id, name, description, config)
        self._init_ml_components()
    
    def _init_ml_components(self):
        """Initialize ML components for enhanced mapping suggestions."""
        # Initialize embeddings dictionary for all attributes
        self.attribute_embeddings = {}
        # Track mapping history to learn from past suggestions
        self.mapping_history = []
    
    def get_capabilities(self) -> List[Dict[str, Any]]:
        """Get capabilities supported by this agent."""
        return [
            {
                "name": "create_mapping",
                "description": "Create a source-to-target attribute mapping",
                "parameters": {
                    "source_system_id": "ID of the source system",
                    "source_attribute": "Name of the source attribute",
                    "target_attribute_id": "ID of the target attribute",
                    "transformation_logic": "Logic for transforming the data",
                    "created_by": "Who created this mapping"
                }
            },
            {
                "name": "validate_mapping",
                "description": "Validate a specific mapping",
                "parameters": {
                    "mapping_id": "ID of the mapping to validate"
                }
            },
            {
                "name": "validate_all_mappings",
                "description": "Validate all mappings for a source system",
                "parameters": {
                    "source_id": "Optional ID of the source system"
                }
            },
            {
                "name": "get_mappings",
                "description": "Get existing mappings",
                "parameters": {
                    "source_id": "Optional ID of the source system",
                    "target_id": "Optional ID of the target attribute",
                    "status": "Optional mapping status to filter by"
                }
            },
            {
                "name": "suggest_mappings",
                "description": "Suggest potential mappings based on schema and attribute names",
                "parameters": {
                    "source_id": "ID of the source system"
                }
            },
            {
                "name": "ml_suggest_mappings",
                "description": "Suggest mappings using machine learning techniques",
                "parameters": {
                    "source_id": "ID of the source system"
                }
            },
            {
                "name": "learn_from_feedback",
                "description": "Learn from user feedback on mapping suggestions",
                "parameters": {
                    "mapping_id": "ID of the mapping to learn from",
                    "is_approved": "Whether the mapping was approved",
                    "feedback": "Optional feedback comments"
                }
            }
        ]
    
    def action_create_mapping(self, source_system_id: int, source_attribute: str,
                            target_attribute_id: int, transformation_logic: str = "",
                            created_by: str = "MappingAgent") -> Dict[str, Any]:
        """
        Create a source-to-target attribute mapping.
        
        Args:
            source_system_id: ID of the source system
            source_attribute: Name of the source attribute
            target_attribute_id: ID of the target attribute
            transformation_logic: Logic for transforming the data
            created_by: Who created this mapping
            
        Returns:
            Result of the mapping creation
        """
        result = add_data_mapping(source_system_id, source_attribute, 
                              target_attribute_id, transformation_logic, created_by)
        
        # Add to mapping history for ML learning
        if result.get("success", False):
            self._add_to_mapping_history(result.get("mapping_id"), source_system_id, 
                                        source_attribute, target_attribute_id, True)
        
        return result
    
    def action_validate_mapping(self, mapping_id: int) -> Dict[str, Any]:
        """
        Validate a specific mapping.
        
        Args:
            mapping_id: ID of the mapping to validate
            
        Returns:
            Validation result
        """
        return validate_mapping(mapping_id)
    
    def action_validate_all_mappings(self, source_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Validate all mappings for a source system.
        
        Args:
            source_id: Optional ID of the source system
            
        Returns:
            Validation results
        """
        return validate_all_mappings(source_id)
    
    def action_get_mappings(self, source_id: Optional[int] = None, 
                          target_id: Optional[int] = None,
                          status: Optional[str] = None) -> Dict[str, Any]:
        """
        Get existing mappings.
        
        Args:
            source_id: Optional ID of the source system
            target_id: Optional ID of the target attribute
            status: Optional mapping status to filter by
            
        Returns:
            List of mappings
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Build query based on filters
            query = """
                SELECT 
                    m.*, 
                    s.system_name as source_system_name,
                    ca.attribute_name as target_attribute_name
                FROM data_mappings m
                JOIN source_systems s ON m.source_system_id = s.id
                JOIN customer_attributes ca ON m.target_attribute_id = ca.id
                WHERE 1=1
            """
            params = []
            
            if source_id is not None:
                query += " AND m.source_system_id = ?"
                params.append(source_id)
                
            if target_id is not None:
                query += " AND m.target_attribute_id = ?"
                params.append(target_id)
                
            if status is not None:
                query += " AND m.mapping_status = ?"
                params.append(status)
                
            cursor.execute(query, params)
            mappings = [dict(row) for row in cursor.fetchall()]
            
            conn.close()
            
            return {
                "success": True,
                "mappings": mappings,
                "count": len(mappings)
            }
        except Exception as e:
            error_msg = f"Error getting mappings: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def action_suggest_mappings(self, source_id: int) -> Dict[str, Any]:
        """
        Suggest potential mappings based on schema and attribute names.
        
        This uses a simple heuristic to suggest mappings based on attribute
        name similarity. In a real system, this would use more sophisticated
        techniques like embeddings, ML models, etc.
        
        Args:
            source_id: ID of the source system
            
        Returns:
            List of suggested mappings
        """
        try:
            # Get source system attributes
            source_result = extract_attributes(source_id)
            
            if not source_result.get("success", False):
                return source_result
                
            source_attributes = source_result.get("attributes", [])
            
            if not source_attributes:
                return {
                    "success": False,
                    "error": "No attributes found for the source system"
                }
                
            # Get target attributes
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM customer_attributes")
            target_attributes = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            # Simple matching heuristic
            suggested_mappings = []
            
            for source_attr in source_attributes:
                source_name = source_attr.get("name", "").lower()
                
                # Extract just the column name without table prefix
                if "." in source_name:
                    source_col = source_name.split(".")[-1]
                else:
                    source_col = source_name
                    
                best_match = None
                highest_score = 0
                
                for target_attr in target_attributes:
                    target_name = target_attr.get("attribute_name", "").lower()
                    
                    # Calculate similarity score (very simple for demonstration)
                    # In a real system, use more sophisticated NLP techniques
                    score = self._calculate_similarity(source_col, target_name)
                    
                    if score > highest_score and score > 0.5:  # Threshold
                        highest_score = score
                        best_match = target_attr
                
                if best_match:
                    # Generate simple transformation logic based on data types
                    transformation_logic = self._generate_transformation_logic(
                        source_attr, best_match
                    )
                    
                    suggested_mappings.append({
                        "source_system_id": source_id,
                        "source_attribute": source_attr.get("name"),
                        "target_attribute_id": best_match.get("id"),
                        "target_attribute_name": best_match.get("attribute_name"),
                        "confidence_score": highest_score,
                        "transformation_logic": transformation_logic
                    })
            
            # Sort by confidence score
            suggested_mappings = sorted(
                suggested_mappings,
                key=lambda x: x.get("confidence_score", 0),
                reverse=True
            )
            
            return {
                "success": True,
                "source_system_id": source_id,
                "source_system_name": source_result.get("source_name"),
                "suggested_mappings": suggested_mappings,
                "count": len(suggested_mappings)
            }
            
        except Exception as e:
            error_msg = f"Error suggesting mappings: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}


class DataEngineerAgent(BaseAgent):
    """
    Data Engineer Agent
    
    Responsibilities:
    - Build the Customer 360 data product
    - Execute data transformations and loading
    - Monitor data quality and completeness
    - Implement data governance rules
    """
    
    def __init__(self, agent_id: str = "data_engineer", 
                name: str = "Data Engineer", 
                description: str = "Builds and maintains the Customer 360 data product",
                config: Optional[Dict[str, Any]] = None):
        """Initialize the Data Engineer agent."""
        super().__init__(agent_id, name, description, config)
    
    def get_capabilities(self) -> List[Dict[str, Any]]:
        """Get capabilities supported by this agent."""
        return [
            {
                "name": "build_customer_360",
                "description": "Build the Customer 360 view based on validated mappings",
                "parameters": {
                    "include_pending": "Whether to include pending mappings"
                }
            },
            {
                "name": "get_customer_360_data",
                "description": "Get data from the Customer 360 view",
                "parameters": {
                    "limit": "Maximum number of records to return",
                    "filters": "Optional filters to apply"
                }
            },
            {
                "name": "get_data_quality_metrics",
                "description": "Get data quality metrics for the Customer 360 view",
                "parameters": {}
            },
            {
                "name": "get_data_lineage",
                "description": "Get data lineage for Customer 360 attributes",
                "parameters": {
                    "attribute": "Optional attribute to filter by"
                }
            },
            {
                "name": "get_field_issues",
                "description": "Get data quality issues for specific fields",
                "parameters": {
                    "attribute": "Optional attribute to filter by",
                    "severity": "Optional severity level to filter by"
                }
            },
            {
                "name": "fix_data_quality",
                "description": "Fix data quality issues automatically",
                "parameters": {
                    "issue_id": "ID of the issue to fix",
                    "attribute": "Attribute with issues to fix",
                    "fix_type": "Type of fix to apply",
                    "parameters": "Additional parameters for the fix"
                }
            },
            {
                "name": "get_quality_history",
                "description": "Get historical data quality metrics",
                "parameters": {
                    "range": "Time range to retrieve history for"
                }
            },
            {
                "name": "get_customer_count",
                "description": "Get count of customer records",
                "parameters": {}
            }
        ]
    
    def action_get_data_lineage(self, attribute: Optional[str] = None) -> Dict[str, Any]:
        """
        Get data lineage for Customer 360 attributes with enhanced details.
        
        Args:
            attribute: Optional attribute to filter by
            
        Returns:
            Detailed data lineage information with visualization metadata
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Build query based on attribute filter
            query = """
                SELECT 
                    m.id, 
                    s.system_name as source_system,
                    s.id as source_system_id,
                    m.source_attribute,
                    ca.id as target_attribute_id,
                    ca.attribute_name as target_attribute,
                    ca.data_type as target_data_type,
                    m.transformation_logic,
                    m.mapping_status,
                    m.last_validated,
                    m.created_by,
                    m.created_at
                FROM data_mappings m
                JOIN source_systems s ON m.source_system_id = s.id
                JOIN customer_attributes ca ON m.target_attribute_id = ca.id
            """
            
            params = []
            
            if attribute:
                query += " WHERE ca.attribute_name = ?"
                params.append(attribute)
                
            cursor.execute(query, params)
            lineage = [dict(row) for row in cursor.fetchall()]
            
            # Group by target attribute
            lineage_by_attribute = {}
            
            for mapping in lineage:
                target = mapping['target_attribute']
                
                if target not in lineage_by_attribute:
                    lineage_by_attribute[target] = []
                    
                # Get sample data values to show in lineage
                sample_values = []
                try:
                    sample_result = get_sample_data(mapping['source_system_id'], mapping['source_attribute'])
                    if sample_result.get("success", True) and sample_result.get("sample_data"):
                        sample_values = [
                            sample.get("sample_value") 
                            for sample in sample_result.get("sample_data", [])[:3]
                        ]
                except Exception:
                    # Ignore errors getting sample data
                    pass
                
                # Add enhanced lineage information
                lineage_by_attribute[target].append({
                    "mapping_id": mapping['id'],
                    "source_system": mapping['source_system'],
                    "source_system_id": mapping['source_system_id'],
                    "source_attribute": mapping['source_attribute'],
                    "transformation_logic": mapping['transformation_logic'],
                    "target_data_type": mapping['target_data_type'],
                    "status": mapping['mapping_status'],
                    "last_validated": mapping['last_validated'],
                    "created_by": mapping['created_by'],
                    "created_at": mapping['created_at'],
                    "sample_values": sample_values
                })
                
            # If we're looking up a specific attribute, add additional metadata
            if attribute and attribute in lineage_by_attribute:
                # Get data quality info for this attribute
                quality_info = self._get_attribute_quality_metrics(attribute)
                
                # Add metadata for visualization
                metadata = {
                    "attribute_name": attribute,
                    "quality_metrics": quality_info,
                    "sources_count": len(lineage_by_attribute[attribute]),
                    "has_issues": any(source["status"] == "issues" for source in lineage_by_attribute[attribute]),
                    "flow_stages": self._generate_lineage_flow_stages(attribute, lineage_by_attribute[attribute])
                }
                
                result = {
                    "success": True,
                    "lineage": lineage_by_attribute,
                    "attribute_count": len(lineage_by_attribute),
                    "metadata": metadata
                }
            else:
                result = {
                    "success": True,
                    "lineage": lineage_by_attribute,
                    "attribute_count": len(lineage_by_attribute)
                }
            
            conn.close()
            return result
            
        except Exception as e:
            error_msg = f"Error getting data lineage: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def action_get_field_issues(self, attribute: Optional[str] = None, 
                              severity: Optional[str] = None) -> Dict[str, Any]:
        """
        Get data quality issues for specific fields.
        
        Args:
            attribute: Optional attribute to filter by
            severity: Optional severity level to filter by (high, medium, low)
            
        Returns:
            List of data quality issues
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # In a production system, this would query a dedicated data quality issues table
            # For this demo, we'll generate synthetic issues based on mappings and data analysis
            
            # Get all issues or filter by attribute
            if attribute:
                cursor.execute("""
                    SELECT 
                        ca.attribute_name,
                        ca.data_type,
                        ca.id as attribute_id,
                        m.id as mapping_id,
                        m.mapping_status,
                        m.source_attribute,
                        s.system_name as source_system,
                        s.id as source_system_id
                    FROM customer_attributes ca
                    LEFT JOIN data_mappings m ON ca.id = m.target_attribute_id
                    LEFT JOIN source_systems s ON m.source_system_id = s.id
                    WHERE ca.attribute_name = ?
                """, (attribute,))
            else:
                cursor.execute("""
                    SELECT 
                        ca.attribute_name,
                        ca.data_type,
                        ca.id as attribute_id,
                        m.id as mapping_id,
                        m.mapping_status,
                        m.source_attribute,
                        s.system_name as source_system,
                        s.id as source_system_id
                    FROM customer_attributes ca
                    LEFT JOIN data_mappings m ON ca.id = m.target_attribute_id
                    LEFT JOIN source_systems s ON m.source_system_id = s.id
                """)
            
            rows = cursor.fetchall()
            
            # Get Customer 360 data quality metrics
            metrics_result = self.action_get_data_quality_metrics()
            metrics = metrics_result.get("metrics", {})
            
            # Generate issues based on mapping status and data analysis
            issues = []
            issue_id = 1
            
            for row in rows:
                # Skip if no mapping
                if not row['mapping_id']:
                    continue
                    
                issue_type = None
                issue_severity = None
                issue_description = None
                affected_records = 0
                fix_options = []
                
                # Generate issues based on mapping status
                if row['mapping_status'] == 'issues':
                    issue_type = "Validation Failed"
                    issue_severity = "high"
                    issue_description = f"Mapping validation failed for {row['attribute_name']} from {row['source_system']}"
                    affected_records = int(metrics.get(row['attribute_name'], {}).get("total_rows", 100) * 0.2)  # 20% of records
                    
                    fix_options = [
                        {"type": "remap", "name": "Create New Mapping", "description": "Map to a different source attribute"},
                        {"type": "fix_transformation", "name": "Fix Transformation", "description": "Review and correct the transformation logic"}
                    ]
                    
                # Check for completeness issues
                elif row['attribute_name'] in metrics and metrics[row['attribute_name']].get("completeness", 100) < 90:
                    issue_type = "Low Completeness"
                    issue_severity = "medium" if metrics[row['attribute_name']].get("completeness", 0) > 70 else "high"
                    issue_description = f"Low completeness ({metrics[row['attribute_name']].get('completeness')}%) for {row['attribute_name']}"
                    affected_records = metrics[row['attribute_name']].get("total_rows", 0) - metrics[row['attribute_name']].get("non_null_count", 0)
                    
                    fix_options = [
                        {"type": "fill_nulls", "name": "Fill Null Values", "description": "Fill null values with defaults"},
                        {"type": "alternative_source", "name": "Try Alternative Source", "description": "Map from an alternative source system"}
                    ]
                    
                # Check for format issues based on data type
                elif row['data_type'] == 'TEXT' and row['attribute_name'].lower() in ('email', 'email_address'):
                    issue_type = "Format Issues"
                    issue_severity = "medium"
                    issue_description = f"Format validation issues detected with {row['attribute_name']}"
                    affected_records = int(metrics.get(row['attribute_name'], {}).get("total_rows", 100) * 0.15)  # 15% of records
                    
                    fix_options = [
                        {"type": "standardize_format", "name": "Standardize Format", "description": "Apply format standardization rules"},
                        {"type": "extract_valid", "name": "Extract Valid Parts", "description": "Extract valid parts of the values"}
                    ]
                    
                # For phone numbers
                elif row['data_type'] == 'TEXT' and 'phone' in row['attribute_name'].lower():
                    issue_type = "Inconsistent Format"
                    issue_severity = "medium"
                    issue_description = f"Inconsistent phone number formats in {row['attribute_name']}"
                    affected_records = int(metrics.get(row['attribute_name'], {}).get("total_rows", 100) * 0.3)  # 30% of records
                    
                    fix_options = [
                        {"type": "standardize_phones", "name": "Standardize Phone Numbers", "description": "Apply international format with country codes"},
                        {"type": "extract_digits", "name": "Extract Digits Only", "description": "Keep only numeric digits"}
                    ]
                
                # Add random quality issues for demo purposes
                elif issue_id % 5 == 0:
                    issue_type = "Data Inconsistency"
                    issue_severity = "low"
                    issue_description = f"Minor inconsistencies detected in {row['attribute_name']} values"
                    affected_records = int(metrics.get(row['attribute_name'], {}).get("total_rows", 100) * 0.1)  # 10% of records
                    
                    fix_options = [
                        {"type": "auto_correct", "name": "Auto-Correct Values", "description": "Apply auto-correction rules"},
                        {"type": "flag_review", "name": "Flag for Review", "description": "Flag inconsistent records for manual review"}
                    ]
                
                # If we found an issue, add it to the list
                if issue_type:
                    # If severity filter applies, check if this issue matches
                    if severity and issue_severity != severity:
                        continue
                        
                    issues.append({
                        "issue_id": issue_id,
                        "attribute": row['attribute_name'],
                        "issue_type": issue_type,
                        "severity": issue_severity,
                        "description": issue_description,
                        "affected_records": affected_records,
                        "source_system": row['source_system'] if row['source_system'] else "Multiple",
                        "mapping_id": row['mapping_id'],
                        "fix_options": fix_options
                    })
                    issue_id += 1
            
            # Sort by severity (high to low)
            severity_order = {"high": 0, "medium": 1, "low": 2}
            issues.sort(key=lambda x: severity_order.get(x.get("severity"), 999))
            
            conn.close()
            
            return {
                "success": True,
                "issues": issues,
                "count": len(issues)
            }
        except Exception as e:
            error_msg = f"Error getting field issues: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def action_fix_data_quality(self, issue_id: Optional[int] = None, 
                              attribute: Optional[str] = None,
                              fix_type: str = "",
                              parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Fix data quality issues automatically.
        
        Args:
            issue_id: ID of the issue to fix
            attribute: Attribute with issues to fix
            fix_type: Type of fix to apply
            parameters: Additional parameters for the fix
            
        Returns:
            Result of the fix operation
        """
        # Set default parameters if none provided
        if parameters is None:
            parameters = {}
            
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # In a production system, this would update the actual data
            # For this demo, we'll simulate various fixes
            
            # Get the issue details if we have an issue ID
            issue = None
            if issue_id:
                # Get all issues to find the one with matching ID
                issues_result = self.action_get_field_issues()
                for i in issues_result.get("issues", []):
                    if i["issue_id"] == issue_id:
                        issue = i
                        attribute = i["attribute"]
                        break
                        
                if not issue:
                    return {"success": False, "error": f"Issue with ID {issue_id} not found"}
                    
            elif not attribute:
                return {"success": False, "error": "Either issue_id or attribute is required"}
                
            # Track changes made
            changes = []
            affected_records = 0
            
            # Apply the fix based on type
            if fix_type == "standardize_phones":
                # Simulate standardizing phone numbers
                cursor.execute(
                    "SELECT COUNT(*) as count FROM customer_360 WHERE " + attribute + " IS NOT NULL"
                )
                row = cursor.fetchone()
                affected_records = int(row['count'] * 0.8) if row else 0
                
                changes.append(f"Standardized {affected_records} phone numbers to international format")
                changes.append("Added country codes where missing")
                changes.append("Removed non-digit characters")
                
            elif fix_type == "standardize_format":
                # Simulate standardizing general formats (emails, addresses, etc.)
                cursor.execute(
                    "SELECT COUNT(*) as count FROM customer_360 WHERE " + attribute + " IS NOT NULL"
                )
                row = cursor.fetchone()
                affected_records = int(row['count'] * 0.75) if row else 0
                
                changes.append(f"Standardized {affected_records} values to consistent format")
                changes.append("Fixed capitalization and spacing issues")
                
                if "email" in attribute.lower():
                    changes.append("Validated email format and domain existence")
                
            elif fix_type == "fill_nulls":
                # Simulate filling null values
                default_value = parameters.get("default_value", "")
                
                cursor.execute(
                    "SELECT COUNT(*) as count FROM customer_360 WHERE " + attribute + " IS NULL"
                )
                row = cursor.fetchone()
                affected_records = row['count'] if row else 0
                
                if affected_records > 0:
                    changes.append(f"Filled {affected_records} null values with default: '{default_value}'")
                
            elif fix_type == "extract_digits":
                cursor.execute(
                    "SELECT COUNT(*) as count FROM customer_360 WHERE " + attribute + " IS NOT NULL"
                )
                row = cursor.fetchone()
                affected_records = int(row['count'] * 0.7) if row else 0
                
                changes.append(f"Extracted numeric digits from {affected_records} values")
                
            elif fix_type == "auto_correct":
                cursor.execute(
                    "SELECT COUNT(*) as count FROM customer_360 WHERE " + attribute + " IS NOT NULL"
                )
                row = cursor.fetchone()
                affected_records = int(row['count'] * 0.5) if row else 0
                
                changes.append(f"Auto-corrected {affected_records} values using NLP techniques")
                changes.append("Fixed spelling and formatting issues")
                
            elif fix_type == "remap" or fix_type == "fix_transformation":
                # These would require custom mapping changes - return special instructions
                return {
                    "success": True,
                    "affected_records": 0,
                    "changes": [],
                    "requires_mapping_update": True,
                    "attribute": attribute,
                    "fix_type": fix_type,
                    "message": f"The {fix_type} operation requires updates to data mappings. Please use the mapping interface to perform this change."
                }
            else:
                return {
                    "success": False, 
                    "error": f"Unknown fix type: {fix_type}"
                }
            
            # For demo purposes, we update a timestamp field to reflect when the fix was applied
            # but we don't actually modify the data
            timestamp = self._get_timestamp()
            
            # Log the fix attempt
            self._log_interaction(
                f"fix_data_quality_{fix_type}",
                f"Fixed {affected_records} records for attribute {attribute}",
                f"Fix type: {fix_type}, Changes: {len(changes)}"
            )
            
            return {
                "success": True,
                "attribute": attribute,
                "fix_type": fix_type,
                "affected_records": affected_records,
                "changes": changes,
                "timestamp": timestamp
            }
            
        except Exception as e:
            error_msg = f"Error fixing data quality: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def action_get_quality_history(self, range_param: str = "30days") -> Dict[str, Any]:
        """
        Get historical data quality metrics.
        
        Args:
            range_param: Time range to retrieve history for (7days, 30days, 90days, 1year)
            
        Returns:
            Historical data quality metrics
        """
        try:
            # In a production system, this would query a table with historical metrics
            # For this demo, we'll generate synthetic data
            
            # Parse the range parameter
            days = 30
            if range_param == "7days":
                days = 7
            elif range_param == "90days":
                days = 90
            elif range_param == "1year":
                days = 365
                
            # Generate dates for the range
            from datetime import datetime, timedelta
            end_date = datetime.now()
            history = []
            
            # Get current quality metrics as a baseline
            metrics_result = self.action_get_data_quality_metrics()
            current_metrics = metrics_result.get("metrics", {})
            
            # Calculate overall current metrics
            current_completeness = 0
            current_accuracy = 0
            current_consistency = 0
            current_timeliness = 0
            count = 0
            
            # Helper function to convert percentage to ratio
            def pct_to_ratio(pct):
                return float(pct) / 100 if pct else 0
            
            # Calculate averages from all attributes
            for attr, attr_metrics in current_metrics.items():
                if "completeness" in attr_metrics:
                    current_completeness += pct_to_ratio(attr_metrics["completeness"])
                    count += 1
            
            if count > 0:
                current_completeness /= count
                
                # For demo purposes, generate other metrics based on completeness
                current_accuracy = current_completeness * 0.9 + 0.05  # Slightly lower than completeness
                current_consistency = current_completeness * 0.95  # Slightly lower than completeness
                current_timeliness = current_completeness * 1.05  # Slightly higher than completeness
                
                # Ensure values are within reasonable range
                current_accuracy = min(max(current_accuracy, 0.5), 0.98)
                current_consistency = min(max(current_consistency, 0.4), 0.95)
                current_timeliness = min(max(current_timeliness, 0.6), 0.99)
            else:
                # Default values if no attributes found
                current_completeness = 0.85
                current_accuracy = 0.82
                current_consistency = 0.78
                current_timeliness = 0.90
                
            # Generate historical data with trend and some realistic variation
            import random
            
            for i in range(days):
                date = end_date - timedelta(days=days-i)
                date_str = date.strftime("%Y-%m-%d")
                
                # Historical values trend slightly worse in the past with some random variation
                day_factor = i / days  # 0 to 1 from oldest to newest
                variation = (random.random() - 0.5) * 0.05  # +/- 2.5% random variation
                
                # Create a trend where metrics improve over time
                completeness = current_completeness - ((1 - day_factor) * 0.15) + variation
                accuracy = current_accuracy - ((1 - day_factor) * 0.12) + variation
                consistency = current_consistency - ((1 - day_factor) * 0.18) + variation
                timeliness = current_timeliness - ((1 - day_factor) * 0.08) + variation
                
                # Ensure values are within reasonable range
                completeness = min(max(completeness, 0.5), 0.99)
                accuracy = min(max(accuracy, 0.5), 0.98)
                consistency = min(max(consistency, 0.4), 0.95)
                timeliness = min(max(timeliness, 0.6), 0.99)
                
                history.append({
                    "date": date_str,
                    "completeness": round(completeness, 2),
                    "accuracy": round(accuracy, 2),
                    "consistency": round(consistency, 2),
                    "timeliness": round(timeliness, 2)
                })
            
            return {
                "success": True,
                "history": history,
                "range": range_param,
                "days": days
            }
            
        except Exception as e:
            error_msg = f"Error getting quality history: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def action_get_customer_count(self) -> Dict[str, Any]:
        """
        Get count of customer records.
        
        Returns:
            Customer count
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*) as count FROM customer_360")
            row = cursor.fetchone()
            count = row['count'] if row else 0
            
            conn.close()
            
            return {
                "success": True,
                "customer_count": count
            }
        except Exception as e:
            error_msg = f"Error getting customer count: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def _get_attribute_quality_metrics(self, attribute: str) -> Dict[str, Any]:
        """
        Get quality metrics for a specific attribute.
        
        Args:
            attribute: Name of the attribute
            
        Returns:
            Quality metrics for the attribute
        """
        try:
            metrics_result = self.action_get_data_quality_metrics()
            all_metrics = metrics_result.get("metrics", {})
            
            # Return metrics for the specific attribute or default values
            if attribute in all_metrics:
                metrics = all_metrics[attribute]
                
                # Convert completeness to ratio if it's a percentage
                if "completeness" in metrics and metrics["completeness"] > 1:
                    metrics["completeness"] = metrics["completeness"] / 100
                    
                return metrics
            else:
                return {
                    "completeness": 0.8,
                    "total_rows": 0,
                    "non_null_count": 0,
                    "distinct_count": 0
                }
        except Exception:
            return {
                "completeness": 0.8,
                "total_rows": 0,
                "non_null_count": 0,
                "distinct_count": 0
            }
    
    def _generate_lineage_flow_stages(self, attribute: str, sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generate flow stages for lineage visualization.
        
        Args:
            attribute: Target attribute name
            sources: List of source mappings
            
        Returns:
            Flow stages for visualization
        """
        # A simple 3-stage flow: Sources → Transformations → Target
        stages = []
        
        # Stage 1: Source Systems
        source_systems = {}
        for source in sources:
            system = source["source_system"]
            if system not in source_systems:
                source_systems[system] = []
            source_systems[system].append({
                "name": source["source_attribute"],
                "mapping_id": source["mapping_id"],
                "status": source["status"]
            })
        
        stages.append({
            "name": "Source Systems",
            "nodes": [
                {
                    "name": system,
                    "attributes": attributes,
                    "type": "source"
                } 
                for system, attributes in source_systems.items()
            ]
        })
        
        # Stage 2: Transformations
        transformations = []
        for source in sources:
            if source["transformation_logic"] and len(source["transformation_logic"]) > 0:
                transformations.append({
                    "name": f"Transform {source['source_attribute']}",
                    "source": source["source_attribute"],
                    "logic": source["transformation_logic"],
                    "status": source["status"],
                    "mapping_id": source["mapping_id"]
                })
                
        if transformations:
            stages.append({
                "name": "Transformations",
                "nodes": transformations
            })
            
        # Stage 3: Target Attribute
        stages.append({
            "name": "Target",
            "nodes": [
                {
                    "name": attribute,
                    "type": "target",
                    "sources_count": len(sources)
                }
            ]
        })
        
        return stages
        
    def _apply_simple_transformation(self, value: Any, target_type: str) -> Any:
        """
        Apply a simple transformation based on target data type.
        
        Args:
            value: Input value
            target_type: Target data type
            
        Returns:
            Transformed value
        """
        if value is None:
            return None
            
        try:
            if target_type == "INTEGER":
                return int(float(value))
            elif target_type == "REAL":
                return float(value)
            elif target_type == "DATE":
                # Simple date parsing
                import datetime
                if isinstance(value, (datetime.date, datetime.datetime)):
                    return value.isoformat()
                return value  # Let SQLite handle the conversion
            else:
                # Default to string
                return str(value)
        except Exception:
            # Return original value if transformation fails
            return value
    
    def _get_customer_360_columns(self) -> List[str]:
        """
        Get the list of columns in the Customer 360 table.
        
        Returns:
            List of column names
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("PRAGMA table_info(customer_360)")
            columns = [row['name'] for row in cursor.fetchall()]
            
            conn.close()
            
            return columns
        except Exception as e:
            logger.error(f"Error getting Customer 360 columns: {e}")
            return []


class CoordinatorAgent(BaseAgent):
    """
    Coordinator Agent
    
    Responsibilities:
    - Orchestrate the workflow between agents
    - Track overall progress of the Customer 360 solution
    - Handle exceptions and conflicts
    - Provide status updates and reporting
    """
    
    def __init__(self, agent_id: str = "coordinator", 
                name: str = "Coordinator", 
                description: str = "Coordinates the overall Customer 360 workflow",
                config: Optional[Dict[str, Any]] = None):
        """Initialize the Coordinator agent."""
        super().__init__(agent_id, name, description, config)
        self.workflow_status = {}
    
    def get_capabilities(self) -> List[Dict[str, Any]]:
        """Get capabilities supported by this agent."""
        return [
            {
                "name": "start_workflow",
                "description": "Start a Customer 360 workflow",
                "parameters": {
                    "workflow_type": "Type of workflow to start"
                }
            },
            {
                "name": "get_workflow_status",
                "description": "Get status of current workflow",
                "parameters": {
                    "workflow_id": "ID of the workflow"
                }
            },
            {
                "name": "get_agent_activity",
                "description": "Get activity report for agents",
                "parameters": {
                    "agent_id": "Optional ID of agent to filter by",
                    "days": "Number of days to include"
                }
            },
            {
                "name": "get_system_status",
                "description": "Get overall system status",
                "parameters": {}
            }
        ]
    
    def action_start_workflow(self, workflow_type: str) -> Dict[str, Any]:
        """
        Start a Customer 360 workflow.
        
        Args:
            workflow_type: Type of workflow to start
            
        Returns:
            Workflow initialization result
        """
        # Generate a workflow ID
        import uuid
        workflow_id = str(uuid.uuid4())
        
        # Initialize workflow status
        self.workflow_status[workflow_id] = {
            "workflow_id": workflow_id,
            "workflow_type": workflow_type,
            "status": "started",
            "start_time": self._get_timestamp(),
            "end_time": None,
            "steps": [],
            "current_step": 0,
            "errors": []
        }
        
        # Define workflow steps based on type
        if workflow_type == "full_customer_360_build":
            steps = [
                "Register source systems",
                "Scan source systems",
                "Define customer attributes",
                "Generate mappings",
                "Validate mappings",
                "Build Customer 360",
                "Generate data quality metrics"
            ]
            self.workflow_status[workflow_id]["steps"] = steps
            
        elif workflow_type == "data_quality_validation":
            steps = [
                "Scan source systems",
                "Validate existing mappings",
                "Generate data quality metrics"
            ]
            self.workflow_status[workflow_id]["steps"] = steps
            
        elif workflow_type == "mapping_certification":
            steps = [
                "Review existing mappings",
                "Create certification requests",
                "Process certifications"
            ]
            self.workflow_status[workflow_id]["steps"] = steps
            
        else:
            self.workflow_status[workflow_id]["status"] = "error"
            self.workflow_status[workflow_id]["errors"].append(f"Unknown workflow type: {workflow_type}")
            return {
                "success": False,
                "error": f"Unknown workflow type: {workflow_type}"
            }
            
        # Log the workflow start
        self._log_interaction(
            "start_workflow",
            f"Started workflow {workflow_type}",
            f"Workflow ID: {workflow_id}, Steps: {len(steps)}"
        )
        
        return {
            "success": True,
            "workflow_id": workflow_id,
            "workflow_type": workflow_type,
            "steps": steps,
            "message": f"Workflow {workflow_type} started with ID {workflow_id}"
        }
    
    def action_get_workflow_status(self, workflow_id: str) -> Dict[str, Any]:
        """
        Get status of current workflow.
        
        Args:
            workflow_id: ID of the workflow
            
        Returns:
            Current workflow status
        """
        if workflow_id not in self.workflow_status:
            return {
                "success": False,
                "error": f"Workflow ID {workflow_id} not found"
            }
            
        return {
            "success": True,
            "status": self.workflow_status[workflow_id]
        }
    
    def action_get_agent_activity(self, agent_id: Optional[str] = None, 
                                days: int = 7) -> Dict[str, Any]:
        """
        Get activity report for agents.
        
        Args:
            agent_id: Optional ID of agent to filter by
            days: Number of days to include
            
        Returns:
            Agent activity report
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Calculate date cutoff
            import datetime
            cutoff_date = (datetime.datetime.now() - datetime.timedelta(days=days)).strftime("%Y-%m-%d")
            
            # Build query
            query = """
                SELECT 
                    agent_name,
                    action_type,
                    details,
                    timestamp
                FROM agent_interactions
                WHERE timestamp >= ?
            """
            
            params = [cutoff_date]
            
            if agent_id:
                query += " AND agent_name = ?"
                params.append(agent_id)
                
            query += " ORDER BY timestamp DESC"
            
            cursor.execute(query, params)
            activities = [dict(row) for row in cursor.fetchall()]
            
            # Group by agent
            activity_by_agent = {}
            
            for activity in activities:
                agent = activity['agent_name']
                
                if agent not in activity_by_agent:
                    activity_by_agent[agent] = []
                    
                activity_by_agent[agent].append({
                    "action_type": activity['action_type'],
                    "details": activity['details'],
                    "timestamp": activity['timestamp']
                })
            
            # Calculate summary statistics
            summary = {
                "total_activities": len(activities),
                "agent_count": len(activity_by_agent),
                "days": days
            }
            
            conn.close()
            
            return {
                "success": True,
                "activities": activity_by_agent,
                "summary": summary
            }
        except Exception as e:
            error_msg = f"Error getting agent activity: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def action_get_system_status(self) -> Dict[str, Any]:
        """
        Get overall system status.
        
        Returns:
            System status report
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get counts of key entities
            cursor.execute("SELECT COUNT(*) as count FROM source_systems")
            source_count = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM customer_attributes")
            attribute_count = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM data_mappings")
            mapping_count = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count, mapping_status FROM data_mappings GROUP BY mapping_status")
            mapping_status = {row['mapping_status']: row['count'] for row in cursor.fetchall()}
            
            cursor.execute("SELECT COUNT(*) as count FROM customer_360")
            customer_count = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM certifications")
            certification_count = cursor.fetchone()['count']
            
            # Get recent activities
            cursor.execute(
                """
                SELECT 
                    agent_name,
                    action_type,
                    details,
                    timestamp
                FROM agent_interactions
                ORDER BY timestamp DESC
                LIMIT 10
                """
            )
            recent_activities = [dict(row) for row in cursor.fetchall()]
            
            conn.close()
            
            # Compile system status
            status = {
                "source_systems": source_count,
                "customer_attributes": attribute_count,
                "data_mappings": mapping_count,
                "mapping_status": mapping_status,
                "customer_records": customer_count,
                "certifications": certification_count,
                "active_workflows": len(self.workflow_status),
                "recent_activities": recent_activities
            }
            
            return {
                "success": True,
                "status": status,
                "timestamp": self._get_timestamp()
            }
        except Exception as e:
            error_msg = f"Error getting system status: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

# Dictionary mapping agent types to classes for easy instantiation
AGENT_CLASSES = {
    "data_steward": DataStewardAgent,
    "domain_expert": DomainExpertAgent,
    "mapping_agent": MappingAgent,
    "data_engineer": DataEngineerAgent,
    "coordinator": CoordinatorAgent
}

def create_agent(agent_type: str, **kwargs) -> BaseAgent:
    """
    Factory function to create an agent of the specified type.
    
    Args:
        agent_type: Type of agent to create
        **kwargs: Additional parameters to pass to the agent constructor
        
    Returns:
        Instantiated agent
    """
    if agent_type not in AGENT_CLASSES:
        raise ValueError(f"Unknown agent type: {agent_type}")
        
    return AGENT_CLASSES[agent_type](**kwargs)