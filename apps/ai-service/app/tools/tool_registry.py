"""
Tool Registry for LangGraph Agent
Centralized registry of all available tools with metadata.
"""

from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from enum import Enum

from .external_apis import get_weather, web_search, get_current_datetime, calculate
from .legal_tools import search_case_law, search_statutes, analyze_document, legal_calendar


class ToolCategory(Enum):
    """Categories of tools"""
    REAL_TIME = "real_time"       # Weather, time, live data
    SEARCH = "search"             # Web search, knowledge lookup
    LEGAL = "legal"               # Legal research tools
    CALCULATION = "calculation"   # Math and computation
    DOCUMENT = "document"         # Document analysis


@dataclass
class ToolMetadata:
    """Metadata for a tool"""
    name: str
    description: str
    category: ToolCategory
    requires_api_key: bool
    api_key_env: Optional[str]
    is_async: bool
    privacy_safe: bool  # True if no data leaves local environment


# Tool registry with metadata
TOOL_METADATA: Dict[str, ToolMetadata] = {
    "get_weather": ToolMetadata(
        name="get_weather",
        description="Get current weather for any location worldwide",
        category=ToolCategory.REAL_TIME,
        requires_api_key=False,  # Falls back to wttr.in
        api_key_env="OPENWEATHER_API_KEY",
        is_async=True,
        privacy_safe=True,  # Only sends location name
    ),
    "web_search": ToolMetadata(
        name="web_search",
        description="Search the web for current information",
        category=ToolCategory.SEARCH,
        requires_api_key=False,  # Falls back to DuckDuckGo
        api_key_env="SERPAPI_KEY",
        is_async=True,
        privacy_safe=False,  # Query goes to external API
    ),
    "get_current_datetime": ToolMetadata(
        name="get_current_datetime",
        description="Get current date and time in any timezone",
        category=ToolCategory.REAL_TIME,
        requires_api_key=False,
        api_key_env=None,
        is_async=False,
        privacy_safe=True,  # Local computation only
    ),
    "calculate": ToolMetadata(
        name="calculate",
        description="Evaluate mathematical expressions",
        category=ToolCategory.CALCULATION,
        requires_api_key=False,
        api_key_env=None,
        is_async=False,
        privacy_safe=True,  # Local computation only
    ),
    "search_case_law": ToolMetadata(
        name="search_case_law",
        description="Search legal case law databases",
        category=ToolCategory.LEGAL,
        requires_api_key=True,
        api_key_env="INDIANKANOON_API_KEY",
        is_async=True,
        privacy_safe=False,  # Query goes to legal database
    ),
    "search_statutes": ToolMetadata(
        name="search_statutes",
        description="Search statutory provisions and acts",
        category=ToolCategory.LEGAL,
        requires_api_key=False,
        api_key_env=None,
        is_async=True,
        privacy_safe=True,  # Can be local database
    ),
    "analyze_document": ToolMetadata(
        name="analyze_document",
        description="Analyze legal documents for key provisions and risks",
        category=ToolCategory.DOCUMENT,
        requires_api_key=False,
        api_key_env=None,
        is_async=True,
        privacy_safe=True,  # Processed locally
    ),
    "legal_calendar": ToolMetadata(
        name="legal_calendar",
        description="Get court holidays and legal calendar information",
        category=ToolCategory.LEGAL,
        requires_api_key=False,
        api_key_env=None,
        is_async=True,
        privacy_safe=True,
    ),
}

# All available tools
AVAILABLE_TOOLS = [
    # Real-time tools
    get_weather,
    get_current_datetime,
    
    # Search tools  
    web_search,
    
    # Calculation tools
    calculate,
    
    # Legal tools
    search_case_law,
    search_statutes,
    analyze_document,
    legal_calendar,
]

# Tool name to function mapping
TOOL_MAP: Dict[str, Callable] = {
    "get_weather": get_weather,
    "web_search": web_search,
    "get_current_datetime": get_current_datetime,
    "calculate": calculate,
    "search_case_law": search_case_law,
    "search_statutes": search_statutes,
    "analyze_document": analyze_document,
    "legal_calendar": legal_calendar,
}


def get_tool_by_name(name: str) -> Optional[Callable]:
    """Get a tool function by its name."""
    return TOOL_MAP.get(name)


def get_tools_by_category(category: ToolCategory) -> List[Callable]:
    """Get all tools in a specific category."""
    return [
        TOOL_MAP[name]
        for name, meta in TOOL_METADATA.items()
        if meta.category == category and name in TOOL_MAP
    ]


def get_privacy_safe_tools() -> List[Callable]:
    """Get tools that don't send data to external APIs."""
    return [
        TOOL_MAP[name]
        for name, meta in TOOL_METADATA.items()
        if meta.privacy_safe and name in TOOL_MAP
    ]


def get_tool_descriptions() -> str:
    """Get formatted descriptions of all tools for the system prompt."""
    descriptions = []
    for name, meta in TOOL_METADATA.items():
        descriptions.append(f"- **{name}**: {meta.description}")
    return "\n".join(descriptions)
