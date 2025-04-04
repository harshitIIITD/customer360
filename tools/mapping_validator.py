"""
Mapping Validator Tool

This tool validates data mappings between source and target attributes,
ensuring data quality and consistency in the Customer 360 solution.
"""

import logging
import json
import re
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import sys
import sqlite3
from collections import Counter

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
                    ca.data_type,
                    ca.is_pii
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
            data_quality_metrics = {}
            
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
                # Get data quality metrics from the validation
                data_quality_metrics = sample_result.get("data_quality_metrics", {})
            
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

            # 4. Check for PII data handling compliance
            if mapping_dict['is_pii']:
                pii_issues = self._validate_pii_handling(
                    mapping_dict['transformation_logic'],
                    mapping_dict['source_attribute'],
                    mapping_dict['attribute_name']
                )
                validation_issues.extend(pii_issues)
            
            # Calculate confidence score based on validation results
            confidence_score = self._calculate_confidence_score(
                validation_issues, 
                data_quality_metrics,
                mapping_dict['is_pii']
            )
            
            # Overall validation result
            is_valid = confidence_score >= 0.7  # Threshold for validity
            
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
                    f"Valid: {is_valid}, Confidence: {confidence_score:.2f}, Issues: {', '.join(validation_issues) if validation_issues else 'None'}"
                )
            )
            
            # Update the mapping status and confidence score
            cursor.execute(
                """
                UPDATE data_mappings
                SET mapping_status = ?, validated_at = CURRENT_TIMESTAMP, confidence_score = ?
                WHERE id = ?
                """,
                ("validated" if is_valid else "issues", confidence_score, mapping_id)
            )
                
            conn.commit()
            conn.close()
            
            return {
                "success": True,
                "mapping_id": mapping_id,
                "source_attribute": mapping_dict['source_attribute'],
                "target_attribute": mapping_dict['attribute_name'],
                "is_valid": is_valid,
                "confidence_score": confidence_score,
                "validation_issues": validation_issues,
                "data_quality_metrics": data_quality_metrics,
                "sample_data": sample_result.get("sample_results", []),
                "message": f"Mapping is {'valid' if is_valid else 'invalid'} with confidence score {confidence_score:.2f}"
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
                    SELECT id FROM data_mappings WHERE source_system_id = ? ORDER BY confidence_score ASC
                """
                cursor.execute(query, (source_id,))
            else:
                query = """
                    SELECT id FROM data_mappings ORDER BY confidence_score ASC
                """
                cursor.execute(query)
                
            mapping_ids = [row['id'] for row in cursor.fetchall()]
            conn.close()
            
            # Validate each mapping
            results = {
                "valid_count": 0,
                "invalid_count": 0,
                "validation_results": [],
                "avg_confidence": 0.0
            }
            
            total_confidence = 0.0
            
            for mapping_id in mapping_ids:
                result = self.validate_mapping(mapping_id)
                
                if result.get("success", False):
                    confidence = result.get("confidence_score", 0.0)
                    total_confidence += confidence
                    
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
                        "confidence_score": confidence,
                        "issue_count": len(result.get("validation_issues", []))
                    })
            
            # Calculate average confidence score
            if mapping_ids:
                results["avg_confidence"] = total_confidence / len(mapping_ids)
            
            return {
                "success": True,
                "total_mappings": len(mapping_ids),
                "valid_count": results["valid_count"],
                "invalid_count": results["invalid_count"],
                "average_confidence": results["avg_confidence"],
                "results": results["validation_results"],
                "message": f"Validated {len(mapping_ids)} mappings: {results['valid_count']} valid, {results['invalid_count']} invalid, avg confidence: {results['avg_confidence']:.2f}"
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
        if "." in source_attribute:
            column_name = source_attribute.split(".")[-1]
        else:
            column_name = source_attribute
            
        source_col_patterns = [
            f"df['{source_attribute}']",
            f"df['{column_name}']",
            f"df[[\"{source_attribute}\"]]",
            f"df[[\"{column_name}\"]]"
        ]
        
        if not any(pattern in transformation for pattern in source_col_patterns) and "df[" not in transformation:
            issues.append(f"Transformation doesn't reference source attribute: {source_attribute}")
            
        # Check for syntax issues in transformation
        syntax_issues = self._check_syntax_issues(transformation)
        issues.extend(syntax_issues)
        
        # Check for potentially harmful operations
        dangerous_patterns = [
            "exec(", "eval(", "os.", "subprocess", "system(", 
            "shutil", "__import__", "open(", "file(", "globals()"
        ]
        for pattern in dangerous_patterns:
            if pattern in transformation:
                issues.append(f"Potentially harmful operation: {pattern}")
                
        # Validate data type compatibility
        if target_data_type in ["INTEGER", "REAL"]:
            if not any(p in code_without_comments for p in [
                "int", "float", "pd.to_numeric", "astype", ".sum(", ".mean(", ".median("
            ]):
                issues.append(f"No numeric conversion found for {target_data_type} target")
            
        if target_data_type == "DATE":
            if not any(p in code_without_comments for p in [
                "date", "datetime", "pd.to_datetime", "strptime", "Timestamp"
            ]):
                issues.append(f"No date conversion found for DATE target")
                
        # Check for error handling
        if "try:" not in code_without_comments and "errors=" not in code_without_comments:
            issues.append("No error handling found in transformation")
            
        # Check for complex transformations that might need explanation
        if len(code_without_comments.split('\n')) > 5 and "# " not in transformation:
            issues.append("Complex transformation lacks explanatory comments")
            
        return issues
    
    def _check_syntax_issues(self, transformation: str) -> List[str]:
        """
        Perform additional syntax checking on transformation code.
        
        Args:
            transformation: The transformation code to check
            
        Returns:
            List of syntax issues found
        """
        issues = []
        
        # Check for balanced brackets
        if transformation.count("df[") != transformation.count("]"):
            issues.append("Unbalanced brackets in DataFrame access")
            
        # Check for common syntax errors
        if "df.[" in transformation:
            issues.append("Incorrect DataFrame accessor (df.[ should be df[)")
            
        if ".loc[" in transformation and ".loc[]" in transformation:
            issues.append("Empty .loc[] accessor")
            
        if "== None" in transformation:
            issues.append("Use 'is None' instead of '== None'")
            
        if "=" in transformation and not any(p in transformation for p in ["==", "<=", ">=", "!="]):
            # Check if this might be an assignment in a query context
            if "df[" in transformation and "=" in transformation.split("df[")[1].split("]")[0]:
                issues.append("Potential assignment in DataFrame accessor (use == for comparison)")
                
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
                    "sample_results": [],
                    "data_quality_metrics": {}
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
                    "sample_results": [],
                    "data_quality_metrics": {}
                }
                
            df = pd.DataFrame(df_data)
            
            # Fix the transformation code to use the column name without table prefix
            fixed_transformation = transformation.replace(f"df['{source_attribute}']", f"df['{column_name}']")
            
            # Try to execute the transformation
            try:
                # Create a safe execution environment
                local_vars = {"df": df, "pd": pd, "np": np}
                
                # Use simple eval if it's a direct reference
                if fixed_transformation.strip() in [f"df['{column_name}']", f"df[\"{column_name}\"]"]:
                    result = df[column_name]
                else:
                    # This is not ideal for security, but we've already checked for dangerous patterns
                    # In a production system, you would use a safer evaluation approach
                    result = eval(fixed_transformation, {"__builtins__": {}}, local_vars)
                
                # Calculate data quality metrics on the result
                data_quality_metrics = self._calculate_data_quality_metrics(result, target_data_type)
                
                # Check result type against target data type
                type_issues = self._check_data_type_compatibility(result, target_data_type)
                validation_issues.extend(type_issues)
                
                # Check for nulls
                null_count = result.isna().sum()
                if null_count > 0:
                    null_pct = (null_count / len(result)) * 100
                    validation_issues.append(f"Transformation produces {null_count} NULL values ({null_pct:.1f}%) out of {len(result)} samples")
                
                # Check for duplicates if this might be a key field
                if target_attribute.lower() in ["id", "customer_id", "key", "identifier"]:
                    duplicate_count = len(result) - len(result.dropna().unique())
                    if duplicate_count > 0:
                        validation_issues.append(f"Transformation produces {duplicate_count} duplicate values for potential key field")
                
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
                data_quality_metrics = {}
                
            return {
                "success": True,
                "validation_issues": validation_issues,
                "sample_results": sample_results,
                "data_quality_metrics": data_quality_metrics
            }
                
        except Exception as e:
            error_msg = f"Error in sample data validation: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def _validate_pii_handling(self, transformation: str, source_attribute: str, 
                              target_attribute: str) -> List[str]:
        """
        Validate the handling of PII data in transformations.
        
        Args:
            transformation: The transformation logic
            source_attribute: Source attribute name
            target_attribute: Target attribute name
            
        Returns:
            List of PII handling issues
        """
        issues = []
        
        # Check for masking/obfuscation techniques
        masking_patterns = [
            "mask", "hash", "encrypt", "anonymize", "obfuscate", "tokenize",
            "sha", "md5", "hmac", "pseudonymize", "redact"
        ]
        
        has_pii_protection = any(pattern in transformation.lower() for pattern in masking_patterns)
        
        if not has_pii_protection:
            issues.append("PII data should be protected using masking, hashing, or tokenization")
            
        # Check for direct copying of sensitive data
        if source_attribute.split(".")[-1] == target_attribute:
            if transformation.strip() in [f"df['{source_attribute}']", f"df[\"{source_attribute}\"]"]:
                issues.append("Direct copying of PII data without transformation")
                
        # Check for logging of PII data
        if "print" in transformation or "log" in transformation:
            issues.append("Potential logging of PII data detected")
            
        return issues
    
    def _check_data_type_compatibility(self, result: pd.Series, target_data_type: str) -> List[str]:
        """
        Check if the transformed data is compatible with the target data type.
        
        Args:
            result: The transformation result Series
            target_data_type: Target attribute data type
            
        Returns:
            List of data type compatibility issues
        """
        issues = []
        
        try:
            if target_data_type == "INTEGER":
                # Try to convert to integer
                non_null = result.dropna()
                if len(non_null) > 0:
                    try:
                        non_null.astype(int)
                    except Exception:
                        issues.append("Transformation result cannot be converted to INTEGER")
                        
            elif target_data_type == "REAL":
                # Try to convert to float
                non_null = result.dropna()
                if len(non_null) > 0:
                    try:
                        non_null.astype(float)
                    except Exception:
                        issues.append("Transformation result cannot be converted to REAL")
                        
            elif target_data_type == "DATE":
                # Try to convert to datetime
                non_null = result.dropna()
                if len(non_null) > 0:
                    try:
                        pd.to_datetime(non_null)
                    except Exception:
                        issues.append("Transformation result cannot be converted to DATE")
                        
        except Exception as e:
            issues.append(f"Error checking data type compatibility: {str(e)}")
            
        return issues
        
    def _calculate_data_quality_metrics(self, result: pd.Series, target_data_type: str) -> Dict[str, Any]:
        """
        Calculate data quality metrics for the transformed data.
        
        Args:
            result: The transformation result Series
            target_data_type: Target attribute data type
            
        Returns:
            Dictionary of data quality metrics
        """
        metrics = {}
        
        try:
            # Basic metrics
            total_count = len(result)
            null_count = result.isna().sum()
            non_null_count = total_count - null_count
            
            metrics["total_count"] = total_count
            metrics["null_count"] = null_count
            metrics["completeness"] = (non_null_count / total_count) * 100 if total_count > 0 else 0
            
            # Only calculate these metrics for non-null values
            non_null = result.dropna()
            
            if len(non_null) > 0:
                metrics["distinct_count"] = len(non_null.unique())
                metrics["uniqueness"] = (len(non_null.unique()) / len(non_null)) * 100
                
                # Value distribution
                value_counts = non_null.value_counts(normalize=True)
                metrics["top_value"] = str(value_counts.index[0]) if len(value_counts) > 0 else None
                metrics["top_value_pct"] = float(value_counts.iloc[0] * 100) if len(value_counts) > 0 else 0
                
                # Type-specific metrics
                if target_data_type in ["INTEGER", "REAL"]:
                    try:
                        numeric_values = pd.to_numeric(non_null, errors='coerce').dropna()
                        if len(numeric_values) > 0:
                            metrics["min"] = float(numeric_values.min())
                            metrics["max"] = float(numeric_values.max())
                            metrics["mean"] = float(numeric_values.mean())
                            metrics["median"] = float(numeric_values.median())
                            metrics["std_dev"] = float(numeric_values.std())
                            
                            # Outlier detection (values > 3 std dev from mean)
                            mean = numeric_values.mean()
                            std = numeric_values.std()
                            outlier_count = ((numeric_values < (mean - 3*std)) | (numeric_values > (mean + 3*std))).sum()
                            metrics["outlier_count"] = int(outlier_count)
                            metrics["outlier_pct"] = (outlier_count / len(numeric_values)) * 100
                    except Exception as e:
                        logger.warning(f"Error calculating numeric metrics: {e}")
                
                elif target_data_type == "DATE":
                    try:
                        date_values = pd.to_datetime(non_null, errors='coerce').dropna()
                        if len(date_values) > 0:
                            metrics["min_date"] = date_values.min().isoformat()
                            metrics["max_date"] = date_values.max().isoformat()
                            metrics["date_range_days"] = (date_values.max() - date_values.min()).days
                    except Exception as e:
                        logger.warning(f"Error calculating date metrics: {e}")
                
                elif target_data_type == "TEXT":
                    # Text-specific metrics
                    text_values = non_null.astype(str)
                    metrics["avg_length"] = text_values.str.len().mean()
                    metrics["max_length"] = text_values.str.len().max()
                    metrics["empty_string_count"] = (text_values == "").sum()
                    
                    # Pattern detection
                    email_pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
                    phone_pattern = r'^\+?[\d\s\-\(\)]+$'
                    
                    email_count = text_values.str.match(email_pattern).sum()
                    phone_count = text_values.str.match(phone_pattern).sum()
                    
                    if email_count > 0:
                        metrics["potential_email_count"] = int(email_count)
                        metrics["potential_email_pct"] = (email_count / len(text_values)) * 100
                        
                    if phone_count > 0:
                        metrics["potential_phone_count"] = int(phone_count)
                        metrics["potential_phone_pct"] = (phone_count / len(text_values)) * 100
        
        except Exception as e:
            logger.warning(f"Error calculating data quality metrics: {e}")
            
        return metrics
        
    def _calculate_confidence_score(self, issues: List[str], metrics: Dict[str, Any], is_pii: bool) -> float:
        """
        Calculate a confidence score for the mapping based on validation results.
        
        Args:
            issues: List of validation issues
            metrics: Data quality metrics
            is_pii: Whether this is PII data
            
        Returns:
            Confidence score between 0 and 1
        """
        # Base score - perfect mapping starts at 1.0
        score = 1.0
        
        # Deduct for validation issues
        issue_penalty = min(0.7, 0.1 * len(issues))  # Cap at 0.7 to avoid negative scores
        score -= issue_penalty
        
        # Add/deduct based on data quality metrics
        if metrics:
            # Reward high completeness
            completeness = metrics.get("completeness", 0)
            score += (completeness / 100) * 0.2
            
            # Penalize low uniqueness for ID fields
            if is_pii and "uniqueness" in metrics:
                uniqueness = metrics.get("uniqueness", 100)
                if uniqueness < 90:
                    score -= (90 - uniqueness) / 90 * 0.2
                    
            # Penalize high null percentage
            null_pct = 100 - completeness
            if null_pct > 10:
                score -= (null_pct - 10) / 90 * 0.2  # Scale penalty
                
            # Reward absence of outliers for numeric data
            if "outlier_pct" in metrics:
                outlier_pct = metrics.get("outlier_pct", 0)
                if outlier_pct < 5:
                    score += 0.05
                else:
                    score -= min(0.2, outlier_pct / 100)
        
        # Handle PII data with higher standards
        if is_pii:
            pii_issues = [issue for issue in issues if "PII" in issue]
            if pii_issues:
                score -= 0.3  # Severe penalty for PII handling issues
        
        # Cap the score between 0 and 1
        return max(0.0, min(1.0, score))

# Create a singleton instance
validator = MappingValidator()

def validate_mapping(mapping_id: int) -> Dict[str, Any]:
    """Convenience function to validate a single mapping"""
    return validator.validate_mapping(mapping_id)

def validate_all_mappings(source_id: Optional[int] = None) -> Dict[str, Any]:
    """Convenience function to validate all mappings"""
    return validator.validate_all_mappings(source_id)