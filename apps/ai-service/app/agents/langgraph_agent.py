"""
LangGraph-based Legal AI Agent with Tool Calling
Full agentic workflow with intent detection, tool execution, and response generation.
"""

from typing import TypedDict, Annotated, Sequence, Optional, List, Dict, Any, Literal
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import (
    HumanMessage, 
    AIMessage, 
    SystemMessage, 
    BaseMessage,
    ToolMessage,
)
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_community.chat_models import ChatOllama
import operator
import uuid
import json
import structlog
from datetime import datetime

from ..tools.tool_registry import AVAILABLE_TOOLS, get_tool_by_name, get_tool_descriptions

logger = structlog.get_logger()


# ============================================================================
# Agent State
# ============================================================================

class AgentState(TypedDict):
    """State maintained across the LangGraph agent execution."""
    messages: Annotated[Sequence[BaseMessage], operator.add]
    session_id: str
    user_id: Optional[str]
    
    # Tool execution tracking
    tools_called: List[str]
    tool_results: Dict[str, Any]
    
    # Routing decisions
    needs_tools: bool
    intent: str
    complexity: str
    
    # Metadata
    started_at: datetime
    model_used: str


# ============================================================================
# System Prompts
# ============================================================================

SYSTEM_PROMPT_WITH_TOOLS = """You are Lawsphere AI, an expert legal assistant with access to real-time tools and legal research capabilities.

## Your Capabilities

### Real-Time Tools Available:
{tool_descriptions}

### When to Use Tools:
- **Weather queries**: Use `get_weather` for current weather in any city
- **Current date/time**: Use `get_current_datetime` for accurate timestamps
- **Web search**: Use `web_search` for recent news, events, or information not in your training
- **Calculations**: Use `calculate` for any math (GST, interest, penalties, etc.)
- **Legal research**: Use `search_case_law` and `search_statutes` for legal citations

### Tool Usage Guidelines:
1. ALWAYS use tools when the query requires real-time or current information
2. For weather, stock prices, news - these REQUIRE tool calls
3. For date calculations, court schedules - use appropriate tools
4. If unsure whether you have current data, use a tool to verify

## Legal Expertise:
- Analyze case law, statutes, and regulations
- Review and summarize legal documents
- Draft legal documents and correspondence
- Identify relevant precedents and legal arguments
- Analyze contract terms and identify issues

## Response Guidelines:
- Always cite relevant laws and cases when applicable
- Provide balanced analysis considering multiple perspectives
- Flag potential risks clearly
- Use professional legal language
- Recommend consulting a licensed attorney for specific matters

## Response Format:
- Structure with clear headings
- Use bullet points for lists
- Provide citations in proper legal format
- Include summaries for longer responses

Remember: You assist legal professionals. Always recommend professional legal counsel for specific legal matters."""


INTENT_CLASSIFIER_PROMPT = """Analyze this user query and classify it.

Query: {query}

Respond with a JSON object containing:
{{
    "needs_tools": true/false,
    "intent": "weather|search|calculation|legal_research|document_analysis|general_query|conversation",
    "tool_to_use": "tool_name or null",
    "complexity": "simple|moderate|complex",
    "reasoning": "brief explanation"
}}

Tool mapping:
- Weather/climate questions → get_weather
- "What time is it", dates → get_current_datetime
- Current news, events, "latest" → web_search
- Math, GST, calculations → calculate
- Case law, judgments → search_case_law
- Acts, sections, statutes → search_statutes
- General legal questions → null (no tool needed)

Respond ONLY with the JSON object, no other text."""


# ============================================================================
# LangGraph Agent
# ============================================================================

