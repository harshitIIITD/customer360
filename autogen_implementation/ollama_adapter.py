"""
Ollama Adapter for AutoGen

This module provides an adapter to connect AutoGen with Ollama.
"""

import os
import json
import requests
from typing import Dict, List, Any, Optional

class OllamaAdapter:
    """
    Adapter class to connect AutoGen with local Ollama instance.
    """
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3"):
        """
        Initialize the Ollama adapter.
        
        Args:
            base_url: Base URL for the Ollama API
            model: Model name to use
        """
        self.base_url = base_url
        self.model = model
        self.generate_url = f"{base_url}/api/generate"
        
    def generate(self, prompt: str, **kwargs) -> str:
        """
        Generate a response from Ollama model.
        
        Args:
            prompt: Input prompt text
            **kwargs: Additional parameters for generation
            
        Returns:
            Generated text response
        """
        # Prepare the request payload
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }
        
        # Add optional parameters
        if "temperature" in kwargs:
            payload["temperature"] = kwargs["temperature"]
        if "max_tokens" in kwargs:
            payload["max_tokens"] = kwargs["max_tokens"]
        
        # Make the API request
        response = requests.post(self.generate_url, json=payload)
        
        # Handle errors
        if response.status_code != 200:
            error_msg = f"Ollama API error {response.status_code}: {response.text}"
            print(error_msg)
            return f"Error: {error_msg}"
            
        # Extract and return the generated text
        try:
            result = response.json()
            return result.get("response", "")
        except Exception as e:
            print(f"Error parsing Ollama response: {e}")
            return f"Error parsing response: {str(e)}"

# Function to get a configured Ollama adapter
def get_ollama_adapter(model: str = "llama3") -> OllamaAdapter:
    """
    Get a configured Ollama adapter instance.
    
    Args:
        model: Model name to use
        
    Returns:
        Configured OllamaAdapter instance
    """
    base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    return OllamaAdapter(base_url=base_url, model=model)