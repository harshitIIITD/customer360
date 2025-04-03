"""
Mapping Validator Tool

This tool validates data mappings between source and target attributes,
ensuring data quality and consistency in the Customer 360 solution.
"""

import logging
import json
import re
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import sys
import sqlite3

# Add project root to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from database.setup_db import get_db_connection
from tools.data_source_scanner import get_sample_data

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MappingValidator:
    """
    Tool for validating data mappings between source and target attributes.
    """
    
    def __init__(self):
        """Initialize the mapping validator"""
        self.logger = logging.getLogger("MappingValidator")
        
    def validate_mapping(self, mapping_id: int) -> Dict[str, Any]:
        """
        Validate a specific mapping.
        
        Args:
            mapping_id: ID of the mapping to validate
            
        Returns:
            Dictionary with validation results
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get the mapping details
            cursor.execute("""
                SELECT 
                    m.*,
                    s.system_name,
                    ca.attribute_name,
                    ca.data_type
                FROM data_mappings m
                JOIN source_systems s ON m.source_system_id = s.id
                JOIN customer_attributes ca ON m.target_attribute_id = ca.id
                WHERE m.id = ?
            """, (mapping_id,))
            
            mapping = cursor.fetchone()
            
            if not mapping:
                return {"success": False, "error": f"Mapping with ID {mapping_id} not found"}
            
            # Convert SQLite Row to dict for easier handling
            mapping_dict = dict(mapping)
            
            # Validate the mapping
            validation_issues = []
            
            # 1. Validate transformation logic
            transformation_issues = self._validate_transformation_logic(
                mapping_dict['transformation_logic'],
                mapping_dict['source_attribute'],
                mapping_dict['attribute_name'],
                mapping_dict['data_type']
            )
            validation_issues.extend(transformation_issues)
            
            # 2. Get sample data and validate with transformation
            sample_result = self._validate_with_sample_data(
                mapping_dict['source_system_id'],
                mapping_dict['system_name'],
                mapping_dict['source_attribute'],
                mapping_dict['transformation_logic'],
                mapping_dict['attribute_name'],
                mapping_dict['data_type']
            )
            
            if not sample_result.get("success", False):
                validation_issues.append(sample_result.get("error", "Error validating with sample data"))
            else:
                # If there are sample validation issues, add them
                validation_issues.extend(sample_result.get("validation_issues", []))
            
            # 3. Check for duplicate target attribute mappings
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM data_mappings
                WHERE target_attribute_id = ? AND id != ? AND source_system_id = ?
            """, (mapping_dict['target_attribute_id'], mapping_id, mapping_dict['source_system_id']))
            
            duplicate_count = cursor.fetchone()['count']
            if duplicate_count > 0:
                validation_issues.append(
                    f"This source system already has {duplicate_count} other mapping(s) for the same target attribute"
                )
            
            # Overall validation result
            is_valid = len(validation_issues) == 0
            
            # Log the validation in the database
            cursor.execute(
                """
                INSERT INTO agent_interactions (agent_name, action_type, details, result)
                VALUES (?, ?, ?, ?)
                """,
                (
                    "MappingValidator", 
                    "validate_mapping", 
                    f"Validated mapping {mapping_id} ({mapping_dict['source_attribute']} to {mapping_dict['attribute_name']})",
                    f"Valid: {is_valid}, Issues: {', '.join(validation_issues) if validation_issues else 'None'}"
                )
            )
            
            # If valid, update the mapping status
            if is_valid:
                cursor.execute(
                    """
                    UPDATE data_mappings
                    SET mapping_status = 'validated', validated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (mapping_id,)
                )
                
            conn.commit()
            conn.close()
            
            return {
                "success": True,
                "mapping_id": mapping_id,
                "source_attribute": mapping_dict['source_attribute'],
                "target_attribute": mapping_dict['attribute_name'],
                "is_valid": is_valid,
                "validation_issues": validation_issues,
                "sample_data": sample_result.get("sample_results", []),
                "message": "Mapping is valid" if is_valid else f"Mapping has {len(validation_issues)} validation issues"
            }
        except Exception as e:
            error_msg = f"Error validating mapping: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def validate_all_mappings(self, source_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Validate all mappings, optionally filtered by source system.
        
        Args:
            source_id: Optional ID of the source system to filter by
            
        Returns:
            Dictionary with validation results
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Build the query based on whether source_id is provided
            if source_id:
                query = """
                    SELECT id FROM data_mappings WHERE source_system_id = ? AND mapping_status != 'validated'
                """
                cursor.execute(query, (source_id,))
            else:
                query = """
                    SELECT id FROM data_mappings WHERE mapping_status != 'validated'
                """
                cursor.execute(query)
                
            mapping_ids = [row['id'] for row in cursor.fetchall()]
            conn.close()
            
            # Validate each mapping
            results = {
                "valid_count": 0,
                "invalid_count": 0,
                "validation_results": []
            }
            
            for mapping_id in mapping_ids:
                result = self.validate_mapping(mapping_id)
                
                if result.get("success", False):
                    if result.get("is_valid", False):
                        results["valid_count"] += 1
                    else:
                        results["invalid_count"] += 1
                        
                    # Append a simplified result to avoid too much data
                    results["validation_results"].append({
                        "mapping_id": mapping_id,
                        "source_attribute": result.get("source_attribute"),
                        "target_attribute": result.get("target_attribute"),
                        "is_valid": result.get("is_valid", False),
                        "issue_count": len(result.get("validation_issues", []))
                    })
            
            return {
                "success": True,
                "total_mappings": len(mapping_ids),
                "valid_count": results["valid_count"],
                "invalid_count": results["invalid_count"],
                "results": results["validation_results"],
                "message": f"Validated {len(mapping_ids)} mappings: {results['valid_count']} valid, {results['invalid_count']} invalid"
            }
        except Exception as e:
            error_msg = f"Error validating mappings: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def _validate_transformation_logic(self, transformation: str, source_attribute: str, 
                                      target_attribute: str, target_data_type: str) -> List[str]:
        """
        Validate transformation logic for syntax and potential issues.
        
        Args:
            transformation: The transformation logic code
            source_attribute: The source attribute being transformed
            target_attribute: The target attribute
            target_data_type: The target attribute data type
            
        Returns:
            List of validation issues
        """
        issues = []
        
        # Check for empty or minimal transformation
        if not transformation or transformation.strip() == "":
            issues.append("Transformation logic is empty")
            return issues
        
        # Remove comments for analysis
        code_lines = []
        for line in transformation.split('\n'):
            if not line.strip().startswith('#'):
                code_lines.append(line)
        
        code_without_comments = '\n'.join(code_lines)
        
        # Check if source attribute is referenced
        source_col_format = f"df['{source_attribute}']"
        if source_col_format not in transformation and not "df[" in transformation:
            issues.append(f"Transformation doesn't reference source attribute: {source_attribute}")
            
        # Check for syntax issues in transformation
        if "df[" in transformation and "]" not in transformation:
            issues.append("Missing closing bracket in DataFrame access")
            
        # Check for potentially harmful operations
        dangerous_patterns = ["exec(", "eval(", "os.", "subprocess", "system("]
        for pattern in dangerous_patterns:
            if pattern in transformation:
                issues.append(f"Potentially harmful operation: {pattern}")
                
        # Validate data type compatibility
        if target_data_type in ["INTEGER", "REAL"] and not any(p in code_without_comments for p in ["int", "float", "pd.to_numeric"]):
            issues.append(f"No numeric conversion found for {target_data_type} target")
            
        if target_data_type == "DATE" and not any(p in code_without_comments for p in ["date", "datetime", "pd.to_datetime"]):
            issues.append(f"No date conversion found for DATE target")
            
        return issues
    
    def _validate_with_sample_data(self, source_id: int, source_name: str, source_attribute: str,
                                 transformation: str, target_attribute: str, 
                                 target_data_type: str) -> Dict[str, Any]:
        """
        Validate transformation using sample data from the source.
        
        Args:
            source_id: ID of the source system
            source_name: Name of the source system
            source_attribute: The source attribute name
            transformation: Transformation logic code
            target_attribute: Target attribute name
            target_data_type: Target attribute data type
            
        Returns:
            Dictionary with validation results
        """
        try:
            # Get sample data for this source attribute
            # We may need to identify the table name from the source attribute
            # In this simulated data, we assume source_attribute may be in "table.column" format
            
            if '.' in source_attribute:
                attribute_name = source_attribute
            else:
                # If no table specified, we'll need a heuristic to find it
                # For now, just prepend "unknown" as the table name
                attribute_name = f"unknown.{source_attribute}"
                
            sample_data_result = get_sample_data(source_id, attribute_name)
            
            if not sample_data_result.get("success", False):
                return {
                    "success": False,
                    "error": f"Error getting sample data: {sample_data_result.get('error', 'Unknown error')}"
                }
                
            sample_data = sample_data_result.get("sample_data", [])
            
            if not sample_data:
                return {
                    "success": True,
                    "validation_issues": ["No sample data available to validate transformation"],
                    "sample_results": []
                }
                
            # Now, try to apply the transformation to the sample data
            validation_issues = []
            sample_results = []
            
            # Create a small DataFrame with the sample data
            df_data = {}
            
            # Extract the column name from the attribute name (remove table prefix)
            if '.' in source_attribute:
                column_name = source_attribute.split('.')[1]
            else:
                column_name = source_attribute
                
            # Collect values from sample data
            df_data[column_name] = [
                record.get("sample_value") 
                for record in sample_data 
                if record.get("column_name") == column_name
            ]
            
            # If no values found, return
            if not df_data[column_name]:
                return {
                    "success": True,
                    "validation_issues": [f"No sample values found for column {column_name}"],
                    "sample_results": []
                }
                
            df = pd.DataFrame(df_data)
            
            # Fix the transformation code to use the column name without table prefix
            fixed_transformation = transformation.replace(f"df['{source_attribute}']", f"df['{column_name}']")
            
            # Try to execute the transformation
            try:
                # Create a safe execution environment
                local_vars = {"df": df}
                
                # Use simple eval if it's a direct reference
                if fixed_transformation.strip() == f"df['{column_name}']":
                    result = df[column_name]
                else:
                    # This is not ideal for security, but we've already checked for dangerous patterns
                    # In a production system, you would use a safer evaluation approach
                    result = eval(fixed_transformation, {"__builtins__": {}}, local_vars)
                
                # Check result type against target data type
                if target_data_type == "INTEGER":
                    try:
                        # Try to convert to integer
                        result = result.astype(int)
                    except Exception:
                        validation_issues.append("Transformation result cannot be converted to INTEGER")
                        
                elif target_data_type == "REAL":
                    try:
                        # Try to convert to float
                        result = result.astype(float)
                    except Exception:
                        validation_issues.append("Transformation result cannot be converted to REAL")
                        
                elif target_data_type == "DATE":
                    try:
                        # Try to convert to datetime
                        result = pd.to_datetime(result)
                    except Exception:
                        validation_issues.append("Transformation result cannot be converted to DATE")
                
                # Check for nulls
                null_count = result.isna().sum()
                if null_count > 0:
                    validation_issues.append(f"Transformation produces {null_count} NULL values out of {len(result)} samples")
                
                # Prepare sample results
                for i, (input_val, output_val) in enumerate(zip(df[column_name], result)):
                    if i >= 5:  # Limit to 5 samples
                        break
                        
                    sample_results.append({
                        "input": input_val,
                        "output": str(output_val),  # Convert to string for consistency
                        "is_null": pd.isna(output_val)
                    })
                    
            except Exception as e:
                validation_issues.append(f"Error executing transformation: {str(e)}")
                
            return {
                "success": True,
                "validation_issues": validation_issues,
                "sample_results": sample_results
            }
                
        except Exception as e:
            error_msg = f"Error in sample data validation: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

# Create a singleton instance
validator = MappingValidator()

def validate_mapping(mapping_id: int) -> Dict[str, Any]:
    """Convenience function to validate a single mapping"""
    return validator.validate_mapping(mapping_id)

def validate_all_mappings(source_id: Optional[int] = None) -> Dict[str, Any]:
    """Convenience function to validate all mappings"""
    return validator.validate_all_mappings(source_id)