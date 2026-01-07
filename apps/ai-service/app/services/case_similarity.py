"""
Case Similarity Engine
Uses vector embeddings to find similar legal cases
"""

import hashlib
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np

class CaseSimilarityEngine:
    """
    Finds similar legal cases using text embeddings.
    Uses Groq for generating embeddings and cosine similarity for matching.
    """
    
    def __init__(self, groq_client=None):
        self.groq_client = groq_client
        self.embedding_cache: Dict[str, List[float]] = {}
        
    def _get_cache_key(self, text: str) -> str:
        """Generate cache key for text."""
        return hashlib.md5(text.encode()).hexdigest()
    
    async def get_text_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for text.
        Since Groq doesn't have embedding API, we use a text-based approach
        with structured feature extraction.
        """
        cache_key = self._get_cache_key(text)
        if cache_key in self.embedding_cache:
            return self.embedding_cache[cache_key]
        
        # Extract legal features from text
        features = await self._extract_legal_features(text)
        
        # Convert to embedding vector (simplified approach)
        embedding = self._features_to_vector(features)
        
        self.embedding_cache[cache_key] = embedding
        return embedding
    
    async def _extract_legal_features(self, text: str) -> Dict[str, Any]:
        """Extract legal features from case text."""
        text_lower = text.lower()
        
        # Legal domain categories
        categories = {
            'criminal': ['ipc', 'crpc', 'murder', 'theft', 'assault', 'robbery', 'cheating', 'forgery', 'criminal'],
            'civil': ['civil', 'contract', 'property', 'damages', 'compensation', 'breach', 'agreement'],
            'constitutional': ['constitution', 'fundamental', 'article', 'writ', 'habeas', 'mandamus'],
            'family': ['marriage', 'divorce', 'custody', 'maintenance', 'domestic', 'hindu', 'muslim'],
            'corporate': ['company', 'shareholder', 'director', 'corporate', 'sebi', 'rbi'],
            'labour': ['labour', 'employee', 'wages', 'termination', 'industrial', 'workman'],
            'tax': ['income tax', 'gst', 'customs', 'duty', 'taxation', 'assessment'],
            'intellectual_property': ['patent', 'copyright', 'trademark', 'ip', 'infringement'],
            'environmental': ['pollution', 'environment', 'ngt', 'forest', 'wildlife'],
            'cyber': ['cyber', 'it act', 'electronic', 'data', 'privacy']
        }
        
        # Court hierarchy
        courts = {
            'supreme_court': ['supreme court', 'hon\'ble sc', 'apex court'],
            'high_court': ['high court', 'hon\'ble hc'],
            'district_court': ['district court', 'sessions', 'magistrate'],
            'tribunal': ['tribunal', 'nclt', 'nclat', 'itat', 'ngt']
        }
        
        # Relief types
        reliefs = {
            'injunction': ['injunction', 'restraint', 'prohibit'],
            'damages': ['damages', 'compensation', 'monetary'],
            'specific_performance': ['specific performance', 'execute'],
            'declaration': ['declaration', 'declare'],
            'sentence': ['imprisonment', 'fine', 'punishment', 'sentence']
        }
        
        # Extract features
        features = {
            'categories': [],
            'courts': [],
            'reliefs': [],
            'sections': [],
            'parties_count': text.count(' vs ') + text.count(' v. ') + text.count(' versus '),
            'text_length': len(text),
            'complexity': self._calculate_complexity(text)
        }
        
        # Match categories
        for cat, keywords in categories.items():
            if any(kw in text_lower for kw in keywords):
                features['categories'].append(cat)
        
        # Match courts
        for court, keywords in courts.items():
            if any(kw in text_lower for kw in keywords):
                features['courts'].append(court)
        
        # Match reliefs
        for relief, keywords in reliefs.items():
            if any(kw in text_lower for kw in keywords):
                features['reliefs'].append(relief)
        
        # Extract section references
        import re
        sections = re.findall(r'section\s+(\d+[a-z]?)', text_lower)
        features['sections'] = list(set(sections))[:10]  # Limit to 10
        
        return features
    
    def _calculate_complexity(self, text: str) -> float:
        """Calculate document complexity score."""
        # Simple heuristics
        sentences = text.split('.')
        words = text.split()
        
        if not sentences or not words:
            return 0.5
            
        avg_sentence_length = len(words) / max(len(sentences), 1)
        unique_words = len(set(words)) / max(len(words), 1)
        
        # Normalize to 0-1
        complexity = min((avg_sentence_length / 50) * 0.5 + unique_words * 0.5, 1.0)
        return complexity
    
    def _features_to_vector(self, features: Dict[str, Any]) -> List[float]:
        """Convert features to a fixed-size vector."""
        # Categories encoding (10 dimensions)
        all_categories = ['criminal', 'civil', 'constitutional', 'family', 'corporate', 
                         'labour', 'tax', 'intellectual_property', 'environmental', 'cyber']
        cat_vector = [1.0 if cat in features['categories'] else 0.0 for cat in all_categories]
        
        # Courts encoding (4 dimensions)
        all_courts = ['supreme_court', 'high_court', 'district_court', 'tribunal']
        court_vector = [1.0 if court in features['courts'] else 0.0 for court in all_courts]
        
        # Reliefs encoding (5 dimensions)
        all_reliefs = ['injunction', 'damages', 'specific_performance', 'declaration', 'sentence']
        relief_vector = [1.0 if relief in features['reliefs'] else 0.0 for relief in all_reliefs]
        
        # Numeric features (3 dimensions)
        numeric_vector = [
            min(features['parties_count'] / 5, 1.0),
            min(features['text_length'] / 10000, 1.0),
            features['complexity']
        ]
        
        # Sections encoding (common sections - 10 dimensions)
        common_sections = ['420', '302', '376', '498a', '307', '304', '34', '120b', '406', '409']
        section_vector = [1.0 if sec in features['sections'] else 0.0 for sec in common_sections]
        
        # Combine all vectors (32 dimensions total)
        full_vector = cat_vector + court_vector + relief_vector + numeric_vector + section_vector
        
        return full_vector
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0
        
        arr1 = np.array(vec1)
        arr2 = np.array(vec2)
        
        norm1 = np.linalg.norm(arr1)
        norm2 = np.linalg.norm(arr2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(np.dot(arr1, arr2) / (norm1 * norm2))
    
    async def find_similar_cases(
        self,
        query_text: str,
        case_corpus: List[Dict[str, Any]],
        top_k: int = 5,
        min_similarity: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Find similar cases from corpus.
        
        Args:
            query_text: The case or legal text to match against
            case_corpus: List of cases with 'id', 'title', 'content' fields
            top_k: Number of results to return
            min_similarity: Minimum similarity threshold
        
        Returns:
            List of similar cases with similarity scores
        """
        query_embedding = await self.get_text_embedding(query_text)
        
        similarities = []
        for case in case_corpus:
            case_embedding = await self.get_text_embedding(case.get('content', ''))
            similarity = self.cosine_similarity(query_embedding, case_embedding)
            
            if similarity >= min_similarity:
                similarities.append({
                    'case_id': case.get('id'),
                    'title': case.get('title'),
                    'citation': case.get('citation', ''),
                    'similarity': round(similarity * 100, 2),
                    'matching_features': self._get_matching_features(
                        await self._extract_legal_features(query_text),
                        await self._extract_legal_features(case.get('content', ''))
                    )
                })
        
        # Sort by similarity
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        
        return similarities[:top_k]
    
    def _get_matching_features(self, features1: Dict, features2: Dict) -> List[str]:
        """Get list of matching features between two cases."""
        matches = []
        
        # Check category overlap
        cat_overlap = set(features1['categories']) & set(features2['categories'])
        if cat_overlap:
            matches.extend([f"Category: {cat}" for cat in cat_overlap])
        
        # Check court overlap
        court_overlap = set(features1['courts']) & set(features2['courts'])
        if court_overlap:
            matches.extend([f"Court: {court}" for court in court_overlap])
        
        # Check section overlap
        section_overlap = set(features1['sections']) & set(features2['sections'])
        if section_overlap:
            matches.extend([f"Section {sec}" for sec in list(section_overlap)[:3]])
        
        return matches[:5]  # Limit to 5 matches
    
    async def analyze_case_relationships(
        self,
        cases: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze relationships between multiple cases.
        
        Returns graph data showing case connections.
        """
        nodes = []
        edges = []
        
        # Create embeddings for all cases
        embeddings = []
        for case in cases:
            emb = await self.get_text_embedding(case.get('content', ''))
            embeddings.append(emb)
            nodes.append({
                'id': case['id'],
                'label': case.get('title', '')[:50],
                'type': 'case'
            })
        
        # Find relationships
        for i in range(len(cases)):
            for j in range(i + 1, len(cases)):
                similarity = self.cosine_similarity(embeddings[i], embeddings[j])
                
                if similarity >= 0.4:  # Threshold for relationship
                    edges.append({
                        'source': cases[i]['id'],
                        'target': cases[j]['id'],
                        'weight': round(similarity * 100, 2),
                        'label': f"{round(similarity * 100)}% similar"
                    })
        
        return {
            'nodes': nodes,
            'edges': edges,
            'analysis': {
                'total_cases': len(cases),
                'connections': len(edges),
                'avg_similarity': round(
                    sum(e['weight'] for e in edges) / max(len(edges), 1), 2
                )
            }
        }


# Singleton instance
_similarity_engine: Optional[CaseSimilarityEngine] = None

def get_similarity_engine() -> CaseSimilarityEngine:
    """Get or create similarity engine instance."""
    global _similarity_engine
    if _similarity_engine is None:
        _similarity_engine = CaseSimilarityEngine()
    return _similarity_engine
