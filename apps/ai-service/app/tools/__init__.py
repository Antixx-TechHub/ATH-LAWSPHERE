"""
Tools module for LawSphere AI Agent
Provides real legal research tools integrated with Indian Kanoon, E-Courts, and public legal databases.
"""

from .tool_registry import (
    AVAILABLE_TOOLS,
    TOOL_MAP,
    TOOL_METADATA,
    ToolCategory,
    ToolMetadata,
    get_tool_by_name,
    get_tools_by_category,
    get_privacy_safe_tools,
    get_legal_tools,
    get_tool_descriptions,
)

from .external_apis import (
    get_weather,
    web_search,
    get_current_datetime,
    calculate,
)

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

__all__ = [
    # Registry
    "AVAILABLE_TOOLS",
    "TOOL_MAP",
    "TOOL_METADATA",
    "ToolCategory",
    "ToolMetadata",
    "get_tool_by_name",
    "get_tools_by_category",
    "get_privacy_safe_tools",
    "get_legal_tools",
    "get_tool_descriptions",
    
    # External APIs
    "get_weather",
    "web_search",
    "get_current_datetime",
    "calculate",
    
    # Legal Tools (Real integrations)
    "search_indian_kanoon",
    "get_ipc_section",
    "search_supreme_court",
    "search_high_court",
    "get_case_status",
    "get_bare_act",
    "legal_citation_lookup",
    "LEGAL_TOOLS",
]
