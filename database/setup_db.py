"""
Database Setup Module for Customer 360

This module handles database initialization and connection management
for the Customer 360 agentic solution.
"""

import os
import sqlite3
import logging
from pathlib import Path
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_db_path() -> str:
    """Get the database file path from configuration or default."""
    # In a real implementation, this would read from a config file
    db_dir = Path(__file__).parent.parent / "data"
    os.makedirs(db_dir, exist_ok=True)
    return str(db_dir / "customer360.db")

def get_schema_path() -> str:
    """Get the SQL schema file path."""
    return str(Path(__file__).parent / "schema.sql")

def get_db_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    """
    Get a connection to the SQLite database with row factory.
    
    Args:
        db_path: Optional path to the database file. If None, uses the default path.
        
    Returns:
        SQLite connection object
    """
    if db_path is None:
        db_path = get_db_path()
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

def init_db(db_path: Optional[str] = None, schema_path: Optional[str] = None) -> bool:
    """
    Initialize the database with the schema.
    
    Args:
        db_path: Path to the database file
        schema_path: Path to the schema SQL file
        
    Returns:
        True if successful, False otherwise
    """
    if db_path is None:
        db_path = get_db_path()
    
    if schema_path is None:
        schema_path = get_schema_path()
        
    logger.info(f"Initializing database at {db_path} with schema from {schema_path}")
    
    try:
        # Ensure the directory exists
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        # Connect to the database and create tables
        conn = sqlite3.connect(db_path)
        
        # Read the schema file
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
            
        # Execute the schema
        conn.executescript(schema_sql)
        conn.commit()
        conn.close()
        
        logger.info("Database initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        return False

def create_database() -> bool:
    """
    Create the database if it doesn't exist, or verify it if it does.
    
    Returns:
        True if successful, False otherwise
    """
    db_path = get_db_path()
    
    # Check if database exists
    if os.path.exists(db_path):
        logger.info(f"Database already exists at {db_path}, verifying...")
        
        try:
            # Check if we can connect and query a table
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Try to query the source_systems table
            cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='source_systems'")
            result = cursor.fetchone()
            
            if result and result[0] > 0:
                logger.info("Database structure verified")
                conn.close()
                return True
            else:
                logger.warning("Database exists but missing required tables, reinitializing...")
                conn.close()
                return init_db()
                
        except Exception as e:
            logger.error(f"Error verifying database: {e}")
            return False
    else:
        logger.info(f"Database does not exist at {db_path}, creating...")
        return init_db()
        
def add_source_system(name: str, description: str, owner: str) -> Dict[str, Any]:
    """
    Add a new source system to the database.
    
    Args:
        name: Name of the source system
        description: Description of the source system
        owner: Owner/department responsible for the source system
        
    Returns:
        Dictionary with operation result
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if source system already exists
        cursor.execute("SELECT id FROM source_systems WHERE system_name = ?", (name,))
        existing = cursor.fetchone()
        
        if existing:
            return {
                "success": False, 
                "error": f"Source system '{name}' already exists with ID {existing['id']}"
            }
        
        # Insert the new source system
        cursor.execute(
            "INSERT INTO source_systems (system_name, description, data_owner) VALUES (?, ?, ?)",
            (name, description, owner)
        )
        
        source_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        logger.info(f"Added new source system: {name} (ID: {source_id})")
        
        return {
            "success": True,
            "source_id": source_id,
            "message": f"Source system '{name}' added with ID {source_id}"
        }
        
    except Exception as e:
        error_msg = f"Error adding source system: {e}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

def add_customer_attribute(name: str, data_type: str, description: str, is_pii: bool = False, 
                         category: str = "other") -> Dict[str, Any]:
    """
    Add a new customer attribute to the database.
    
    Args:
        name: Attribute name
        data_type: Data type (TEXT, INTEGER, REAL, DATE, etc.)
        description: Description of the attribute
        is_pii: Whether this attribute contains PII
        category: Category of the attribute (demographic, financial, etc.)
        
    Returns:
        Dictionary with operation result
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if attribute already exists
        cursor.execute("SELECT id FROM customer_attributes WHERE attribute_name = ?", (name,))
        existing = cursor.fetchone()
        
        if existing:
            return {
                "success": False,
                "error": f"Attribute '{name}' already exists with ID {existing['id']}"
            }
            
        # Insert the new attribute
        cursor.execute(
            """
            INSERT INTO customer_attributes 
            (attribute_name, data_type, description, is_pii, category) 
            VALUES (?, ?, ?, ?, ?)
            """,
            (name, data_type, description, 1 if is_pii else 0, category)
        )
        
        attr_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        logger.info(f"Added new customer attribute: {name} (ID: {attr_id})")
        
        return {
            "success": True,
            "attribute_id": attr_id,
            "message": f"Customer attribute '{name}' added with ID {attr_id}"
        }
        
    except Exception as e:
        error_msg = f"Error adding customer attribute: {e}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

def add_data_mapping(source_system_id: int, source_attribute: str, 
                   target_attribute_id: int, transformation_logic: str = "",
                   created_by: str = "system") -> Dict[str, Any]:
    """
    Add a new data mapping between source and target attributes.
    
    Args:
        source_system_id: ID of the source system
        source_attribute: Name of the source attribute (may be in table.column format)
        target_attribute_id: ID of the target customer attribute
        transformation_logic: Code or logic for transforming the data
        created_by: Who/what created this mapping
        
    Returns:
        Dictionary with operation result
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify source system exists
        cursor.execute("SELECT id FROM source_systems WHERE id = ?", (source_system_id,))
        source = cursor.fetchone()
        
        if not source:
            return {"success": False, "error": f"Source system with ID {source_system_id} not found"}
            
        # Verify target attribute exists
        cursor.execute("SELECT id FROM customer_attributes WHERE id = ?", (target_attribute_id,))
        target = cursor.fetchone()
        
        if not target:
            return {"success": False, "error": f"Target attribute with ID {target_attribute_id} not found"}
            
        # Check if mapping already exists
        cursor.execute(
            """
            SELECT id FROM data_mappings 
            WHERE source_system_id = ? AND source_attribute = ? AND target_attribute_id = ?
            """,
            (source_system_id, source_attribute, target_attribute_id)
        )
        existing = cursor.fetchone()
        
        if existing:
            # Update the existing mapping
            cursor.execute(
                """
                UPDATE data_mappings 
                SET transformation_logic = ?, created_by = ?, mapping_status = 'proposed',
                    created_at = CURRENT_TIMESTAMP, validated_at = NULL
                WHERE id = ?
                """,
                (transformation_logic, created_by, existing['id'])
            )
            
            mapping_id = existing['id']
            message = f"Updated existing mapping with ID {mapping_id}"
        else:
            # Insert the new mapping
            cursor.execute(
                """
                INSERT INTO data_mappings 
                (source_system_id, source_attribute, target_attribute_id, transformation_logic, created_by) 
                VALUES (?, ?, ?, ?, ?)
                """,
                (source_system_id, source_attribute, target_attribute_id, transformation_logic, created_by)
            )
            
            mapping_id = cursor.lastrowid
            message = f"Created new mapping with ID {mapping_id}"
            
        conn.commit()
        conn.close()
        
        logger.info(f"Added/updated data mapping: {source_attribute} to attribute ID {target_attribute_id} (ID: {mapping_id})")
        
        return {
            "success": True,
            "mapping_id": mapping_id,
            "message": message
        }
        
    except Exception as e:
        error_msg = f"Error adding data mapping: {e}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

def add_certification(cert_type: str, notes: str = "") -> Dict[str, Any]:
    """
    Add a new certification record.
    
    Args:
        cert_type: Type of certification
        notes: Additional notes
        
    Returns:
        Dictionary with operation result
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert the new certification
        cursor.execute(
            """
            INSERT INTO certifications 
            (certification_type, notes) 
            VALUES (?, ?)
            """,
            (cert_type, notes)
        )
        
        cert_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        logger.info(f"Added new certification: {cert_type} (ID: {cert_id})")
        
        return {
            "success": True,
            "certification_id": cert_id,
            "message": f"Certification of type '{cert_type}' added with ID {cert_id}"
        }
        
    except Exception as e:
        error_msg = f"Error adding certification: {e}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

def update_certification(cert_id: int, status: str, notes: str = "",
                       certified_by: str = "") -> Dict[str, Any]:
    """
    Update an existing certification record.
    
    Args:
        cert_id: ID of the certification to update
        status: New certification status
        notes: Additional notes
        certified_by: Who certified this
        
    Returns:
        Dictionary with operation result
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if certification exists
        cursor.execute("SELECT id FROM certifications WHERE id = ?", (cert_id,))
        existing = cursor.fetchone()
        
        if not existing:
            return {"success": False, "error": f"Certification with ID {cert_id} not found"}
            
        # Update the certification
        if status.lower() == "certified":
            cursor.execute(
                """
                UPDATE certifications 
                SET certification_status = ?, notes = ?, certified_by = ?, certified_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (status, notes, certified_by, cert_id)
            )
        else:
            cursor.execute(
                """
                UPDATE certifications 
                SET certification_status = ?, notes = ?
                WHERE id = ?
                """,
                (status, notes, cert_id)
            )
            
        conn.commit()
        conn.close()
        
        logger.info(f"Updated certification {cert_id} with status: {status}")
        
        return {
            "success": True,
            "certification_id": cert_id,
            "message": f"Certification {cert_id} updated with status '{status}'"
        }
        
    except Exception as e:
        error_msg = f"Error updating certification: {e}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

if __name__ == "__main__":
    # Create the database when run directly
    create_database()