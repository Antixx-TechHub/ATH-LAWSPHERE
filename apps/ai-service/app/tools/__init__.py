"""
Lawsphere AI Tools Module
External API integrations and utility tools for the LangGraph agent.
"""

from .external_apis import (
    get_weather,
    web_search,
    get_current_datetime,
    calculate,
)
from .legal_tools import (
    search_case_law,
    search_statutes,
    analyze_document,
)
from .tool_registry import AVAILABLE_TOOLS, get_tool_by_name

__all__ = [
    # External APIs
    "get_weather",
    "web_search", 
    "get_current_datetime",
    "calculate",
    # Legal Tools
    "search_case_law",
    "search_statutes",
    "analyze_document",
    # Registry
    "AVAILABLE_TOOLS",
    "get_tool_by_name",
]
