"""
Tool Registry for LangGraph Agent
Centralized registry of all available tools with metadata.
"""

from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from enum import Enum

from .external_apis import get_weather, web_search, get_current_datetime, calculate
from .legal_tools import (
    search_indian_kanoon,
    get_ipc_section,
    search_supreme_court,
    search_high_court,
    get_case_status,
    get_bare_act,
    legal_citation_lookup,
    LEGAL_TOOLS,
)


class ToolCategory(Enum):
    """Categories of tools"""
    REAL_TIME = "real_time"
    SEARCH = "search"
    LEGAL = "legal"
    CALCULATION = "calculation"
    DOCUMENT = "document"


@dataclass
class ToolMetadata:
    """Metadata for a tool"""
    name: str
    description: str
    category: ToolCategory
    requires_api_key: bool
    api_key_env: Optional[str]
    is_async: bool
    privacy_safe: bool


TOOL_METADATA: Dict[str, ToolMetadata] = {
    "get_weather": ToolMetadata(
        name="get_weather",
        description="Get current weather for any location worldwide",
        category=ToolCategory.REAL_TIME,
        requires_api_key=False,
        api_key_env="OPENWEATHER_API_KEY",
        is_async=True,
        privacy_safe=True,
    ),
    "web_search": ToolMetadata(
        name="web_search",
        description="Search the web for current information",
        category=ToolCategory.SEARCH,
        requires_api_key=False,
        api_key_env="SERPAPI_KEY",
        is_async=True,
        privacy_safe=False,
    ),
    "get_current_datetime": ToolMetadata(
        name="get_current_datetime",
        description="Get current date and time in any timezone",
        category=ToolCategory.REAL_TIME,
        requires_api_key=False,
        api_key_env=None,
        is_async=False,
        privacy_safe=True,
    ),
    "calculate": ToolMetadata(
        name="calculate",
        description="Evaluate mathematical expressions",
        category=ToolCategory.CALCULATION,
        requires_api_key=False,
        api_key_env=None,
        is_async=False,
        privacy_safe=True,
    ),
    "search_indian_kanoon": ToolMetadata(
        name="search_indian_kanoon",
        description="Search Indian Kanoon for case law, judgments, and legal documents",
        category=ToolCategory.LEGAL,
        requires_api_key=False,
        api_key_env=None,
        is_async=True,
        privacy_safe=False,
    ),
    "get_ipc_section": ToolMetadata(
        name="get_ipc_section",
        description="Get details of any Indian Penal Code (IPC) section",
        category=ToolCategory.LEGAL,
        requires_api_key=False,
        api_key_env=None,
        is_async=True,
        privacy_safe=True,
    ),
    "search_supreme_court": ToolMetadata(
        name="search_supreme_court",
        description="Search Supreme Court of India judgments and orders",
        category=ToolCategory.LEGAL,
        requires_api_key=False,
        api_key_env=None,
        is_async=True,
        privacy_safe=False,
    ),
    "search_high_court": ToolMetadata(
        name="search_high_court",
        description="Search High Court judgments from any Indian High Court",
        category=ToolCategory.LEGAL,
        requires_api_key=False,
        api_key_env=None,
        is_async=True,
        privacy_safe=False,
    ),
    "get_case_status": ToolMetadata(
        name="get_case_status",
        description="Get case status information with links to E-Courts",
        category=ToolCategory.LEGAL,
        requires_api_key=False,
        api_key_env=None,
        is_async=True,
        privacy_safe=True,
    ),
    "get_bare_act": ToolMetadata(
        name="get_bare_act",
        description="Get information about Indian Acts and Statutes",
        category=ToolCategory.LEGAL,
        requires_api_key=False,
        api_key_env=None,
        is_async=True,
        privacy_safe=True,
    ),
    "legal_citation_lookup": ToolMetadata(
        name="legal_citation_lookup",
        description="Look up legal citations (AIR, SCC, SCR) to find cases",
        category=ToolCategory.LEGAL,
        requires_api_key=False,
        api_key_env=None,
        is_async=True,
        privacy_safe=False,
    ),
}

AVAILABLE_TOOLS = [
    get_weather,
    get_current_datetime,
    web_search,
    calculate,
    search_indian_kanoon,
    get_ipc_section,
    search_supreme_court,
    search_high_court,
    get_case_status,
    get_bare_act,
    legal_citation_lookup,
]

TOOL_MAP: Dict[str, Callable] = {
    "get_weather": get_weather,
    "web_search": web_search,
    "get_current_datetime": get_current_datetime,
    "calculate": calculate,
    "search_indian_kanoon": search_indian_kanoon,
    "get_ipc_section": get_ipc_section,
    "search_supreme_court": search_supreme_court,
    "search_high_court": search_high_court,
    "get_case_status": get_case_status,
    "get_bare_act": get_bare_act,
    "legal_citation_lookup": legal_citation_lookup,
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


def get_legal_tools() -> List[Callable]:
    """Get all legal research tools."""
    return get_tools_by_category(ToolCategory.LEGAL)


def get_tool_descriptions() -> str:
    """Get formatted descriptions of all tools for the system prompt."""
    descriptions = []
    categories = {
        ToolCategory.LEGAL: "Legal Research",
        ToolCategory.SEARCH: "Web Search",
        ToolCategory.REAL_TIME: "Real-Time Info",
        ToolCategory.CALCULATION: "Calculations",
    }
    for category, label in categories.items():
        cat_tools = [
            (name, meta) for name, meta in TOOL_METADATA.items()
            if meta.category == category
        ]
        if cat_tools:
            descriptions.append(f"\n**{label}**")
            for name, meta in cat_tools:
                descriptions.append(f"- **{name}**: {meta.description}")
    return "\n".join(descriptions)
