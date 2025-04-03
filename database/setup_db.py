import os
import sqlite3
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database configuration
DB_PATH = Path(__file__).parent.parent / "data" / "customer360.db"

def create_database():
    """Create the Customer360 database and tables from the schema file."""
    # Ensure the data directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    try:
        # Connect to the database (creates it if it doesn't exist)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Read the schema SQL file
        schema_path = Path(__file__).parent / "schema.sql"
        with open(schema_path, 'r') as schema_file:
            schema_sql = schema_file.read()
            
        # Execute the SQL commands
        cursor.executescript(schema_sql)
        conn.commit()
        logger.info(f"Database initialized successfully at {DB_PATH}")
        
        # Verify tables were created
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [table[0] for table in cursor.fetchall() if not table[0].startswith('sqlite_')]
        logger.info(f"Created tables: {', '.join(tables)}")
        
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Error creating database: {e}")
        return False

def get_db_connection():
    """Get a connection to the database."""
    if not os.path.exists(DB_PATH):
        create_database()
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

if __name__ == "__main__":
    # Create the database if run directly
    success = create_database()
    if success:
        print(f"✅ Database initialized at {DB_PATH}")
    else:
        print("❌ Failed to initialize database")