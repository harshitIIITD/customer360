"""
Specialized Agents for Customer 360 Agentic Solution

This module defines various specialized agents for handling different aspects
of the Customer 360 data product.
"""

from typing import Dict, List, Any, Optional
import json
import sqlite3
from pathlib import Path
import os
import sys
import logging
import re
from datetime import datetime

# Add project root to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from agents.base_agent import BaseAgent
from database.setup_db import get_db_connection

# Configure logging
logger = logging.getLogger(__name__)

class DataStewardAgent(BaseAgent):
    """
    Data Steward Agent responsible for identifying, validating, and 
    maintaining data source information.
    """
    
    def __init__(self, model_name: str = "llama3"):
        super().__init__(
            name="Data Steward Agent",
            description="identifying, validating, and documenting data sources",
            model_name=model_name
        )
        
    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run the data steward agent's functionality.
        
        Expected inputs:
        - action: 'identify_sources', 'validate_source', or 'document_source'
        - source_details: Dict with source system details (for validate and document)
        - source_id: ID of the source system (for validate)
        
        Returns:
            Dict containing the agent's outputs
        """
        action = inputs.get('action')
        
        if action == 'identify_sources':
            return self._identify_sources()
        elif action == 'validate_source':
            return self._validate_source(inputs.get('source_details', {}), 
                                        inputs.get('source_id'))
        elif action == 'document_source':
            return self._document_source(inputs.get('source_details', {}))
        else:
            error_msg = f"Unknown action: {action}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}
            
    def _identify_sources(self) -> Dict[str, Any]:
        """Identify all available data sources from the database"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM source_systems")
            sources = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            self.log_interaction("identify_sources", "Retrieved all source systems", 
                                 f"Found {len(sources)} sources")
            
            return {
                "success": True, 
                "sources": sources,
                "message": f"Found {len(sources)} data sources"
            }
        except Exception as e:
            error_msg = f"Error identifying sources: {e}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def _validate_source(self, source_details: Dict[str, Any], source_id: int) -> Dict[str, Any]:
        """Validate a data source system"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get the source details from the database
            cursor.execute("SELECT * FROM source_systems WHERE id = ?", (source_id,))
            source = cursor.fetchone()
            
            if not source:
                return {"success": False, "error": f"Source with ID {source_id} not found"}
            
            # Basic validation rules (could be expanded)
            validation_issues = []
            if not source_details.get('system_name'):
                validation_issues.append("Missing system name")
            if not source_details.get('description'):
                validation_issues.append("Missing description")
            if not source_details.get('data_owner'):
                validation_issues.append("Missing data owner")
            
            is_valid = len(validation_issues) == 0
            
            # Update the last_updated timestamp
            cursor.execute(
                "UPDATE source_systems SET last_updated = CURRENT_TIMESTAMP WHERE id = ?",
                (source_id,)
            )
            conn.commit()
            conn.close()
            
            self.log_interaction(
                "validate_source", 
                f"Validated source {source_id}", 
                f"Valid: {is_valid}, Issues: {', '.join(validation_issues) if validation_issues else 'None'}"
            )
            
            return {
                "success": True,
                "is_valid": is_valid,
                "validation_issues": validation_issues,
                "message": ("Source is valid" if is_valid 
                           else f"Source has issues: {', '.join(validation_issues)}")
            }
        except Exception as e:
            error_msg = f"Error validating source: {e}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}
            
    def _document_source(self, source_details: Dict[str, Any]) -> Dict[str, Any]:
        """Document a new data source or update an existing one"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Check if the source already exists
            cursor.execute(
                "SELECT id FROM source_systems WHERE system_name = ?", 
                (source_details.get('system_name'),)
            )
            existing_source = cursor.fetchone()
            
            if existing_source:
                # Update existing source
                cursor.execute(
                    """
                    UPDATE source_systems
                    SET description = ?, connection_details = ?, data_owner = ?, last_updated = CURRENT_TIMESTAMP
                    WHERE system_name = ?
                    """,
                    (
                        source_details.get('description', ''),
                        source_details.get('connection_details', ''),
                        source_details.get('data_owner', ''),
                        source_details.get('system_name')
                    )
                )
                source_id = existing_source['id']
                message = f"Updated existing source: {source_details.get('system_name')}"
            else:
                # Insert new source
                cursor.execute(
                    """
                    INSERT INTO source_systems (system_name, description, connection_details, data_owner)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        source_details.get('system_name', ''),
                        source_details.get('description', ''),
                        source_details.get('connection_details', ''),
                        source_details.get('data_owner', '')
                    )
                )
                source_id = cursor.lastrowid
                message = f"Added new source: {source_details.get('system_name')}"
            
            conn.commit()
            conn.close()
            
            self.log_interaction("document_source", json.dumps(source_details), message)
            
            return {
                "success": True,
                "source_id": source_id,
                "message": message
            }
        except Exception as e:
            error_msg = f"Error documenting source: {e}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}


class DomainExpertAgent(BaseAgent):
    """
    Domain Expert Agent responsible for providing business context 
    and requirements for the Customer 360 data product.
    """
    
    def __init__(self, model_name: str = "llama3"):
        super().__init__(
            name="Domain Expert Agent",
            description="providing business context and requirements for banking data",
            model_name=model_name
        )
        
    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run the domain expert agent's functionality.
        
        Expected inputs:
        - action: 'define_requirements', 'validate_attribute', or 'suggest_improvements'
        - attribute_details: Dict with attribute details (for validate_attribute)
        - attribute_id: ID of the attribute (for validate_attribute)
        - data_product_details: Dict with current data product details (for suggest_improvements)
        
        Returns:
            Dict containing the agent's outputs
        """
        action = inputs.get('action')
        
        if action == 'define_requirements':
            return self._define_requirements()
        elif action == 'validate_attribute':
            return self._validate_attribute(
                inputs.get('attribute_details', {}), 
                inputs.get('attribute_id')
            )
        elif action == 'suggest_improvements':
            return self._suggest_improvements(inputs.get('data_product_details', {}))
        else:
            error_msg = f"Unknown action: {action}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def _define_requirements(self) -> Dict[str, Any]:
        """Define business requirements for the Customer 360 data product"""
        # In a real system, this would involve LLM interactions with stored banking domain knowledge
        # For this example, we'll return predefined banking domain requirements
        
        banking_requirements = [
            {
                "category": "Customer Identity",
                "attributes": ["customer_id", "first_name", "last_name", "date_of_birth"],
                "importance": "Critical",
                "description": "Core identity attributes needed for customer identification"
            },
            {
                "category": "Contact Information",
                "attributes": ["email", "phone", "address", "city", "state", "zip_code"],
                "importance": "High",
                "description": "Contact details for customer communications"
            },
            {
                "category": "Financial Profile",
                "attributes": ["credit_score", "income_bracket", "risk_profile", "lifetime_value"],
                "importance": "High", 
                "description": "Financial indicators for product recommendations and risk assessment"
            },
            {
                "category": "Behavioral Data",
                "attributes": ["preferred_channel", "last_interaction_date", "segment"],
                "importance": "Medium",
                "description": "Customer behavior data for personalization"
            }
        ]
        
        self.log_interaction(
            "define_requirements", 
            "Defined business requirements for Customer 360", 
            f"Defined {len(banking_requirements)} requirement categories"
        )
        
        return {
            "success": True,
            "requirements": banking_requirements,
            "message": "Retrieved banking domain requirements for Customer 360"
        }
    
    def _validate_attribute(self, attribute_details: Dict[str, Any], attribute_id: int) -> Dict[str, Any]:
        """Validate a customer attribute from a business perspective"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get the attribute details from the database
            cursor.execute("SELECT * FROM customer_attributes WHERE id = ?", (attribute_id,))
            attribute = cursor.fetchone()
            conn.close()
            
            if not attribute:
                return {"success": False, "error": f"Attribute with ID {attribute_id} not found"}
            
            # Domain-specific validation (could be expanded with LLM)
            attribute_name = attribute['attribute_name']
            data_type = attribute['data_type']
            
            validation_issues = []
            
            # Apply domain-specific validation rules
            if attribute_name == 'email' and data_type != 'TEXT':
                validation_issues.append("Email should be TEXT type")
            
            if attribute_name == 'credit_score' and data_type != 'INTEGER':
                validation_issues.append("Credit score should be INTEGER type")
                
            if attribute_name == 'date_of_birth' and data_type != 'DATE':
                validation_issues.append("Date of birth should be DATE type")
                
            # Check if sensitive data is properly marked
            sensitive_attributes = ['customer_id', 'first_name', 'last_name', 'date_of_birth', 
                                   'email', 'phone', 'address']
            
            if attribute_name in sensitive_attributes and not attribute['is_pii']:
                validation_issues.append(f"{attribute_name} should be marked as PII")
                
            is_valid = len(validation_issues) == 0
            
            self.log_interaction(
                "validate_attribute", 
                f"Validated attribute {attribute_id} ({attribute_name})", 
                f"Valid: {is_valid}, Issues: {', '.join(validation_issues) if validation_issues else 'None'}"
            )
            
            return {
                "success": True,
                "is_valid": is_valid,
                "validation_issues": validation_issues,
                "message": f"Attribute {attribute_name} is {'valid' if is_valid else 'invalid'}"
            }
        except Exception as e:
            error_msg = f"Error validating attribute: {e}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}
            
    def _suggest_improvements(self, data_product_details: Dict[str, Any]) -> Dict[str, Any]:
        """Suggest improvements to the Customer 360 data product"""
        # In a real implementation, this would use LLM to analyze the current state
        # and suggest improvements based on banking industry knowledge
        
        # For this example, we'll return some predefined suggestions
        suggestions = [
            {
                "category": "Financial Health",
                "attributes": ["spending_pattern", "saving_ratio", "investment_profile"],
                "description": "Add attributes to track customer financial health indicators"
            },
            {
                "category": "Product Recommendations",
                "attributes": ["next_best_offer", "propensity_scores"],
                "description": "Include propensity scores for various banking products"
            },
            {
                "category": "Relationship Data",
                "attributes": ["household_id", "related_accounts"],
                "description": "Add household relationships to enable family-based offerings"
            }
        ]
        
        self.log_interaction(
            "suggest_improvements",
            "Generated improvement suggestions for Customer 360",
            f"Suggested {len(suggestions)} improvement categories"
        )
        
        return {
            "success": True,
            "suggestions": suggestions,
            "message": "Generated improvement suggestions for the data product"
        }


class DataEngineerAgent(BaseAgent):
    """
    Data Engineer Agent responsible for implementing data extraction, 
    transformation, and loading (ETL) processes.
    """
    
    def __init__(self, model_name: str = "llama3"):
        super().__init__(
            name="Data Engineer Agent",
            description="implementing data extraction, transformation, and loading processes",
            model_name=model_name
        )
        
    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run the data engineer agent's functionality.
        
        Expected inputs:
        - action: 'generate_etl_code', 'validate_transformation', or 'execute_etl'
        - source_id: ID of the source system
        - mapping_details: Dict with mapping details
        - transformation_code: Code for the transformation (for validate_transformation)
        
        Returns:
            Dict containing the agent's outputs
        """
        action = inputs.get('action')
        
        if action == 'generate_etl_code':
            return self._generate_etl_code(inputs.get('source_id'), inputs.get('mapping_details', {}))
        elif action == 'validate_transformation':
            return self._validate_transformation(inputs.get('transformation_code', ''))
        elif action == 'execute_etl':
            return self._execute_etl(inputs.get('source_id'), inputs.get('mapping_details', {}))
        else:
            error_msg = f"Unknown action: {action}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def _generate_etl_code(self, source_id: int, mapping_details: Dict[str, Any]) -> Dict[str, Any]:
        """Generate ETL code for a data source based on mappings"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get source system details
            cursor.execute("SELECT * FROM source_systems WHERE id = ?", (source_id,))
            source = cursor.fetchone()
            
            if not source:
                return {"success": False, "error": f"Source with ID {source_id} not found"}
            
            # Get mappings for this source
            cursor.execute("""
                SELECT m.*, ca.attribute_name, ca.data_type 
                FROM data_mappings m
                JOIN customer_attributes ca ON m.target_attribute_id = ca.id
                WHERE m.source_system_id = ?
            """, (source_id,))
            
            mappings = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            if not mappings:
                return {"success": False, "error": f"No mappings found for source ID {source_id}"}
            
            # Generate Python code for the ETL process
            # In a real implementation, this would be more sophisticated and use LLM for code generation
            source_name = source['system_name']
            
            etl_code = f"""
import pandas as pd
import sqlite3
from datetime import datetime

def extract_from_{source_name.lower()}():
    \"\"\"
    Extract data from the {source_name} system.
    
    Returns:
        DataFrame containing the extracted data
    \"\"\"
    # TODO: Implement actual extraction from source system
    # This is a placeholder for demonstration
    
    # Mock data for demonstration
    data = {{
"""
            
            # Add sample data columns based on mappings
            for mapping in mappings:
                source_attr = mapping['source_attribute']
                etl_code += f"        '{source_attr}': ['sample_value_1', 'sample_value_2', 'sample_value_3'],\n"
                
            etl_code += """    }
    
    return pd.DataFrame(data)

def transform_data(df):
    \"\"\"
    Transform data according to the defined mappings.
    
    Args:
        df: DataFrame with source data
        
    Returns:
        Transformed DataFrame ready for loading
    \"\"\"
    result_df = pd.DataFrame()
    
"""
            
            # Add transformation logic based on mappings
            for mapping in mappings:
                source_attr = mapping['source_attribute']
                target_attr = mapping['attribute_name']
                transformation = mapping['transformation_logic'] or f"df['{source_attr}']"
                
                etl_code += f"""    # Transform {source_attr} to {target_attr}
    try:
        result_df['{target_attr}'] = {transformation}
    except Exception as e:
        print(f"Error transforming {source_attr} to {target_attr}: {{e}}")
        result_df['{target_attr}'] = None
        
"""
            
            etl_code += """
    return result_df

def load_data(df):
    \"\"\"
    Load transformed data into the Customer 360 database.
    
    Args:
        df: Transformed DataFrame ready for loading
        
    Returns:
        Number of records loaded
    \"\"\"
    conn = sqlite3.connect('data/customer360.db')
    
    # Update or insert records
    records_loaded = 0
    for _, row in df.iterrows():
        try:
            # Check if customer exists
            cust_id = row.get('customer_id')
            if pd.isna(cust_id):
                continue
                
            cursor = conn.cursor()
            cursor.execute("SELECT customer_id FROM customer_360 WHERE customer_id = ?", (cust_id,))
            exists = cursor.fetchone()
            
            if exists:
                # Update existing customer - dynamically build SQL
                update_cols = [f"{col} = ?" for col in df.columns if col != 'customer_id']
                update_vals = [row[col] for col in df.columns if col != 'customer_id']
                update_vals.append(cust_id)  # For WHERE clause
                
                update_sql = f"UPDATE customer_360 SET {', '.join(update_cols)} WHERE customer_id = ?"
                cursor.execute(update_sql, update_vals)
            else:
                # Insert new customer
                cols = ", ".join(df.columns)
                placeholders = ", ".join(["?" for _ in df.columns])
                values = [row[col] for col in df.columns]
                
                insert_sql = f"INSERT INTO customer_360 ({cols}) VALUES ({placeholders})"
                cursor.execute(insert_sql, values)
                
            records_loaded += 1
            
        except Exception as e:
            print(f"Error loading record: {e}")
            continue
    
    conn.commit()
    conn.close()
    
    return records_loaded

def run_etl_process():
    \"\"\"
    Run the full ETL process.
    
    Returns:
        Summary of ETL results
    \"\"\"
    print(f"Starting ETL from {source_name} at {datetime.now()}")
    
    # Extract
    source_df = extract_from_{source_name.lower()}()
    print(f"Extracted {len(source_df)} records")
    
    # Transform
    transformed_df = transform_data(source_df)
    print(f"Transformed data to {len(transformed_df.columns)} target columns")
    
    # Load
    records_loaded = load_data(transformed_df)
    print(f"Loaded {records_loaded} records into Customer 360")
    
    return {
        "records_extracted": len(source_df),
        "records_loaded": records_loaded,
        "execution_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

if __name__ == "__main__":
    results = run_etl_process()
    print(f"ETL Results: {results}")
"""
            
            self.log_interaction(
                "generate_etl_code",
                f"Generated ETL code for source {source_id} ({source_name})",
                f"Created ETL code with {len(mappings)} mappings"
            )
            
            return {
                "success": True,
                "source_name": source_name,
                "etl_code": etl_code,
                "message": f"Generated ETL code for {source_name} with {len(mappings)} mappings"
            }
            
        except Exception as e:
            error_msg = f"Error generating ETL code: {e}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def _validate_transformation(self, transformation_code: str) -> Dict[str, Any]:
        """Validate a transformation code snippet"""
        # In a real implementation, this would use LLM to analyze and validate the code
        # For this example, we'll do some basic checks
        
        validation_issues = []
        
        # Check for common issues
        if "df[" not in transformation_code and "lambda" not in transformation_code:
            validation_issues.append("No DataFrame operations found")
            
        if transformation_code.count("(") != transformation_code.count(")"):
            validation_issues.append("Unbalanced parentheses")
            
        dangerous_funcs = ["eval(", "exec(", "os.system(", "subprocess"]
        for func in dangerous_funcs:
            if func in transformation_code:
                validation_issues.append(f"Potentially unsafe function: {func}")
                
        is_valid = len(validation_issues) == 0
        
        self.log_interaction(
            "validate_transformation",
            "Validated transformation code",
            f"Valid: {is_valid}, Issues: {', '.join(validation_issues) if validation_issues else 'None'}"
        )
        
        return {
            "success": True,
            "is_valid": is_valid,
            "validation_issues": validation_issues,
            "message": "Transformation code is valid" if is_valid else "Transformation code has issues"
        }
    
    def _execute_etl(self, source_id: int, mapping_details: Dict[str, Any]) -> Dict[str, Any]:
        """Execute ETL process for a data source"""
        # In a real implementation, this would actually execute the ETL code
        # For this example, we'll simulate the execution
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get source system details
            cursor.execute("SELECT * FROM source_systems WHERE id = ?", (source_id,))
            source = cursor.fetchone()
            
            if not source:
                return {"success": False, "error": f"Source with ID {source_id} not found"}
                
            # Get count of mappings
            cursor.execute("""
                SELECT COUNT(*) FROM data_mappings
                WHERE source_system_id = ?
            """, (source_id,))
            
            mapping_count = cursor.fetchone()[0]
            
            # Simulate ETL execution results
            import random
            records_extracted = random.randint(100, 1000)
            records_loaded = int(records_extracted * random.uniform(0.9, 1.0))  # 90-100% success rate
            execution_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Log the ETL execution in the database
            cursor.execute(
                """
                INSERT INTO agent_interactions (agent_name, action_type, details, result)
                VALUES (?, ?, ?, ?)
                """,
                (
                    self.name, 
                    f"execute_etl_{source['system_name']}", 
                    f"Executed ETL for source {source_id} ({source['system_name']})",
                    json.dumps({
                        "records_extracted": records_extracted,
                        "records_loaded": records_loaded,
                        "execution_time": execution_time
                    })
                )
            )
            conn.commit()
            conn.close()
            
            return {
                "success": True,
                "source_name": source['system_name'],
                "records_extracted": records_extracted,
                "records_loaded": records_loaded,
                "execution_time": execution_time,
                "message": f"ETL executed for {source['system_name']}: {records_loaded}/{records_extracted} records loaded"
            }
            
        except Exception as e:
            error_msg = f"Error executing ETL: {e}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}


class MappingAgent(BaseAgent):
    """
    Mapping Agent responsible for automating the creation of 
    source-to-target attribute mapping.
    """
    
    def __init__(self, model_name: str = "llama3"):
        super().__init__(
            name="Mapping Agent",
            description="automating source-to-target data attribute mapping",
            model_name=model_name
        )
        
    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run the mapping agent's functionality.
        
        Expected inputs:
        - action: 'suggest_mappings', 'validate_mapping', or 'store_mapping'
        - source_id: ID of the source system
        - source_attributes: List of source attributes for mapping suggestions
        - mapping_details: Dict with mapping details (for validate_mapping and store_mapping)
        
        Returns:
            Dict containing the agent's outputs
        """
        action = inputs.get('action')
        
        if action == 'suggest_mappings':
            return self._suggest_mappings(
                inputs.get('source_id'), 
                inputs.get('source_attributes', [])
            )
        elif action == 'validate_mapping':
            return self._validate_mapping(inputs.get('mapping_details', {}))
        elif action == 'store_mapping':
            return self._store_mapping(inputs.get('mapping_details', {}))
        else:
            error_msg = f"Unknown action: {action}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def _suggest_mappings(self, source_id: int, source_attributes: List[str]) -> Dict[str, Any]:
        """Suggest mappings from source attributes to target attributes"""
        try:
            if not source_attributes:
                return {"success": False, "error": "No source attributes provided"}
                
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get source system details
            cursor.execute("SELECT * FROM source_systems WHERE id = ?", (source_id,))
            source = cursor.fetchone()
            
            if not source:
                return {"success": False, "error": f"Source with ID {source_id} not found"}
                
            # Get all target attributes
            cursor.execute("SELECT * FROM customer_attributes")
            target_attributes = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            # In a real system, this would use LLM to make intelligent mapping suggestions
            # For this example, we'll use simple name matching heuristics
            
            suggested_mappings = []
            
            for source_attr in source_attributes:
                best_match = None
                best_score = 0
                
                # Normalize source attribute name
                norm_source_attr = source_attr.lower().replace('_', ' ')
                
                for target_attr in target_attributes:
                    target_name = target_attr['attribute_name']
                    # Normalize target attribute name
                    norm_target_name = target_name.lower().replace('_', ' ')
                    
                    # Calculate simple similarity score
                    # In a real implementation, this would use more sophisticated techniques
                    # like word embeddings, Levenshtein distance, etc.
                    
                    # Check for exact matches first
                    if norm_source_attr == norm_target_name:
                        score = 1.0
                    # Check for partial matches
                    elif norm_source_attr in norm_target_name or norm_target_name in norm_source_attr:
                        score = 0.8
                    # Check for word-level matches
                    else:
                        source_words = set(norm_source_attr.split())
                        target_words = set(norm_target_name.split())
                        common_words = source_words.intersection(target_words)
                        
                        if common_words:
                            score = len(common_words) / max(len(source_words), len(target_words))
                        else:
                            score = 0
                    
                    if score > best_score:
                        best_score = score
                        best_match = target_attr
                
                # Only suggest mappings with a reasonable confidence score
                if best_score >= 0.3:
                    suggested_mappings.append({
                        "source_attribute": source_attr,
                        "target_attribute_id": best_match['id'],
                        "target_attribute_name": best_match['attribute_name'],
                        "confidence": best_score,
                        "transformation_logic": (f"df['{source_attr}']" if best_score > 0.7 
                                                else f"# Transform {source_attr} to {best_match['attribute_name']}\n# df['{source_attr}']")
                    })
            
            self.log_interaction(
                "suggest_mappings",
                f"Generated mapping suggestions for source {source_id} ({source['system_name']})",
                f"Suggested {len(suggested_mappings)} mappings out of {len(source_attributes)} source attributes"
            )
            
            return {
                "success": True,
                "source_name": source['system_name'],
                "suggested_mappings": suggested_mappings,
                "message": f"Suggested {len(suggested_mappings)} mappings out of {len(source_attributes)} source attributes"
            }
        except Exception as e:
            error_msg = f"Error suggesting mappings: {e}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def _validate_mapping(self, mapping_details: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a proposed mapping"""
        # Check for required fields
        required_fields = ['source_system_id', 'source_attribute', 'target_attribute_id', 'transformation_logic']
        missing_fields = [field for field in required_fields if field not in mapping_details]
        
        if missing_fields:
            return {
                "success": False, 
                "error": f"Missing required mapping fields: {', '.join(missing_fields)}"
            }
            
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Check if source system exists
            cursor.execute(
                "SELECT id FROM source_systems WHERE id = ?", 
                (mapping_details['source_system_id'],)
            )
            if not cursor.fetchone():
                return {
                    "success": False, 
                    "error": f"Source system with ID {mapping_details['source_system_id']} not found"
                }
                
            # Check if target attribute exists
            cursor.execute(
                "SELECT id, data_type FROM customer_attributes WHERE id = ?", 
                (mapping_details['target_attribute_id'],)
            )
            target_attr = cursor.fetchone()
            if not target_attr:
                return {
                    "success": False, 
                    "error": f"Target attribute with ID {mapping_details['target_attribute_id']} not found"
                }
                
            # Validate transformation logic
            transformation = mapping_details['transformation_logic']
            validation_issues = []
            
            # Basic syntax checks
            if "df[" in transformation and "]" not in transformation:
                validation_issues.append("Missing closing bracket in DataFrame access")
            
            # Check for potentially harmful operations in the transformation
            dangerous_patterns = ["exec(", "eval(", "os.", "subprocess", "system("]
            for pattern in dangerous_patterns:
                if pattern in transformation:
                    validation_issues.append(f"Potentially harmful operation: {pattern}")
            
            # Check for reasonable transformation length
            if len(transformation.strip()) < 5:
                validation_issues.append("Transformation logic is too short")
                
            # Validate data type compatibility (simplified)
            if "int" in transformation.lower() and target_attr['data_type'] not in ['INTEGER', 'REAL']:
                validation_issues.append(f"Integer operation for non-numeric target type: {target_attr['data_type']}")
                
            # Check for duplicate mappings
            cursor.execute(
                """
                SELECT id FROM data_mappings 
                WHERE source_system_id = ? AND target_attribute_id = ? AND id != ?
                """,
                (
                    mapping_details['source_system_id'],
                    mapping_details['target_attribute_id'],
                    mapping_details.get('id', -1)
                )
            )
            if cursor.fetchone():
                validation_issues.append("Duplicate mapping exists for this target attribute")
            
            conn.close()
            
            is_valid = len(validation_issues) == 0
            
            self.log_interaction(
                "validate_mapping",
                f"Validated mapping from {mapping_details['source_attribute']} to attribute ID {mapping_details['target_attribute_id']}",
                f"Valid: {is_valid}, Issues: {', '.join(validation_issues) if validation_issues else 'None'}"
            )
            
            return {
                "success": True,
                "is_valid": is_valid,
                "validation_issues": validation_issues,
                "message": "Mapping is valid" if is_valid else f"Mapping has issues: {', '.join(validation_issues)}"
            }
        except Exception as e:
            error_msg = f"Error validating mapping: {e}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def _store_mapping(self, mapping_details: Dict[str, Any]) -> Dict[str, Any]:
        """Store a mapping in the database"""
        # Validate the mapping first
        validation_result = self._validate_mapping(mapping_details)
        if not validation_result.get('success', False) or not validation_result.get('is_valid', False):
            return validation_result
            
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Check if mapping already exists
            if 'id' in mapping_details and mapping_details['id']:
                # Update existing mapping
                cursor.execute(
                    """
                    UPDATE data_mappings
                    SET source_attribute = ?, target_attribute_id = ?,
                        transformation_logic = ?, mapping_status = ?,
                        created_by = ?
                    WHERE id = ?
                    """,
                    (
                        mapping_details['source_attribute'],
                        mapping_details['target_attribute_id'],
                        mapping_details['transformation_logic'],
                        mapping_details.get('mapping_status', 'proposed'),
                        mapping_details.get('created_by', self.name),
                        mapping_details['id']
                    )
                )
                mapping_id = mapping_details['id']
                message = f"Updated mapping with ID {mapping_id}"
            else:
                # Insert new mapping
                cursor.execute(
                    """
                    INSERT INTO data_mappings
                    (source_system_id, source_attribute, target_attribute_id,
                     transformation_logic, mapping_status, created_by)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        mapping_details['source_system_id'],
                        mapping_details['source_attribute'],
                        mapping_details['target_attribute_id'],
                        mapping_details['transformation_logic'],
                        mapping_details.get('mapping_status', 'proposed'),
                        mapping_details.get('created_by', self.name)
                    )
                )
                mapping_id = cursor.lastrowid
                message = f"Created new mapping with ID {mapping_id}"
            
            conn.commit()
            
            # Get target attribute name for the response
            cursor.execute(
                "SELECT attribute_name FROM customer_attributes WHERE id = ?",
                (mapping_details['target_attribute_id'],)
            )
            target_name = cursor.fetchone()['attribute_name']
            conn.close()
            
            self.log_interaction(
                "store_mapping",
                f"Stored mapping from {mapping_details['source_attribute']} to {target_name}",
                message
            )
            
            return {
                "success": True,
                "mapping_id": mapping_id,
                "message": message
            }
        except Exception as e:
            error_msg = f"Error storing mapping: {e}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}


class CertificationAgent(BaseAgent):
    """
    Certification Agent responsible for facilitating and
    documenting the data product certification process.
    """
    
    def __init__(self, model_name: str = "llama3"):
        super().__init__(
            name="Certification Agent",
            description="facilitating and documenting the data product certification process",
            model_name=model_name
        )
        
    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run the certification agent's functionality.
        
        Expected inputs:
        - action: 'create_certification', 'check_status', or 'generate_report'
        - certification_type: Type of certification (data quality, compliance, business value)
        - certification_id: ID of the certification (for check_status)
        - cert_data: Dict with certification data (for create_certification)
        
        Returns:
            Dict containing the agent's outputs
        """
        action = inputs.get('action')
        
        if action == 'create_certification':
            return self._create_certification(
                inputs.get('certification_type'), 
                inputs.get('cert_data', {})
            )
        elif action == 'check_status':
            return self._check_status(inputs.get('certification_id'))
        elif action == 'generate_report':
            return self._generate_report()
        else:
            error_msg = f"Unknown action: {action}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def _create_certification(self, certification_type: str, cert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new certification request"""
        if not certification_type:
            return {"success": False, "error": "Certification type is required"}
            
        valid_types = ['data_quality', 'compliance', 'business_value']
        if certification_type not in valid_types:
            return {
                "success": False, 
                "error": f"Invalid certification type. Must be one of: {', '.join(valid_types)}"
            }
            
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Insert new certification
            cursor.execute(
                """
                INSERT INTO certifications
                (certification_type, certification_status, notes)
                VALUES (?, 'pending', ?)
                """,
                (certification_type, cert_data.get('notes', ''))
            )
            
            certification_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            # Set expiry date (6 months from now)
            from datetime import datetime, timedelta
            expiry_date = (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d")
            
            self.log_interaction(
                "create_certification",
                f"Created {certification_type} certification request",
                f"Created certification ID {certification_id}"
            )
            
            return {
                "success": True,
                "certification_id": certification_id,
                "certification_type": certification_type,
                "status": "pending",
                "expiry_date": expiry_date,
                "message": f"Created {certification_type} certification request (ID: {certification_id})"
            }
        except Exception as e:
            error_msg = f"Error creating certification: {e}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def _check_status(self, certification_id: int) -> Dict[str, Any]:
        """Check the status of a certification"""
        if not certification_id:
            return {"success": False, "error": "Certification ID is required"}
            
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM certifications WHERE id = ?", (certification_id,))
            certification = cursor.fetchone()
            conn.close()
            
            if not certification:
                return {"success": False, "error": f"Certification with ID {certification_id} not found"}
                
            self.log_interaction(
                "check_status",
                f"Checked status of certification ID {certification_id}",
                f"Status: {certification['certification_status']}"
            )
            
            return {
                "success": True,
                "certification": dict(certification),
                "message": f"Certification status: {certification['certification_status']}"
            }
        except Exception as e:
            error_msg = f"Error checking certification status: {e}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def _generate_report(self) -> Dict[str, Any]:
        """Generate a certification status report"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get certification statistics
            cursor.execute(
                "SELECT certification_type, certification_status, COUNT(*) as count FROM certifications GROUP BY certification_type, certification_status"
            )
            cert_stats = [dict(row) for row in cursor.fetchall()]
            
            # Get recent certifications
            cursor.execute(
                "SELECT * FROM certifications ORDER BY created_at DESC LIMIT 5"
            )
            recent_certs = [dict(row) for row in cursor.fetchall()]
            
            # Get expiring certifications
            cursor.execute(
                "SELECT * FROM certifications WHERE certification_status = 'certified' AND expiry_date <= date('now', '+30 days') ORDER BY expiry_date"
            )
            expiring_certs = [dict(row) for row in cursor.fetchall()]
            
            conn.close()
            
            report = {
                "statistics": cert_stats,
                "recent_certifications": recent_certs,
                "expiring_certifications": expiring_certs,
                "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "summary": {
                    "total": sum(stat['count'] for stat in cert_stats),
                    "certified": sum(stat['count'] for stat in cert_stats if stat['certification_status'] == 'certified'),
                    "pending": sum(stat['count'] for stat in cert_stats if stat['certification_status'] == 'pending'),
                    "rejected": sum(stat['count'] for stat in cert_stats if stat['certification_status'] == 'rejected'),
                    "expiring_soon": len(expiring_certs)
                }
            }
            
            self.log_interaction(
                "generate_report",
                "Generated certification status report",
                f"Report includes {report['summary']['total']} certifications"
            )
            
            return {
                "success": True,
                "report": report,
                "message": f"Generated certification report with {report['summary']['total']} certifications"
            }
        except Exception as e:
            error_msg = f"Error generating certification report: {e}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}