"""
Base Agent Module for Customer 360

This module defines the base agent class that all specialized
agents will inherit from, providing common functionality.
"""

import os
import sys
import logging
import json
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable

# Add project root to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from database.setup_db import get_db_connection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    """
    Base agent class that all specialized agents will inherit from.
    
    This class provides common functionality such as:
    - Memory management
    - Interaction history tracking
    - Communication with other agents
    - Action execution
    """
    
    def __init__(self, 
                agent_id: str, 
                name: str, 
                description: str = "", 
                config: Optional[Dict[str, Any]] = None):
        """
        Initialize a new agent.
        
        Args:
            agent_id: Unique identifier for this agent
            name: Human-readable name for this agent
            description: Description of this agent's role and responsibilities
            config: Configuration dictionary
        """
        self.agent_id = agent_id
        self.name = name
        self.description = description
        self.config = config or {}
        self.memory = {}
        self.interaction_history = []
        self.logger = logging.getLogger(f"Agent:{self.name}")
        
    def remember(self, key: str, value: Any) -> None:
        """
        Store a value in the agent's memory.
        
        Args:
            key: Key to store the value under
            value: Value to store
        """
        self.memory[key] = value
        self.logger.debug(f"Remembered {key}: {value}")
        
    def recall(self, key: str) -> Optional[Any]:
        """
        Retrieve a value from the agent's memory.
        
        Args:
            key: Key to retrieve
            
        Returns:
            The stored value, or None if not found
        """
        value = self.memory.get(key)
        self.logger.debug(f"Recalled {key}: {value}")
        return value
        
    def communicate(self, target_agent_id: str, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Communicate with another agent.
        
        Args:
            target_agent_id: ID of the agent to communicate with
            message: Message to send
            
        Returns:
            Response from the target agent
        """
        # In a real multi-agent system, this would involve network calls,
        # message queues, or direct function calls to other agents.
        # For this simulation, we'll just log the communication.
        
        self.logger.info(f"Agent {self.name} sending message to {target_agent_id}")
        
        # Record the interaction in history
        interaction = {
            "timestamp": self._get_timestamp(),
            "source": self.agent_id,
            "target": target_agent_id,
            "message": message
        }
        self.interaction_history.append(interaction)
        
        # Log the interaction in the database
        self._log_interaction("communicate", f"Sent message to {target_agent_id}", str(message))
        
        # In a real system, we would wait for and return the response here
        # For now, we'll just return an acknowledgement
        return {
            "status": "acknowledged",
            "message": f"Message received by {target_agent_id} (simulated)"
        }
        
    def execute_action(self, action: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute an action based on the agent's capabilities.
        
        Args:
            action: Name of the action to execute
            parameters: Parameters for the action
            
        Returns:
            Result of the action
        """
        parameters = parameters or {}
        
        self.logger.info(f"Executing action: {action} with parameters: {parameters}")
        
        # Log the action in the database
        self._log_interaction("execute_action", f"Action: {action}", str(parameters))
        
        # Check if this action is implemented
        action_method = getattr(self, f"action_{action}", None)
        
        if action_method and callable(action_method):
            try:
                result = action_method(**parameters)
                return result
            except Exception as e:
                error_msg = f"Error executing action {action}: {str(e)}"
                self.logger.error(error_msg)
                return {"success": False, "error": error_msg}
        else:
            return {
                "success": False,
                "error": f"Action {action} not supported by {self.name}"
            }
    
    @abstractmethod
    def get_capabilities(self) -> List[Dict[str, Any]]:
        """
        Get the list of capabilities this agent supports.
        
        Returns:
            List of capability dictionaries with name, description, and parameters
        """
        pass
        
    def _log_interaction(self, action_type: str, details: str, result: str) -> None:
        """
        Log an interaction in the database.
        
        Args:
            action_type: Type of action (communicate, execute_action, etc.)
            details: Details of the interaction
            result: Result of the interaction
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
            conn.close()
            
        except Exception as e:
            self.logger.error(f"Error logging interaction: {e}")
            
    def _get_timestamp(self) -> str:
        """Get a formatted timestamp string."""
        from datetime import datetime
        return datetime.now().isoformat()
        
    def __str__(self) -> str:
        return f"{self.name} ({self.agent_id})"
        
    def __repr__(self) -> str:
        return f"<Agent: {self.name}, ID: {self.agent_id}>"