class LangGraphLegalAgent:
    """
    Full LangGraph-based agent with tool calling capabilities.
    
    Graph Structure:
    [START] → [classify_intent] → [should_use_tool?]
                                        ↓ Yes         ↓ No
                                  [call_tool] → [generate_response] → [END]
    """
    
    def __init__(self, llm: Any):
        """
        Initialize the agent with an LLM.
        
        Args:
            llm: A LangChain-compatible LLM (ChatOllama, ChatOpenAI, etc.)
        """
        self.llm = llm
        
        # Bind tools to LLM if it supports tool calling
        try:
            self.llm_with_tools = llm.bind_tools(AVAILABLE_TOOLS)
            self.tools_enabled = True
            logger.info("LLM tools bound successfully", tool_count=len(AVAILABLE_TOOLS))
        except Exception as e:
            logger.warning("LLM doesn't support native tool binding, using manual tool calling", error=str(e))
            self.llm_with_tools = llm
            self.tools_enabled = False
        
        # Build the graph
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow with tool nodes."""
        
        workflow = StateGraph(AgentState)
        
        # Add nodes
        workflow.add_node("classify_intent", self._classify_intent)
        workflow.add_node("execute_tools", self._execute_tools)
        workflow.add_node("generate_response", self._generate_response)
        
        # Set entry point
        workflow.set_entry_point("classify_intent")
        
        # Add conditional edge based on whether tools are needed
        workflow.add_conditional_edges(
            "classify_intent",
            self._route_after_intent,
            {
                "use_tools": "execute_tools",
                "respond": "generate_response",
            }
        )
        
        # After tool execution, generate response
        workflow.add_edge("execute_tools", "generate_response")
        
        # End after response
        workflow.add_edge("generate_response", END)
        
        return workflow.compile()
    
    def _route_after_intent(self, state: AgentState) -> Literal["use_tools", "respond"]:
        """Determine whether to use tools or respond directly."""
        if state.get("needs_tools", False):
            return "use_tools"
        return "respond"
    
    async def _classify_intent(self, state: AgentState) -> Dict[str, Any]:
        """Classify the user's intent and determine if tools are needed."""
        
        # Get the last user message
        user_message = ""
        for msg in reversed(state["messages"]):
            if isinstance(msg, HumanMessage):
                user_message = msg.content
                break
        
        logger.info("Classifying intent", query_preview=user_message[:100])
        
        # Quick pattern matching for obvious tool needs
        query_lower = user_message.lower()
        
        # Weather patterns
        weather_keywords = ["weather", "temperature", "rain", "sunny", "forecast", "climate", "hot", "cold"]
        if any(kw in query_lower for kw in weather_keywords):
            # Check for location indicators
            location_patterns = ["in ", "at ", "for ", "of "]
            if any(p in query_lower for p in location_patterns) or "today" in query_lower or "now" in query_lower:
                return {
                    "needs_tools": True,
                    "intent": "weather",
                    "complexity": "simple",
                }
        
        # Time/date patterns
        time_keywords = ["what time", "current time", "what date", "today's date", "what day"]
        if any(kw in query_lower for kw in time_keywords):
            return {
                "needs_tools": True,
                "intent": "datetime",
                "complexity": "simple",
            }
        
        # Search patterns (current events, news)
        search_keywords = ["latest", "recent", "current news", "today's news", "happening now", "breaking"]
        if any(kw in query_lower for kw in search_keywords):
            return {
                "needs_tools": True,
                "intent": "search",
                "complexity": "simple",
            }
        
        # Calculation patterns
        calc_patterns = ["calculate", "compute", "what is", "how much is", "gst", "%", "percent", "interest"]
        has_numbers = any(char.isdigit() for char in user_message)
        if has_numbers and any(p in query_lower for p in calc_patterns):
            return {
                "needs_tools": True,
                "intent": "calculation",
                "complexity": "simple",
            }
        
        # Default: no tools needed
        return {
            "needs_tools": False,
            "intent": "general_query",
            "complexity": "moderate",
        }
    
    async def _execute_tools(self, state: AgentState) -> Dict[str, Any]:
        """Execute the appropriate tool based on intent."""
        
        intent = state.get("intent", "")
        tools_called = []
        tool_results = {}
        
        # Get the user query
        user_message = ""
        for msg in reversed(state["messages"]):
            if isinstance(msg, HumanMessage):
                user_message = msg.content
                break
        
        logger.info("Executing tools", intent=intent, query_preview=user_message[:50])
        
        try:
            if intent == "weather":
                # Extract location from query
                location = self._extract_location(user_message)
                tool = get_tool_by_name("get_weather")
                if tool:
                    result = await tool.ainvoke({"location": location})
                    tools_called.append("get_weather")
                    tool_results["weather"] = result
            
            elif intent == "datetime":
                tool = get_tool_by_name("get_current_datetime")
                if tool:
                    result = tool.invoke({"timezone": "Asia/Kolkata"})
                    tools_called.append("get_current_datetime")
                    tool_results["datetime"] = result
            
            elif intent == "search":
                tool = get_tool_by_name("web_search")
                if tool:
                    result = await tool.ainvoke({"query": user_message, "num_results": 5})
                    tools_called.append("web_search")
                    tool_results["search"] = result
            
            elif intent == "calculation":
                # Extract expression from query
                expression = self._extract_expression(user_message)
                tool = get_tool_by_name("calculate")
                if tool and expression:
                    result = tool.invoke({"expression": expression})
                    tools_called.append("calculate")
                    tool_results["calculation"] = result
            
        except Exception as e:
            logger.error("Tool execution error", error=str(e), intent=intent)
            tool_results["error"] = str(e)
        
        return {
            "tools_called": tools_called,
            "tool_results": tool_results,
        }
    
    def _extract_location(self, query: str) -> str:
        """Extract location from a weather query."""
        query_lower = query.lower()
        
        # Common patterns: "weather in X", "weather at X", "weather of X"
        patterns = [" in ", " at ", " for ", " of "]
        
        for pattern in patterns:
            if pattern in query_lower:
                idx = query_lower.find(pattern)
                location = query[idx + len(pattern):].strip()
                # Clean up: remove trailing punctuation and common words
                location = location.rstrip("?.,!").split(" today")[0].split(" now")[0].split(" right")[0]
                return location.strip() or "Pune"  # Default to Pune
        
        # Try to find city names (simple approach)
        words = query.split()
        for i, word in enumerate(words):
            if word.lower() in ["weather", "temperature"]:
                # Check next words
                if i + 1 < len(words):
                    return " ".join(words[i+1:]).rstrip("?.,!")
        
        return "Pune"  # Default location
    
    def _extract_expression(self, query: str) -> Optional[str]:
        """Extract mathematical expression from a query."""
        import re
        
        # Look for numeric expressions
        # Simple patterns: "calculate 100 * 1.18", "what is 5000 + 2000"
        patterns = [
            r"calculate\s+(.+?)(?:\?|$)",
            r"what is\s+(.+?)(?:\?|$)",
            r"compute\s+(.+?)(?:\?|$)",
            r"(\d+[\s\d\+\-\*\/\.\(\)%]+\d+)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                expr = match.group(1).strip()
                # Convert percentage to decimal for calculation
                expr = expr.replace("%", "/100")
                return expr
        
        return None
    
    async def _generate_response(self, state: AgentState) -> Dict[str, Any]:
        """Generate the final response, incorporating tool results if any."""
        
        tool_results = state.get("tool_results", {})
        tools_called = state.get("tools_called", [])
        
        # Build context from tool results
        tool_context = ""
        if tool_results and not tool_results.get("error"):
            tool_context = "\n\n**Real-Time Data Retrieved:**\n"
            for key, value in tool_results.items():
                if key != "error":
                    tool_context += f"\n{value}\n"
        
        # Get messages
        messages = list(state["messages"])
        
        # Add tool results as system context
        if tool_context:
            # Insert tool results as a system message before the response
            messages.append(SystemMessage(content=f"""Use the following real-time data to answer the user's question:
{tool_context}

Incorporate this data naturally into your response. If the data answers the question directly, present it clearly."""))
        
        # Create system prompt with tool descriptions
        system_prompt = SYSTEM_PROMPT_WITH_TOOLS.format(
            tool_descriptions=get_tool_descriptions()
        )
        
        # Build final prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="messages"),
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        
        try:
            response = await chain.ainvoke({"messages": messages})
            
            # Add metadata about tools used
            if tools_called:
                response += f"\n\n---\n*Data retrieved using: {', '.join(tools_called)}*"
            
            return {
                "messages": [AIMessage(content=response)],
            }
            
        except Exception as e:
            logger.error("Response generation error", error=str(e))
            return {
                "messages": [AIMessage(content=f"I apologize, but I encountered an error generating a response. Please try again.")],
            }
    
    async def process(
        self,
        messages: List[dict],
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Process a conversation through the LangGraph workflow.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            session_id: Optional session identifier
            user_id: Optional user identifier
            
        Returns:
            Response dict with 'content', 'tools_used', and metadata
        """
        session_id = session_id or str(uuid.uuid4())
        
        # Convert to LangChain messages
        lc_messages = []
        for msg in messages:
            if msg["role"] == "user":
                lc_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                lc_messages.append(AIMessage(content=msg["content"]))
            elif msg["role"] == "system":
                lc_messages.append(SystemMessage(content=msg["content"]))
        
        # Initialize state
        initial_state: AgentState = {
            "messages": lc_messages,
            "session_id": session_id,
            "user_id": user_id,
            "tools_called": [],
            "tool_results": {},
            "needs_tools": False,
            "intent": "",
            "complexity": "moderate",
            "started_at": datetime.now(),
            "model_used": getattr(self.llm, "model", "unknown"),
        }
        
        try:
            # Run the graph
            final_state = await self.graph.ainvoke(initial_state)
            
            # Extract the final AI message
            ai_response = ""
            for msg in reversed(final_state["messages"]):
                if isinstance(msg, AIMessage):
                    ai_response = msg.content
                    break
            
            return {
                "id": f"chat-{session_id}",
                "content": ai_response,
                "tools_used": final_state.get("tools_called", []),
                "intent": final_state.get("intent", ""),
                "session_id": session_id,
                "usage": {
                    "prompt_tokens": 0,  # TODO: Track actual usage
                    "completion_tokens": 0,
                    "total_tokens": 0,
                },
            }
            
        except Exception as e:
            logger.error("LangGraph execution error", error=str(e), session_id=session_id)
            raise


# Factory function
def create_legal_agent(llm: Any) -> LangGraphLegalAgent:
    """Create a LangGraph legal agent with the specified LLM."""
    return LangGraphLegalAgent(llm)
