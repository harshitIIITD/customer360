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
        return add_data_mapping(source_system_id, source_attribute, 
                              target_attribute_id, transformation_logic, created_by)
    
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
    
    def _calculate_similarity(self, source_name: str, target_name: str) -> float:
        """
        Calculate similarity between source and target attribute names.
        
        Args:
            source_name: Source attribute name
            target_name: Target attribute name
            
        Returns:
            Similarity score between 0 and 1
        """
        # Simple string matching for now
        # In a real system, use embeddings, edit distance, etc.
        
        if source_name == target_name:
            return 1.0
            
        # Check if one is contained in the other
        if source_name in target_name:
            return 0.8
            
        if target_name in source_name:
            return 0.7
            
        # Check for common substrings
        common_prefix_length = 0
        for i in range(min(len(source_name), len(target_name))):
            if source_name[i] == target_name[i]:
                common_prefix_length += 1
            else:
                break
                
        if common_prefix_length >= 3:
            return 0.5 + (common_prefix_length / max(len(source_name), len(target_name)) * 0.3)
            
        # Check for individual words
        source_words = set(source_name.split('_'))
        target_words = set(target_name.split('_'))
        
        common_words = source_words.intersection(target_words)
        
        if common_words:
            return 0.5 + (len(common_words) / max(len(source_words), len(target_words)) * 0.3)
            
        return 0.0
        
    def _generate_transformation_logic(self, source_attr: Dict[str, Any], 
                                     target_attr: Dict[str, Any]) -> str:
        """
        Generate transformation logic based on source and target attributes.
        
        Args:
            source_attr: Source attribute details
            target_attr: Target attribute details
            
        Returns:
            Transformation logic as Python code
        """
        source_name = source_attr.get("name")
        source_type = source_attr.get("data_type")
        target_type = target_attr.get("data_type")
        
        # Simple direct reference if column name in table.column format
        if "." in source_name:
            table_name, column_name = source_name.split(".")
            column_ref = f"df['{column_name}']"
        else:
            column_ref = f"df['{source_name}']"
            
        # Generate transformation based on target data type
        if target_type == "INTEGER":
            return f"pd.to_numeric({column_ref}, errors='coerce').astype('Int64')"
            
        elif target_type == "REAL":
            return f"pd.to_numeric({column_ref}, errors='coerce')"
            
        elif target_type == "DATE":
            return f"pd.to_datetime({column_ref}, errors='coerce')"
            
        elif target_type == "TEXT":
            if source_type in ["INTEGER", "REAL", "DECIMAL"]:
                return f"{column_ref}.astype(str)"
            else:
                return column_ref
                
        # Default: direct mapping
        return column_ref


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
            }
        ]
    
    def action_build_customer_360(self, include_pending: bool = False) -> Dict[str, Any]:
        """
        Build the Customer 360 view based on validated mappings.
        
        In a real system, this would involve an ETL process that:
        1. Extracts data from source systems
        2. Applies transformations based on mappings
        3. Loads data into the Customer 360 table
        
        For this demo, we'll simulate the process.
        
        Args:
            include_pending: Whether to include pending mappings
            
        Returns:
            Result of the build process
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get mappings based on status
            if include_pending:
                cursor.execute(
                    """
                    SELECT 
                        m.*, 
                        s.system_name,
                        ca.attribute_name,
                        ca.data_type
                    FROM data_mappings m
                    JOIN source_systems s ON m.source_system_id = s.id
                    JOIN customer_attributes ca ON m.target_attribute_id = ca.id
                    WHERE m.mapping_status IN ('validated', 'proposed')
                    """
                )
            else:
                cursor.execute(
                    """
                    SELECT 
                        m.*, 
                        s.system_name,
                        ca.attribute_name,
                        ca.data_type
                    FROM data_mappings m
                    JOIN source_systems s ON m.source_system_id = s.id
                    JOIN customer_attributes ca ON m.target_attribute_id = ca.id
                    WHERE m.mapping_status = 'validated'
                    """
                )
                
            mappings = [dict(row) for row in cursor.fetchall()]
            
            if not mappings:
                return {
                    "success": False,
                    "error": "No validated mappings found to build Customer 360"
                }
                
            # Simulate building the Customer 360 view
            
            # 1. Create a temporary in-memory customer data store
            customers_data = {}
            
            # 2. For each mapping, simulate extraction and transformation
            processed_count = 0
            error_count = 0
            
            for mapping in mappings:
                try:
                    # Get sample data for this mapping
                    source_id = mapping['source_system_id']
                    source_attr = mapping['source_attribute']
                    target_attr = mapping['attribute_name']
                    
                    sample_result = get_sample_data(source_id, source_attr)
                    
                    if not sample_result.get("success", False):
                        logger.warning(f"Failed to get sample data for {source_attr}")
                        error_count += 1
                        continue
                        
                    # Extract customer ID and values for the mapping
                    # In a real system, this would be much more sophisticated
                    # and would handle various customer ID resolution strategies
                    
                    # For demo purposes, assume first table has customer IDs
                    for sample in sample_result.get("sample_data", []):
                        # Generate a synthetic customer ID if this is from core banking
                        # In a real system, this would use proper identity resolution
                        if mapping['system_name'] == "CORE_BANKING" and "customer_id" in sample.get("column_name", ""):
                            customer_id = sample.get("sample_value", f"C{processed_count}")
                            
                            # Initialize customer record if needed
                            if customer_id not in customers_data:
                                customers_data[customer_id] = {
                                    "customer_id": customer_id,
                                    "data_sources": set([mapping['system_name']])
                                }
                            
                        # For any attribute mapping, add the value to the customer record
                        # This is a simplified approach for demonstration
                        if sample.get("column_name") == source_attr.split(".")[-1]:
                            # Apply transformation (simplified)
                            # In a real system, execute the transformation logic
                            
                            # Use default customer ID if we don't have one yet
                            default_id = f"C{len(customers_data) + 1}"
                            customer_id = next(iter(customers_data.keys()), default_id)
                            
                            # Initialize customer record if needed
                            if customer_id not in customers_data:
                                customers_data[customer_id] = {
                                    "customer_id": customer_id,
                                    "data_sources": set([mapping['system_name']])
                                }
                            
                            # Transform and add the value
                            value = self._apply_simple_transformation(
                                sample.get("sample_value"),
                                mapping['data_type']
                            )
                            
                            customers_data[customer_id][target_attr] = value
                            customers_data[customer_id]["data_sources"].add(mapping['system_name'])
                            
                    processed_count += 1
                    
                except Exception as e:
                    logger.error(f"Error processing mapping {mapping['id']}: {e}")
                    error_count += 1
            
            # Convert to final format and prepare for storage
            customer_records = []
            for customer_id, data in customers_data.items():
                # Convert data_sources set to JSON string
                data["data_sources"] = json.dumps(list(data["data_sources"]))
                customer_records.append(data)
            
            # 3. Insert into Customer 360 table
            # First, clear existing data
            cursor.execute("DELETE FROM customer_360")
            
            # Then insert new data
            for record in customer_records:
                # Build dynamic insert statement based on available fields
                fields = []
                placeholders = []
                values = []
                
                for key, value in record.items():
                    fields.append(key)
                    placeholders.append("?")
                    values.append(value)
                
                query = f"""
                    INSERT INTO customer_360 ({', '.join(fields)})
                    VALUES ({', '.join(placeholders)})
                """
                
                cursor.execute(query, values)
            
            # Commit changes
            conn.commit()
            conn.close()
            
            # Log the build activity
            self._log_interaction(
                "build_customer_360",
                f"Built Customer 360 with {len(customer_records)} customers",
                f"Processed {processed_count} mappings with {error_count} errors"
            )
            
            return {
                "success": True,
                "customer_count": len(customer_records),
                "mappings_processed": processed_count,
                "error_count": error_count,
                "message": f"Customer 360 built with {len(customer_records)} customer records"
            }
            
        except Exception as e:
            error_msg = f"Error building Customer 360: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def action_get_customer_360_data(self, limit: int = 100, 
                                   filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Get data from the Customer 360 view.
        
        Args:
            limit: Maximum number of records to return
            filters: Optional filters to apply
            
        Returns:
            Customer 360 data
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Build query based on filters
            query = "SELECT * FROM customer_360 WHERE 1=1"
            params = []
            
            if filters:
                for field, value in filters.items():
                    if field in self._get_customer_360_columns():
                        query += f" AND {field} = ?"
                        params.append(value)
            
            query += f" LIMIT {limit}"
            
            cursor.execute(query, params)
            customers = [dict(row) for row in cursor.fetchall()]
            
            conn.close()
            
            return {
                "success": True,
                "customers": customers,
                "count": len(customers),
                "limit": limit
            }
        except Exception as e:
            error_msg = f"Error getting Customer 360 data: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def action_get_data_quality_metrics(self) -> Dict[str, Any]:
        """
        Get data quality metrics for the Customer 360 view.
        
        Returns:
            Data quality metrics
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get Customer 360 columns
            columns = self._get_customer_360_columns()
            
            # Calculate metrics for each column
            metrics = {}
            
            cursor.execute("SELECT COUNT(*) as total FROM customer_360")
            total_rows = cursor.fetchone()['total']
            
            for column in columns:
                # Skip data_sources column
                if column == 'data_sources':
                    continue
                    
                # Count non-null values
                cursor.execute(f"SELECT COUNT(*) as count FROM customer_360 WHERE {column} IS NOT NULL")
                non_null_count = cursor.fetchone()['count']
                
                # Calculate completeness
                completeness = (non_null_count / total_rows) * 100 if total_rows > 0 else 0
                
                # Count distinct values
                cursor.execute(f"SELECT COUNT(DISTINCT {column}) as count FROM customer_360")
                distinct_count = cursor.fetchone()['count']
                
                metrics[column] = {
                    "completeness": round(completeness, 2),
                    "non_null_count": non_null_count,
                    "distinct_count": distinct_count,
                    "total_rows": total_rows
                }
            
            conn.close()
            
            return {
                "success": True,
                "metrics": metrics,
                "total_rows": total_rows
            }
        except Exception as e:
            error_msg = f"Error getting data quality metrics: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def action_get_data_lineage(self, attribute: Optional[str] = None) -> Dict[str, Any]:
        """
        Get data lineage for Customer 360 attributes.
        
        Args:
            attribute: Optional attribute to filter by
            
        Returns:
            Data lineage information
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Build query based on attribute filter
            query = """
                SELECT 
                    m.id, 
                    s.system_name as source_system,
                    m.source_attribute,
                    ca.attribute_name as target_attribute,
                    m.transformation_logic,
                    m.mapping_status
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
            
            conn.close()
            
            # Group by target attribute
            lineage_by_attribute = {}
            
            for mapping in lineage:
                target = mapping['target_attribute']
                
                if target not in lineage_by_attribute:
                    lineage_by_attribute[target] = []
                    
                lineage_by_attribute[target].append({
                    "mapping_id": mapping['id'],
                    "source_system": mapping['source_system'],
                    "source_attribute": mapping['source_attribute'],
                    "transformation_logic": mapping['transformation_logic'],
                    "status": mapping['mapping_status']
                })
            
            return {
                "success": True,
                "lineage": lineage_by_attribute,
                "attribute_count": len(lineage_by_attribute)
            }
        except Exception as e:
            error_msg = f"Error getting data lineage: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
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