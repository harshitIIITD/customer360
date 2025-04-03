"""
Base Agent Module for Customer 360 Agentic Solution

This module defines the BaseAgent class that all specialized agents will inherit from.
"""

import logging
import sqlite3
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from pathlib import Path
import os
import sys

# Add project root to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from database.setup_db import get_db_connection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

class BaseAgent(ABC):
    """
    Base Agent class for the Customer 360 agentic solution.
    
    All specialized agents should inherit from this class and implement
    the required abstract methods.
    """
    
    def __init__(self, name: str, description: str, model_name: str = "llama3"):
        """
        Initialize the base agent.
        
        Args:
            name: The name of the agent
            description: A description of the agent's role and capabilities
            model_name: The name of the LLM model to use
        """
        self.name = name
        self.description = description
        self.model_name = model_name
        self.logger = logging.getLogger(f"Agent-{name}")
        self.logger.info(f"Initializing agent: {name}")
        self.memory: Dict[str, Any] = {}
        
    @abstractmethod
    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run the agent's main functionality.
        
        Args:
            inputs: Dictionary of input parameters
            
        Returns:
            Dictionary containing the agent's outputs
        """
        pass
    
    def log_interaction(self, action_type: str, details: str, result: str) -> int:
        """
        Log an agent interaction to the database.
        
        Args:
            action_type: Type of action performed
            details: Details about the action
            result: Result of the action
            
        Returns:
            ID of the created log entry
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute(
                """
                INSERT INTO agent_interactions (agent_name, action_type, details, result)
                VALUES (?, ?, ?, ?)
                """,
                (self.name, action_type, details, result)
            )
            
            conn.commit()
            log_id = cursor.lastrowid
            conn.close()
            
            return log_id
        except sqlite3.Error as e:
            self.logger.error(f"Database error: {e}")
            return -1
        
    def get_system_prompt(self, additional_context: str = "") -> str:
        """
        Generate a system prompt for the LLM.
        
        Args:
            additional_context: Additional context to add to the prompt
            
        Returns:
            Formatted system prompt
        """
        base_prompt = f"""You are {self.name}, an AI assistant specialized in {self.description}. 
        Your role is to help build and maintain a Customer 360 data product for retail banking.
        
        The current date is {os.environ.get('CURRENT_DATE', 'unknown')}.
        """
        
        if additional_context:
            base_prompt += f"\n\nAdditional context:\n{additional_context}"
            
        return base_prompt
    
    def get_memory(self, key: str) -> Any:
        """Get a value from agent memory"""
        return self.memory.get(key)
    
    def set_memory(self, key: str, value: Any) -> None:
        """Store a value in agent memory"""
        self.memory[key] = value
        
    def clear_memory(self) -> None:
        """Clear the agent's memory"""
        self.memory = {}