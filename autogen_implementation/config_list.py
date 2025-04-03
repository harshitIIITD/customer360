"""
AutoGen Configuration Settings

This module provides configuration settings for AutoGen models,
supporting different LLM providers.
"""

import os
from typing import List, Dict, Any

def get_config_list(provider: str = "ollama") -> List[Dict[str, Any]]:
    """
    Get configuration for the specified provider.
    
    Args:
        provider: LLM provider name ('openai', 'anthropic', or 'ollama')
        
    Returns:
        List of configuration dictionaries
    """
    if provider == "openai":
        # Use OpenAI configuration if present
        return [{
            'model': 'gpt-4',
            'api_key': os.environ.get('OPENAI_API_KEY'),
        }]
    elif provider == "anthropic":
        # Use Anthropic Claude configuration if present
        return [{
            'model': 'claude-3-opus-20240229',
            'api_key': os.environ.get('ANTHROPIC_API_KEY'),
        }]
    elif provider == "ollama":
        # Use Ollama for local model inference
        return [{
            'model': 'llama3',
            'base_url': os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434'),
            'api_key': 'ollama',  # Not actually used but required by autogen
        }]
    else:
        # Default to an empty config that will use default settings
        return []