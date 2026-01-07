"""
Case Similarity API
Endpoints for finding similar legal cases
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

from ..services.case_similarity import get_similarity_engine

router = APIRouter(prefix="/similarity", tags=["Similarity"])


class SimilarityRequest(BaseModel):
    """Request for finding similar cases."""
    query_text: str = Field(..., description="The legal text to find similar cases for")
    top_k: int = Field(default=5, ge=1, le=20)
    min_similarity: float = Field(default=0.3, ge=0.0, le=1.0)
    

class CaseInput(BaseModel):
    """Single case input."""
    id: str
    title: str
    content: str
    citation: Optional[str] = None


class CorpusSimilarityRequest(BaseModel):
    """Request for finding similar cases in a corpus."""
    query_text: str
    cases: List[CaseInput]
    top_k: int = Field(default=5, ge=1, le=20)
    min_similarity: float = Field(default=0.3, ge=0.0, le=1.0)


class RelationshipRequest(BaseModel):
    """Request for analyzing case relationships."""
    cases: List[CaseInput]


# Sample case corpus for demo (in production, this comes from database)
SAMPLE_CASES = [
    {
        "id": "case_1",
        "title": "State vs. Sharma - Criminal Breach of Trust",
        "content": "The accused Sharma was found guilty under Section 406 and Section 420 of IPC for criminal breach of trust and cheating. The accused misappropriated funds entrusted to him. The District Court sentenced him to 3 years imprisonment.",
        "citation": "2023 SCC 456"
    },
    {
        "id": "case_2", 
        "title": "Mehta vs. Union of India - Fundamental Rights",
        "content": "The petitioner challenged the constitutional validity of the amendment under Article 14 and Article 21. The Supreme Court examined whether fundamental rights were violated. Writ of mandamus was sought.",
        "citation": "2022 SC 789"
    },
    {
        "id": "case_3",
        "title": "Kapoor vs. Kapoor - Divorce and Maintenance",
        "content": "The wife filed for divorce under Hindu Marriage Act citing cruelty. Maintenance under Section 125 CrPC was claimed. The Family Court awarded interim maintenance and custody of minor child to mother.",
        "citation": "2023 HC 234"
    },
    {
        "id": "case_4",
        "title": "ABC Corp vs. XYZ Ltd - Contract Breach",
        "content": "The plaintiff company sued for breach of contract and sought specific performance. Damages of Rs. 50 lakhs claimed. The civil court examined the terms of agreement and awarded compensation.",
        "citation": "2022 DC Civil 567"
    },
    {
        "id": "case_5",
        "title": "State vs. Verma - Murder Case",
        "content": "The accused was charged under Section 302 IPC for murder. The prosecution proved intent with forensic evidence. Sessions Court convicted with life imprisonment. Criminal appeal pending in High Court.",
        "citation": "2023 Sessions 890"
    }
]


@router.post("/find", response_model=Dict[str, Any])
async def find_similar_cases(request: SimilarityRequest):
    """
    Find similar cases from the sample corpus.
    In production, this would search a larger database.
    """
    try:
        engine = get_similarity_engine()
        
        results = await engine.find_similar_cases(
            query_text=request.query_text,
            case_corpus=SAMPLE_CASES,
            top_k=request.top_k,
            min_similarity=request.min_similarity
        )
        
        return {
            "success": True,
            "query_preview": request.query_text[:200] + "..." if len(request.query_text) > 200 else request.query_text,
            "total_results": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/find-in-corpus", response_model=Dict[str, Any])
async def find_similar_in_corpus(request: CorpusSimilarityRequest):
    """
    Find similar cases from a provided corpus.
    Useful when frontend sends its own case collection.
    """
    try:
        engine = get_similarity_engine()
        
        # Convert Pydantic models to dicts
        cases = [case.dict() for case in request.cases]
        
        results = await engine.find_similar_cases(
            query_text=request.query_text,
            case_corpus=cases,
            top_k=request.top_k,
            min_similarity=request.min_similarity
        )
        
        return {
            "success": True,
            "corpus_size": len(cases),
            "total_results": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-relationships", response_model=Dict[str, Any])
async def analyze_case_relationships(request: RelationshipRequest):
    """
    Analyze relationships between a set of cases.
    Returns graph data showing connections.
    """
    try:
        engine = get_similarity_engine()
        
        # Convert Pydantic models to dicts
        cases = [case.dict() for case in request.cases]
        
        graph = await engine.analyze_case_relationships(cases)
        
        return {
            "success": True,
            "graph": graph
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/demo", response_model=Dict[str, Any])
async def demo_similarity(
    query: str = Query(..., description="Legal text to search"),
    top_k: int = Query(default=3, ge=1, le=10)
):
    """
    Demo endpoint to test similarity search.
    """
    try:
        engine = get_similarity_engine()
        
        results = await engine.find_similar_cases(
            query_text=query,
            case_corpus=SAMPLE_CASES,
            top_k=top_k,
            min_similarity=0.2
        )
        
        return {
            "success": True,
            "demo": True,
            "message": "This is a demo with sample cases. In production, more cases are available.",
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/features")
async def extract_features(
    text: str = Query(..., description="Legal text to extract features from")
):
    """
    Extract legal features from text.
    Useful for understanding how similarity matching works.
    """
    try:
        engine = get_similarity_engine()
        
        features = await engine._extract_legal_features(text)
        
        return {
            "success": True,
            "features": features,
            "explanation": {
                "categories": "Legal domains identified in text",
                "courts": "Court levels mentioned",
                "reliefs": "Types of relief sought",
                "sections": "IPC/CrPC sections referenced",
                "complexity": "Document complexity score (0-1)"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
