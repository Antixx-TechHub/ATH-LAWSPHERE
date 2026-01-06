"""
Knowledge Graph API endpoints for entity extraction and graph building.
Uses LLM to extract legal entities and relationships from text.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from enum import Enum
import json
import re

from app.models.llm_router import LLMRouter, ModelType
from app.config import settings

router = APIRouter()


class NodeType(str, Enum):
    PERSON = "PERSON"
    ORGANIZATION = "ORGANIZATION"
    LAW_REFERENCE = "LAW_REFERENCE"
    DATE = "DATE"
    LOCATION = "LOCATION"
    CLAIM = "CLAIM"
    EVIDENCE = "EVIDENCE"
    EVENT = "EVENT"
    DOCUMENT = "DOCUMENT"
    CONCEPT = "CONCEPT"


class ExtractedNode(BaseModel):
    """An extracted entity node."""
    type: NodeType
    label: str
    description: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None


class ExtractedEdge(BaseModel):
    """An extracted relationship edge."""
    source_label: str
    target_label: str
    relation: str
    label: Optional[str] = None


class ExtractionRequest(BaseModel):
    """Request to extract entities from text."""
    text: str
    session_id: Optional[str] = None
    source_type: Optional[str] = None  # message, note, file
    source_id: Optional[str] = None


class ExtractionResponse(BaseModel):
    """Response with extracted entities and relationships."""
    nodes: List[ExtractedNode]
    edges: List[ExtractedEdge]
    summary: Optional[str] = None


class BuildGraphRequest(BaseModel):
    """Request to build a full knowledge graph from session data."""
    session_id: str
    messages: List[Dict[str, Any]] = []
    notes: List[Dict[str, Any]] = []
    files: List[Dict[str, Any]] = []


class BuildGraphResponse(BaseModel):
    """Response with the complete knowledge graph."""
    session_id: str
    nodes: List[ExtractedNode]
    edges: List[ExtractedEdge]
    summary: str
    node_count: int
    edge_count: int


EXTRACTION_PROMPT = """You are a legal document analyst specializing in extracting structured information from legal texts.

Analyze the following text and extract:

1. **ENTITIES** (nodes) - Identify and categorize:
   - PERSON: Names of people (defendants, plaintiffs, witnesses, lawyers, judges)
   - ORGANIZATION: Courts, companies, government bodies, institutions
   - LAW_REFERENCE: IPC sections, Acts, case citations (e.g., "IPC Section 420", "Article 21")
   - DATE: Important dates mentioned
   - LOCATION: Places, addresses, jurisdictions
   - CLAIM: Key claims, allegations, or arguments
   - EVIDENCE: Evidence items mentioned
   - EVENT: Key events in the case timeline
   - DOCUMENT: Referenced documents, contracts, agreements
   - CONCEPT: Legal concepts, doctrines, principles

2. **RELATIONSHIPS** (edges) - Identify connections between entities:
   - filed_against, filed_by
   - represented_by, represents
   - cited_in, cites
   - related_to
   - occurred_at, occurred_on
   - accused_of, charged_with
   - witness_for, testified_in
   - issued_by, issued_to
   - appeals_to, appealed_from
   - violates, complies_with

Return a JSON object with this exact structure:
{
  "nodes": [
    {
      "type": "PERSON",
      "label": "John Doe",
      "description": "The defendant in the case",
      "properties": {"role": "defendant"}
    }
  ],
  "edges": [
    {
      "source_label": "John Doe",
      "target_label": "IPC Section 420",
      "relation": "charged_with",
      "label": "Charged with"
    }
  ],
  "summary": "A brief 2-3 sentence summary of the key legal matter"
}

