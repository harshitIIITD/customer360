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
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.")
            
        return [{
            'model': 'gpt-4',  # Using GPT-3.5-turbo instead of GPT-4
            'api_key': api_key,
        }]
    elif provider == "anthropic":
        # Use Anthropic Claude configuration if present
        return [{
            'model': 'claude-3-opus-20240229',
            'api_key': os.environ.get('ANTHROPIC_API_KEY'),
        }]
    elif provider == "ollama":
        # Simplified configuration for Ollama - just providing the model name
        return [{
            'model': 'llama3',
        }]
    else:
        # Default to an empty config that will use default settings
        return []