"""
Data Source Scanner Tool

This tool scans data sources to extract schema information and sample data.
It helps the agent system understand the structure of source data systems.
"""

import logging
import json
import os
import csv
import sqlite3
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import sys

# Add project root to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from database.setup_db import get_db_connection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DataSourceScanner:
    """
    Tool for scanning data sources and extracting metadata.
    """
    
    def __init__(self):
        """Initialize the data source scanner"""
        self.logger = logging.getLogger("DataSourceScanner")
        self.sample_data_dir = Path(__file__).parent.parent / "data" / "sample_source_data"
        os.makedirs(self.sample_data_dir, exist_ok=True)
        # Store scan history and issues
        self.scan_history = {}
        self.detected_issues = {}
        
    def scan_source_system(self, source_id: int) -> Dict[str, Any]:
        """
        Scan a source system and extract its schema.
        
        Args:
            source_id: ID of the source system to scan
            
        Returns:
            Dictionary with schema information
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get source system details
            cursor.execute("SELECT * FROM source_systems WHERE id = ?", (source_id,))
            source = cursor.fetchone()
            
            if not source:
                return {"success": False, "error": f"Source with ID {source_id} not found"}
            
            source_name = source["system_name"]
            
            # In a real implementation, this would connect to the actual source system
            # and extract the schema. For this demo, we'll simulate it.
            
            schema_info = self._simulate_schema_extraction(source_name)
            
            # Store the schema information in the database or return it
            # For now, we'll just return it
            
            # Track scan timestamp and results in history
            import datetime
            scan_timestamp = datetime.datetime.now().isoformat()
            scan_result = {
                "timestamp": scan_timestamp,
                "source_id": source_id,
                "source_name": source_name,
                "tables_count": len(schema_info.get("tables", [])),
                "columns_count": sum(len(table.get("columns", [])) for table in schema_info.get("tables", []))
            }
            
            if source_id not in self.scan_history:
                self.scan_history[source_id] = []
            
            self.scan_history[source_id].append(scan_result)
            
            # Enhanced scan detects potential issues in the schema
            issues = self._detect_schema_issues(schema_info)
            
            # Store detected issues
            self.detected_issues[source_id] = issues
            
            # Log scan operation and issues
            self._log_scan(source_id, source_name, schema_info)
            
            return {
                "success": True,
                "source_id": source_id,
                "source_name": source_name,
                "schema": schema_info,
                "scan_timestamp": scan_timestamp,
                "detected_issues": issues,
                "message": f"Successfully scanned source {source_name}"
            }
            
        except Exception as e:
            error_msg = f"Error scanning source: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def get_sample_data(self, source_id: int, attribute_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get sample data from a source system.
        
        Args:
            source_id: ID of the source system
            attribute_name: Optional attribute name to filter by
            
        Returns:
            Dictionary with sample data
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get source system details
            cursor.execute("SELECT * FROM source_systems WHERE id = ?", (source_id,))
            source = cursor.fetchone()
            
            if not source:
                return {"success": False, "error": f"Source with ID {source_id} not found"}
            
            source_name = source["system_name"]
            
            # In a real implementation, this would query the actual source system
            # For this demo, we'll load simulated sample data
            
            sample_data = self._load_sample_data(source_name, attribute_name)
            
            # Enhanced: Analyze sample data quality
            quality_metrics = self._analyze_sample_data_quality(sample_data) if sample_data else {}
            
            return {
                "success": True,
                "source_id": source_id,
                "source_name": source_name,
                "sample_data": sample_data,
                "attribute_name": attribute_name,
                "quality_metrics": quality_metrics,
                "message": f"Retrieved sample data from {source_name}"
            }
            
        except Exception as e:
            error_msg = f"Error getting sample data: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def extract_source_attributes(self, source_id: int) -> Dict[str, Any]:
        """
        Extract all attributes from a source system.
        
        Args:
            source_id: ID of the source system
            
        Returns:
            Dictionary with attribute information
        """
        schema_result = self.scan_source_system(source_id)
        
        if not schema_result.get("success", False):
            return schema_result
            
        # Extract just the attribute names and types from the schema
        attributes = []
        for table in schema_result.get("schema", {}).get("tables", []):
            table_name = table.get("name", "")
            for column in table.get("columns", []):
                attributes.append({
                    "name": f"{table_name}.{column.get('name')}",
                    "data_type": column.get("data_type"),
                    "description": column.get("description", ""),
                    # Enhanced: Add potential issues for this attribute
                    "potential_issues": self._check_attribute_issues(column)
                })
        
        return {
            "success": True,
            "source_id": source_id,
            "source_name": schema_result.get("source_name"),
            "attributes": attributes,
            "detected_issues": schema_result.get("detected_issues", []),
            "message": f"Extracted {len(attributes)} attributes from {schema_result.get('source_name')}"
        }

    def get_scan_history(self, source_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Get scan history for a source system or all systems.
        
        Args:
            source_id: Optional ID of the source system
            
        Returns:
            Dictionary with scan history
        """
        try:
            if source_id is not None:
                if source_id not in self.scan_history:
                    return {
                        "success": False,
                        "error": f"No scan history found for source ID {source_id}"
                    }
                    
                history = self.scan_history[source_id]
                return {
                    "success": True,
                    "source_id": source_id,
                    "scan_history": history,
                    "count": len(history)
                }
            else:
                # Return scan history for all sources
                all_history = {}
                for src_id, history in self.scan_history.items():
                    all_history[src_id] = history
                    
                return {
                    "success": True,
                    "scan_history": all_history,
                    "sources_count": len(all_history),
                    "scans_count": sum(len(history) for history in all_history.values())
                }
                
        except Exception as e:
            error_msg = f"Error retrieving scan history: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def get_detected_issues(self, source_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Get detected issues for a source system or all systems.
        
        Args:
            source_id: Optional ID of the source system
            
        Returns:
            Dictionary with detected issues
        """
        try:
            if source_id is not None:
                if source_id not in self.detected_issues:
                    return {
                        "success": False,
                        "error": f"No issues detected for source ID {source_id}"
                    }
                    
                issues = self.detected_issues[source_id]
                return {
                    "success": True,
                    "source_id": source_id,
                    "issues": issues,
                    "count": len(issues)
                }
            else:
                # Return issues for all sources
                all_issues = {}
                for src_id, issues in self.detected_issues.items():
                    all_issues[src_id] = issues
                    
                return {
                    "success": True,
                    "detected_issues": all_issues,
                    "sources_count": len(all_issues),
                    "issues_count": sum(len(issues) for issues in all_issues.values())
                }
                
        except Exception as e:
            error_msg = f"Error retrieving detected issues: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def _detect_schema_issues(self, schema_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Detect potential issues in the schema.
        
        Args:
            schema_info: Schema information dictionary
            
        Returns:
            List of detected issues
        """
        issues = []
        
        # Check for tables without primary keys
        for table in schema_info.get("tables", []):
            table_name = table.get("name", "")
            columns = table.get("columns", [])
            
            # Check for tables without primary keys (simplified check for demo)
            has_primary_key = any("id" in col.get("name", "").lower() for col in columns)
            if not has_primary_key:
                issues.append({
                    "issue_type": "missing_primary_key",
                    "severity": "high",
                    "table": table_name,
                    "description": f"Table {table_name} appears to be missing a primary key"
                })
            
            # Check for columns with generic names
            generic_names = ["data", "value", "info", "text"]
            for column in columns:
                col_name = column.get("name", "").lower()
                if col_name in generic_names:
                    issues.append({
                        "issue_type": "generic_column_name",
                        "severity": "medium",
                        "table": table_name,
                        "column": column.get("name"),
                        "description": f"Column {column.get('name')} in table {table_name} has a generic name"
                    })
                    
            # Check for missing descriptions
            missing_desc = [col.get("name") for col in columns if not col.get("description")]
            if missing_desc:
                issues.append({
                    "issue_type": "missing_descriptions",
                    "severity": "low",
                    "table": table_name,
                    "columns": missing_desc,
                    "description": f"Columns in {table_name} are missing descriptions: {', '.join(missing_desc)}"
                })
                
        return issues
    
    def _check_attribute_issues(self, column: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Check for potential issues with an attribute.
        
        Args:
            column: Column information dictionary
            
        Returns:
            List of potential issues
        """
        issues = []
        col_name = column.get("name", "").lower()
        data_type = column.get("data_type", "").upper()
        
        # Check for missing description
        if not column.get("description"):
            issues.append({
                "issue_type": "missing_description",
                "severity": "low",
                "description": "Column is missing a description"
            })
            
        # Check for proper data types for common fields
        if "email" in col_name and data_type != "VARCHAR":
            issues.append({
                "issue_type": "inappropriate_data_type",
                "severity": "medium",
                "description": f"Email column should be VARCHAR, found {data_type}"
            })
            
        if "date" in col_name and "DATE" not in data_type and "TIMESTAMP" not in data_type:
            issues.append({
                "issue_type": "inappropriate_data_type",
                "severity": "medium",
                "description": f"Date column should be DATE or TIMESTAMP, found {data_type}"
            })
            
        return issues
    
    def _analyze_sample_data_quality(self, sample_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze the quality of sample data.
        
        Args:
            sample_data: List of sample data records
            
        Returns:
            Dictionary with quality metrics
        """
        if not sample_data:
            return {}
        
        # Group samples by column
        columns = {}
        for sample in sample_data:
            col_name = sample.get("column_name")
            if col_name not in columns:
                columns[col_name] = []
            columns[col_name].append(sample.get("sample_value"))
        
        # Analyze each column
        column_metrics = {}
        for col_name, values in columns.items():
            # Count non-null values
            non_null_count = sum(1 for v in values if v is not None)
            
            # Count unique values
            unique_values = len(set(str(v) for v in values if v is not None))
            
            # Calculate metrics
            metrics = {
                "total_samples": len(values),
                "non_null_count": non_null_count,
                "null_count": len(values) - non_null_count,
                "completeness": non_null_count / len(values) if values else 0,
                "unique_count": unique_values,
                "uniqueness": unique_values / non_null_count if non_null_count else 0
            }
            
            column_metrics[col_name] = metrics
        
        # Overall metrics
        total_samples = sum(metrics["total_samples"] for metrics in column_metrics.values())
        total_non_null = sum(metrics["non_null_count"] for metrics in column_metrics.values())
        
        return {
            "columns": column_metrics,
            "overall": {
                "total_samples": total_samples,
                "non_null_count": total_non_null,
                "completeness": total_non_null / total_samples if total_samples else 0,
                "analyzed_columns": len(column_metrics)
            }
        }
    
    def _simulate_schema_extraction(self, source_name: str) -> Dict[str, Any]:
        """
        Simulate the extraction of a schema from a source system.
        
        In a real implementation, this would connect to the actual source
        system, but for this demo, we'll generate simulated schemas.
        
        Args:
            source_name: Name of the source system
            
        Returns:
            Dictionary with schema information
        """
        # Generate different schemas based on the source system name
        if source_name == "CORE_BANKING":
            return {
                "tables": [
                    {
                        "name": "customers",
                        "description": "Main customer table",
                        "columns": [
                            {"name": "customer_id", "data_type": "VARCHAR", "description": "Unique customer identifier"},
                            {"name": "first_name", "data_type": "VARCHAR", "description": "Customer first name"},
                            {"name": "last_name", "data_type": "VARCHAR", "description": "Customer last name"},
                            {"name": "date_of_birth", "data_type": "DATE", "description": "Date of birth"},
                            {"name": "ssn", "data_type": "VARCHAR", "description": "Social Security Number"},
                            {"name": "creation_date", "data_type": "TIMESTAMP", "description": "When customer was created"}
                        ]
                    },
                    {
                        "name": "accounts",
                        "description": "Banking account information",
                        "columns": [
                            {"name": "account_id", "data_type": "VARCHAR", "description": "Unique account identifier"},
                            {"name": "customer_id", "data_type": "VARCHAR", "description": "Customer who owns the account"},
                            {"name": "account_type", "data_type": "VARCHAR", "description": "Type of account"},
                            {"name": "balance", "data_type": "DECIMAL", "description": "Current balance"},
                            {"name": "open_date", "data_type": "DATE", "description": "When account was opened"},
                            {"name": "status", "data_type": "VARCHAR", "description": "Account status"}
                        ]
                    }
                ]
            }
            
        elif source_name == "CRM_SYSTEM":
            return {
                "tables": [
                    {
                        "name": "contacts",
                        "description": "Customer contact information",
                        "columns": [
                            {"name": "contact_id", "data_type": "VARCHAR", "description": "Unique contact identifier"},
                            {"name": "crm_customer_id", "data_type": "VARCHAR", "description": "CRM customer identifier"},
                            {"name": "email", "data_type": "VARCHAR", "description": "Email address"},
                            {"name": "phone", "data_type": "VARCHAR", "description": "Phone number"},
                            {"name": "address_line1", "data_type": "VARCHAR", "description": "Address line 1"},
                            {"name": "address_line2", "data_type": "VARCHAR", "description": "Address line 2"},
                            {"name": "city", "data_type": "VARCHAR", "description": "City"},
                            {"name": "state", "data_type": "VARCHAR", "description": "State"},
                            {"name": "zip_code", "data_type": "VARCHAR", "description": "ZIP code"},
                            {"name": "country", "data_type": "VARCHAR", "description": "Country"}
                        ]
                    },
                    {
                        "name": "interactions",
                        "description": "Customer interactions",
                        "columns": [
                            {"name": "interaction_id", "data_type": "VARCHAR", "description": "Unique interaction ID"},
                            {"name": "crm_customer_id", "data_type": "VARCHAR", "description": "CRM customer identifier"},
                            {"name": "channel", "data_type": "VARCHAR", "description": "Interaction channel"},
                            {"name": "interaction_type", "data_type": "VARCHAR", "description": "Type of interaction"},
                            {"name": "interaction_date", "data_type": "TIMESTAMP", "description": "When interaction occurred"},
                            {"name": "notes", "data_type": "TEXT", "description": "Interaction notes"}
                        ]
                    },
                    {
                        "name": "preferences",
                        "description": "Customer preferences",
                        "columns": [
                            {"name": "pref_id", "data_type": "VARCHAR", "description": "Unique preference ID"},
                            {"name": "crm_customer_id", "data_type": "VARCHAR", "description": "CRM customer identifier"},
                            {"name": "preferred_channel", "data_type": "VARCHAR", "description": "Preferred contact channel"},
                            {"name": "marketing_opt_in", "data_type": "BOOLEAN", "description": "Marketing opt-in status"},
                            {"name": "language", "data_type": "VARCHAR", "description": "Preferred language"},
                            {"name": "last_updated", "data_type": "TIMESTAMP", "description": "When preferences were last updated"}
                        ]
                    }
                ]
            }
            
        elif source_name == "LOAN_SYSTEM":
            return {
                "tables": [
                    {
                        "name": "loans",
                        "description": "Loan information",
                        "columns": [
                            {"name": "loan_id", "data_type": "VARCHAR", "description": "Unique loan identifier"},
                            {"name": "loan_customer_id", "data_type": "VARCHAR", "description": "Customer identifier"},
                            {"name": "loan_type", "data_type": "VARCHAR", "description": "Type of loan"},
                            {"name": "principal", "data_type": "DECIMAL", "description": "Loan principal amount"},
                            {"name": "interest_rate", "data_type": "DECIMAL", "description": "Interest rate"},
                            {"name": "term_months", "data_type": "INTEGER", "description": "Loan term in months"},
                            {"name": "start_date", "data_type": "DATE", "description": "Loan start date"},
                            {"name": "end_date", "data_type": "DATE", "description": "Loan end date"},
                            {"name": "status", "data_type": "VARCHAR", "description": "Loan status"}
                        ]
                    },
                    {
                        "name": "credit_scores",
                        "description": "Customer credit scores",
                        "columns": [
                            {"name": "record_id", "data_type": "VARCHAR", "description": "Unique record ID"},
                            {"name": "loan_customer_id", "data_type": "VARCHAR", "description": "Customer identifier"},
                            {"name": "score_value", "data_type": "INTEGER", "description": "Credit score value"},
                            {"name": "score_date", "data_type": "DATE", "description": "When score was recorded"},
                            {"name": "score_agency", "data_type": "VARCHAR", "description": "Credit score agency"},
                            {"name": "risk_category", "data_type": "VARCHAR", "description": "Risk category"}
                        ]
                    }
                ]
            }
            
        elif source_name == "CARD_SYSTEM":
            return {
                "tables": [
                    {
                        "name": "cards",
                        "description": "Card products",
                        "columns": [
                            {"name": "card_id", "data_type": "VARCHAR", "description": "Unique card identifier"},
                            {"name": "card_customer_id", "data_type": "VARCHAR", "description": "Customer identifier"},
                            {"name": "card_type", "data_type": "VARCHAR", "description": "Type of card"},
                            {"name": "card_number", "data_type": "VARCHAR", "description": "Masked card number"},
                            {"name": "expiry_date", "data_type": "DATE", "description": "Card expiry date"},
                            {"name": "credit_limit", "data_type": "DECIMAL", "description": "Credit limit (for credit cards)"},
                            {"name": "status", "data_type": "VARCHAR", "description": "Card status"}
                        ]
                    },
                    {
                        "name": "card_transactions",
                        "description": "Card transactions",
                        "columns": [
                            {"name": "transaction_id", "data_type": "VARCHAR", "description": "Unique transaction ID"},
                            {"name": "card_id", "data_type": "VARCHAR", "description": "Card identifier"},
                            {"name": "transaction_date", "data_type": "TIMESTAMP", "description": "Transaction date and time"},
                            {"name": "amount", "data_type": "DECIMAL", "description": "Transaction amount"},
                            {"name": "merchant", "data_type": "VARCHAR", "description": "Merchant name"},
                            {"name": "category", "data_type": "VARCHAR", "description": "Transaction category"},
                            {"name": "location", "data_type": "VARCHAR", "description": "Transaction location"}
                        ]
                    }
                ]
            }
            
        elif source_name == "DIGITAL_BANKING":
            return {
                "tables": [
                    {
                        "name": "users",
                        "description": "Digital banking users",
                        "columns": [
                            {"name": "user_id", "data_type": "VARCHAR", "description": "Unique user identifier"},
                            {"name": "digital_customer_id", "data_type": "VARCHAR", "description": "Digital customer identifier"},
                            {"name": "username", "data_type": "VARCHAR", "description": "User login name"},
                            {"name": "email", "data_type": "VARCHAR", "description": "User email"},
                            {"name": "registration_date", "data_type": "TIMESTAMP", "description": "Registration date"},
                            {"name": "last_login", "data_type": "TIMESTAMP", "description": "Last login timestamp"},
                            {"name": "status", "data_type": "VARCHAR", "description": "User status"}
                        ]
                    },
                    {
                        "name": "sessions",
                        "description": "Digital banking sessions",
                        "columns": [
                            {"name": "session_id", "data_type": "VARCHAR", "description": "Unique session ID"},
                            {"name": "user_id", "data_type": "VARCHAR", "description": "User identifier"},
                            {"name": "start_time", "data_type": "TIMESTAMP", "description": "Session start time"},
                            {"name": "end_time", "data_type": "TIMESTAMP", "description": "Session end time"},
                            {"name": "device_type", "data_type": "VARCHAR", "description": "Device type"},
                            {"name": "ip_address", "data_type": "VARCHAR", "description": "IP address"},
                            {"name": "user_agent", "data_type": "VARCHAR", "description": "User agent string"}
                        ]
                    },
                    {
                        "name": "activities",
                        "description": "User activities in digital banking",
                        "columns": [
                            {"name": "activity_id", "data_type": "VARCHAR", "description": "Unique activity ID"},
                            {"name": "session_id", "data_type": "VARCHAR", "description": "Session identifier"},
                            {"name": "user_id", "data_type": "VARCHAR", "description": "User identifier"},
                            {"name": "activity_type", "data_type": "VARCHAR", "description": "Type of activity"},
                            {"name": "timestamp", "data_type": "TIMESTAMP", "description": "Activity timestamp"},
                            {"name": "feature", "data_type": "VARCHAR", "description": "Feature used"},
                            {"name": "details", "data_type": "TEXT", "description": "Activity details"}
                        ]
                    }
                ]
            }
            
        else:
            # Default empty schema for unknown sources
            return {
                "tables": [
                    {
                        "name": "unknown",
                        "description": "Unknown source system",
                        "columns": [
                            {"name": "id", "data_type": "VARCHAR", "description": "Generic ID column"},
                            {"name": "value", "data_type": "VARCHAR", "description": "Generic value column"}
                        ]
                    }
                ]
            }
    
    def _load_sample_data(self, source_name: str, attribute_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Load or generate sample data for a source system.
        
        Args:
            source_name: Name of the source system
            attribute_name: Optional attribute name to filter by
            
        Returns:
            List of sample data records
        """
        # In a real implementation, this would query the actual source system
        # For this demo, we'll generate simulated data
        
        # Check if we have sample data files for this source
        sample_file = self.sample_data_dir / f"{source_name.lower()}_sample.csv"
        
        if sample_file.exists():
            # Load from file
            try:
                df = pd.read_csv(sample_file)
                
                # Filter by attribute name if provided
                if attribute_name and '.' in attribute_name:
                    table_name, column_name = attribute_name.split('.')
                    if 'table_name' in df.columns:
                        df = df[(df['table_name'] == table_name) & (df['column_name'] == column_name)]
                
                # Convert to list of dicts
                return df.to_dict('records')
            except Exception as e:
                logger.error(f"Error loading sample data from file: {e}")
                # Fall back to generated data
                
        # Generate sample data based on the schema
        schema = self._simulate_schema_extraction(source_name)
        sample_data = []
        
        # Filter by table.column if attribute_name is provided
        if attribute_name and '.' in attribute_name:
            table_name, column_name = attribute_name.split('.')
            for table in schema.get("tables", []):
                if table["name"] == table_name:
                    for column in table.get("columns", []):
                        if column["name"] == column_name:
                            # Generate sample data for this specific column
                            sample_data.extend(self._generate_column_samples(
                                table_name, column["name"], column["data_type"], 10
                            ))
        else:
            # Generate sample data for all tables and columns
            for table in schema.get("tables", []):
                for column in table.get("columns", []):
                    # Only generate a few samples per column to avoid too much data
                    sample_data.extend(self._generate_column_samples(
                        table["name"], column["name"], column["data_type"], 3
                    ))
        
        return sample_data
    
    def _generate_column_samples(self, table_name: str, column_name: str, 
                                data_type: str, count: int) -> List[Dict[str, Any]]:
        """
        Generate sample data for a specific column.
        
        Args:
            table_name: Name of the table
            column_name: Name of the column
            data_type: Data type of the column
            count: Number of samples to generate
            
        Returns:
            List of sample data dictionaries
        """
        samples = []
        
        for i in range(count):
            # Generate a sample value based on data type
            if data_type == "VARCHAR":
                if "id" in column_name.lower():
                    value = f"{column_name[:3].upper()}{100000 + i}"
                elif "name" in column_name.lower():
                    first_names = ["John", "Jane", "Michael", "Sarah", "David", "Lisa"]
                    last_names = ["Smith", "Johnson", "Brown", "Davis", "Wilson", "Lee"]
                    value = f"{first_names[i % len(first_names)]} {last_names[i % len(last_names)]}"
                elif "email" in column_name.lower():
                    domains = ["gmail.com", "yahoo.com", "outlook.com", "example.com"]
                    value = f"user{i}@{domains[i % len(domains)]}"
                elif "phone" in column_name.lower():
                    value = f"555-{100 + i:03d}-{1000 + i:04d}"
                elif "address" in column_name.lower():
                    value = f"{1000 + i} Main St"
                elif "city" in column_name.lower():
                    cities = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"]
                    value = cities[i % len(cities)]
                elif "state" in column_name.lower():
                    states = ["NY", "CA", "IL", "TX", "AZ"]
                    value = states[i % len(states)]
                elif "zip" in column_name.lower():
                    value = f"{10000 + i}"
                elif "status" in column_name.lower():
                    statuses = ["Active", "Inactive", "Pending", "Suspended"]
                    value = statuses[i % len(statuses)]
                else:
                    value = f"Sample-{column_name}-{i}"
            elif data_type == "INTEGER":
                if "score" in column_name.lower():
                    value = 500 + (i * 50)
                elif "age" in column_name.lower():
                    value = 25 + i
                else:
                    value = i * 1000
            elif data_type == "DECIMAL":
                if "balance" in column_name.lower() or "amount" in column_name.lower():
                    value = 1000.00 + (i * 500.75)
                elif "rate" in column_name.lower():
                    value = 0.01 + (i * 0.005)
                else:
                    value = i * 100.50
            elif data_type == "DATE":
                import datetime
                base_date = datetime.date(2023, 1, 1)
                delta = datetime.timedelta(days=i * 30)
                value = (base_date + delta).isoformat()
            elif data_type == "TIMESTAMP":
                import datetime
                base_date = datetime.datetime(2023, 1, 1, 12, 0, 0)
                delta = datetime.timedelta(days=i, hours=i)
                value = (base_date + delta).isoformat()
            elif data_type == "BOOLEAN":
                value = i % 2 == 0
            else:
                value = f"Unknown-type-{i}"
                
            samples.append({
                "table_name": table_name,
                "column_name": column_name,
                "data_type": data_type,
                "sample_value": value
            })
            
        return samples
    
    def _log_scan(self, source_id: int, source_name: str, schema_info: Dict[str, Any]) -> None:
        """
        Log a scan operation in the agent interactions table.
        
        Args:
            source_id: ID of the source system
            source_name: Name of the source system
            schema_info: Extracted schema information
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Count the tables and columns
            table_count = len(schema_info.get("tables", []))
            column_count = sum(len(table.get("columns", [])) for table in schema_info.get("tables", []))
            
            # Log in the agent interactions table
            cursor.execute(
                """
                INSERT INTO agent_interactions (agent_name, action_type, details, result)
                VALUES (?, ?, ?, ?)
                """,
                (
                    "DataSourceScanner", 
                    "scan_source", 
                    f"Scanned source {source_id} ({source_name})",
                    f"Found {table_count} tables and {column_count} columns"
                )
            )
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error logging scan: {e}")
            
# Create a singleton instance
scanner = DataSourceScanner()

def scan_source(source_id: int) -> Dict[str, Any]:
    """Convenience function to scan a source system"""
    return scanner.scan_source_system(source_id)

def get_sample_data(source_id: int, attribute_name: Optional[str] = None) -> Dict[str, Any]:
    """Convenience function to get sample data"""
    return scanner.get_sample_data(source_id, attribute_name)

def extract_attributes(source_id: int) -> Dict[str, Any]:
    """Convenience function to extract attributes"""
    return scanner.extract_source_attributes(source_id)