TEXT TO ANALYZE:
"""


def parse_llm_json(response_text: str) -> dict:
    """Extract JSON from LLM response, handling markdown code blocks."""
    # Try to find JSON in code blocks
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
    if json_match:
        json_str = json_match.group(1)
    else:
        # Try to find raw JSON
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            json_str = json_match.group(0)
        else:
            return {"nodes": [], "edges": [], "summary": ""}
    
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        return {"nodes": [], "edges": [], "summary": ""}


@router.post("/extract", response_model=ExtractionResponse)
async def extract_entities(request: ExtractionRequest):
    """
    Extract legal entities and relationships from text using LLM.
    """
    if not request.text or len(request.text.strip()) < 10:
        return ExtractionResponse(nodes=[], edges=[], summary="")
    
    try:
        # Initialize LLM router and get model
        llm_router = LLMRouter()
        model_type = ModelType(settings.DEFAULT_MODEL)
        llm = llm_router.get_model(model_type)
        
        # Build the prompt
        prompt = EXTRACTION_PROMPT + request.text[:15000]  # Limit text length
        
        # Call LLM for extraction
        response = await llm.ainvoke(prompt)
        response_text = response.content if hasattr(response, 'content') else str(response)
        
        # Parse the JSON response
        result = parse_llm_json(response_text)
        
        # Convert to response model
        nodes = []
        for node_data in result.get("nodes", []):
            try:
                nodes.append(ExtractedNode(
                    type=NodeType(node_data.get("type", "CONCEPT")),
                    label=node_data.get("label", "Unknown"),
                    description=node_data.get("description"),
                    properties=node_data.get("properties")
                ))
            except (ValueError, KeyError):
                continue
        
        edges = []
        for edge_data in result.get("edges", []):
            try:
                edges.append(ExtractedEdge(
                    source_label=edge_data.get("source_label", ""),
                    target_label=edge_data.get("target_label", ""),
                    relation=edge_data.get("relation", "related_to"),
                    label=edge_data.get("label")
                ))
            except (ValueError, KeyError):
                continue
        
        return ExtractionResponse(
            nodes=nodes,
            edges=edges,
            summary=result.get("summary", "")
        )
        
    except Exception as e:
        print(f"[Knowledge Graph] Extraction error: {e}")
        raise HTTPException(status_code=500, detail=f"Entity extraction failed: {str(e)}")


@router.post("/build", response_model=BuildGraphResponse)
async def build_knowledge_graph(request: BuildGraphRequest):
    """
    Build a complete knowledge graph from all session data (messages, notes, files).
    """
    try:
        # Combine all text sources
        all_text_parts = []
        
        # Add messages
        for msg in request.messages:
            content = msg.get("content", "")
            role = msg.get("role", "user")
            if content and role == "user":
                all_text_parts.append(f"[User Message] {content}")
            elif content and role == "assistant":
                all_text_parts.append(f"[AI Response] {content[:500]}")  # Limit AI responses
        
        # Add notes
        for note in request.notes:
            title = note.get("title", "")
            content = note.get("content", "")
            if content:
                all_text_parts.append(f"[Note: {title}] {content}")
        
        # Add file extracted text
        for file in request.files:
            name = file.get("originalName", file.get("filename", ""))
            extracted = file.get("extractedText", "")
            if extracted:
                all_text_parts.append(f"[Document: {name}] {extracted[:3000]}")  # Limit per file
        
        combined_text = "\n\n".join(all_text_parts)
        
        if len(combined_text.strip()) < 50:
            return BuildGraphResponse(
                session_id=request.session_id,
                nodes=[],
                edges=[],
                summary="Not enough content to build a knowledge graph.",
                node_count=0,
                edge_count=0
            )
        
        # Extract entities from combined text
        extraction_request = ExtractionRequest(
            text=combined_text,
            session_id=request.session_id
        )
        extraction_result = await extract_entities(extraction_request)
        
        return BuildGraphResponse(
            session_id=request.session_id,
            nodes=extraction_result.nodes,
            edges=extraction_result.edges,
            summary=extraction_result.summary or "Knowledge graph generated from session data.",
            node_count=len(extraction_result.nodes),
            edge_count=len(extraction_result.edges)
        )
        
    except Exception as e:
        print(f"[Knowledge Graph] Build error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to build knowledge graph: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check for knowledge graph API."""
    return {"status": "ok", "service": "knowledge_graph"}
