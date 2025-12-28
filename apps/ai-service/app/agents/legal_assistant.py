"""
Legal Assistant Agent using LangGraph.

This agent implements a stateful, multi-step workflow for legal research,
document analysis, and drafting using LangGraph for orchestration.
"""

from typing import TypedDict, Annotated, Sequence, Optional, List, AsyncGenerator, Any, Union
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
import operator
import uuid
import structlog

logger = structlog.get_logger()


# Agent State
class AgentState(TypedDict):
    """State maintained across agent execution."""
    messages: Annotated[Sequence[BaseMessage], operator.add]
    session_id: str
    user_id: Optional[str]
    context: Optional[str]
    tools_used: List[str]
    current_step: str


# System prompts
LEGAL_ASSISTANT_SYSTEM_PROMPT = """You are Lawsphere AI, an expert legal assistant designed to help legal professionals with research, analysis, and drafting.

## Your Capabilities:
1. **Legal Research**: Analyze case law, statutes, and regulations
2. **Document Analysis**: Review and summarize legal documents
3. **Drafting Assistance**: Help draft legal documents, briefs, and correspondence
4. **Case Analysis**: Identify relevant precedents and legal arguments
5. **Contract Review**: Analyze contract terms and identify potential issues

## Guidelines:
- Always cite relevant laws, cases, or regulations when applicable
- Provide balanced analysis considering multiple perspectives
- Flag potential risks or issues clearly
- Use clear, professional legal language
- When uncertain, recommend consulting with a licensed attorney
- Respect attorney-client privilege and confidentiality

## Response Format:
- Structure responses with clear headings when appropriate
- Use bullet points for lists of items or considerations
- Provide citations in proper legal format
- Include a summary for longer responses

Remember: You are assisting legal professionals, not providing legal advice to the public. Always recommend professional legal counsel for specific legal matters."""


class LegalAssistantAgent:
    """
    LangGraph-based agent for legal assistance.
    Implements stateful conversation with tool use and human-in-the-loop.
    """
    
    def __init__(self, llm: Any):
        self.llm = llm
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow."""
        
        # Create the graph
        workflow = StateGraph(AgentState)
        
        # Add nodes
        workflow.add_node("analyze", self._analyze_query)
        workflow.add_node("research", self._legal_research)
        workflow.add_node("respond", self._generate_response)
        
        # Define edges
        workflow.set_entry_point("analyze")
        workflow.add_edge("analyze", "research")
        workflow.add_edge("research", "respond")
        workflow.add_edge("respond", END)
        
        return workflow.compile()
    
    async def _analyze_query(self, state: AgentState) -> AgentState:
        """Analyze the user query to determine intent and required actions."""
        state["current_step"] = "analyze"
        logger.info("Analyzing query", session_id=state.get("session_id"))
        return state
    
    async def _legal_research(self, state: AgentState) -> AgentState:
        """Perform legal research based on the query."""
        state["current_step"] = "research"
        # TODO: Implement actual research logic
        # - Query vector database for relevant documents
        # - Search case law databases
        # - Retrieve relevant statutes
        logger.info("Performing legal research", session_id=state.get("session_id"))
        return state
    
    async def _generate_response(self, state: AgentState) -> AgentState:
        """Generate the final response."""
        state["current_step"] = "respond"
        logger.info("Generating response", session_id=state.get("session_id"))
        return state
    
    async def process(
        self,
        messages: List[dict],
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> dict:
        """
        Process a conversation and return the response.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            session_id: Optional session identifier for state persistence
            user_id: Optional user identifier
            
        Returns:
            Response dict with 'content', 'usage', and metadata
        """
        session_id = session_id or str(uuid.uuid4())
        
        # Convert to LangChain messages
        lc_messages = [
            SystemMessage(content=LEGAL_ASSISTANT_SYSTEM_PROMPT)
        ]
        
        for msg in messages:
            if msg["role"] == "user":
                lc_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                lc_messages.append(AIMessage(content=msg["content"]))
        
        # Create prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", LEGAL_ASSISTANT_SYSTEM_PROMPT),
            MessagesPlaceholder(variable_name="messages"),
        ])
        
        # Create chain
        chain = prompt | self.llm | StrOutputParser()
        
        # Execute
        try:
            response = await chain.ainvoke({"messages": lc_messages[1:]})  # Exclude system message
            
            # TODO: Get actual token usage from response
            return {
                "id": f"chat-{session_id}",
                "content": response,
                "usage": {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                },
                "session_id": session_id,
            }
            
        except Exception as e:
            logger.error("Error generating response", error=str(e))
            raise
    
    async def stream(
        self,
        messages: List[dict],
        session_id: Optional[str] = None,
    ) -> AsyncGenerator[dict, None]:
        """
        Stream the response token by token.
        
        Yields:
            Dict with 'content' for each token chunk
        """
        session_id = session_id or str(uuid.uuid4())
        
        # Convert to LangChain messages
        lc_messages = []
        for msg in messages:
            if msg["role"] == "user":
                lc_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                lc_messages.append(AIMessage(content=msg["content"]))
        
        # Create prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", LEGAL_ASSISTANT_SYSTEM_PROMPT),
            MessagesPlaceholder(variable_name="messages"),
        ])
        
        # Create chain
        chain = prompt | self.llm
        
        try:
            async for chunk in chain.astream({"messages": lc_messages}):
                if hasattr(chunk, "content"):
                    yield {"content": chunk.content}
                    
        except Exception as e:
            logger.error("Error streaming response", error=str(e))
            yield {"error": str(e)}
