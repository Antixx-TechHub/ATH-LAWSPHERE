"""
Indian Kanoon Integration
Fetches case laws, bare acts, and legal resources from Indian Kanoon
"""

import httpx
import re
from typing import Optional, List, Dict, Any
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

class IndianKanoonClient:
    """Client for fetching legal resources from Indian Kanoon"""
    
    BASE_URL = "https://indiankanoon.org"
    SEARCH_URL = f"{BASE_URL}/search/"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.headers = {
            "User-Agent": "LawSphere Legal-Tech Platform/1.0",
            "Accept": "text/html,application/json",
        }
        if api_key:
            self.headers["Authorization"] = f"Token {api_key}"
    
    async def search(
        self, 
        query: str, 
        doc_type: Optional[str] = None,
        court: Optional[str] = None,
        from_year: Optional[int] = None,
        to_year: Optional[int] = None,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search Indian Kanoon for legal resources
        
        Args:
            query: Search query (e.g., "IPC 420", "cheating", case name)
            doc_type: Filter by type - "judgments", "acts", "rules"
            court: Filter by court - "supremecourt", "allahabad", "delhi", etc.
            from_year: Start year filter
            to_year: End year filter
            max_results: Maximum number of results
        
        Returns:
            List of search results with title, citation, summary, url
        """
        try:
            params = {"formInput": query, "pagenum": 0}
            
            if doc_type:
                params["formInput"] += f" doctype:{doc_type}"
            if court:
                params["formInput"] += f" fromcourt:{court}"
            if from_year:
                params["formInput"] += f" fromdate:{from_year}-01-01"
            if to_year:
                params["formInput"] += f" todate:{to_year}-12-31"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    self.SEARCH_URL,
                    params=params,
                    headers=self.headers,
                    follow_redirects=True
                )
                
                if response.status_code != 200:
                    logger.error(f"Indian Kanoon search failed: {response.status_code}")
                    return []
                
                return self._parse_search_results(response.text, max_results)
                
        except Exception as e:
            logger.error(f"Indian Kanoon search error: {e}")
            return []
    
    def _parse_search_results(self, html: str, max_results: int) -> List[Dict[str, Any]]:
        """Parse search results HTML into structured data"""
        results = []
        soup = BeautifulSoup(html, 'html.parser')
        
        # Find result items
        result_divs = soup.find_all('div', class_='result')
        
        for div in result_divs[:max_results]:
            try:
                # Extract title and link
                title_elem = div.find('a', class_='result_title')
                if not title_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                url = self.BASE_URL + title_elem.get('href', '')
                
                # Extract doc ID from URL
                doc_id = url.split('/')[-1] if url else None
                
                # Extract snippet/summary
                snippet_elem = div.find('div', class_='result_text')
                snippet = snippet_elem.get_text(strip=True)[:500] if snippet_elem else ""
                
                # Extract metadata (court, date)
                meta_elem = div.find('div', class_='docsource')
                meta_text = meta_elem.get_text(strip=True) if meta_elem else ""
                
                # Parse court and date from metadata
                court = None
                date = None
                year = None
                
                if meta_text:
                    # Try to extract year
                    year_match = re.search(r'\b(19|20)\d{2}\b', meta_text)
                    if year_match:
                        year = int(year_match.group())
                    
                    # Common court names
                    court_patterns = [
                        ("Supreme Court", "supremecourt"),
                        ("High Court", "highcourt"),
                        ("Delhi", "delhi"),
                        ("Bombay", "bombay"),
                        ("Madras", "madras"),
                        ("Calcutta", "calcutta"),
                    ]
                    for pattern, code in court_patterns:
                        if pattern.lower() in meta_text.lower():
                            court = code
                            break
                
                # Determine document type
                doc_type = "CASE_LAW"
                if "Act" in title or "Section" in title:
                    doc_type = "STATUTE"
                elif "Rules" in title:
                    doc_type = "STATUTE"
                
                results.append({
                    "id": doc_id,
                    "title": title,
                    "url": url,
                    "snippet": snippet,
                    "court": court,
                    "year": year,
                    "type": doc_type,
                    "source": "indian_kanoon",
                    "metadata": meta_text
                })
                
            except Exception as e:
                logger.warning(f"Failed to parse result: {e}")
                continue
        
        return results
    
    async def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch full document content by ID
        
        Args:
            doc_id: Document ID from Indian Kanoon
        
        Returns:
            Document with full content, or None if not found
        """
        try:
            url = f"{self.BASE_URL}/doc/{doc_id}/"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    url,
                    headers=self.headers,
                    follow_redirects=True
                )
                
                if response.status_code != 200:
                    return None
                
                return self._parse_document(response.text, doc_id, url)
                
        except Exception as e:
            logger.error(f"Failed to fetch document {doc_id}: {e}")
            return None
    
    def _parse_document(self, html: str, doc_id: str, url: str) -> Dict[str, Any]:
        """Parse document HTML into structured data"""
        soup = BeautifulSoup(html, 'html.parser')
        
        # Extract title
        title_elem = soup.find('h2', class_='doc_title')
        title = title_elem.get_text(strip=True) if title_elem else "Unknown"
        
        # Extract main content
        content_elem = soup.find('div', class_='judgments') or soup.find('div', class_='doc_content')
        content = content_elem.get_text(strip=True) if content_elem else ""
        
        # Extract bench/judge information
        bench_elem = soup.find('div', class_='doc_bench')
        bench = bench_elem.get_text(strip=True) if bench_elem else None
        
        # Extract citations
        cite_elem = soup.find('div', class_='doc_citations')
        citations = []
        if cite_elem:
            for cite in cite_elem.find_all('a'):
                citations.append(cite.get_text(strip=True))
        
        # Extract date
        date_elem = soup.find('div', class_='doc_date')
        date = date_elem.get_text(strip=True) if date_elem else None
        
        return {
            "id": doc_id,
            "title": title,
            "url": url,
            "content": content[:50000],  # Limit content size
            "bench": bench,
            "date": date,
            "citations": citations,
            "source": "indian_kanoon"
        }
    
    async def get_section(self, act: str, section: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a specific section of an act
        
        Args:
            act: Name of the act (e.g., "IPC", "CrPC", "Indian Contract Act")
            section: Section number
        
        Returns:
            Section details including text and related cases
        """
        # Map common abbreviations
        act_mappings = {
            "IPC": "Indian Penal Code",
            "CrPC": "Code of Criminal Procedure",
            "CPC": "Code of Civil Procedure",
            "IEA": "Indian Evidence Act",
            "NI Act": "Negotiable Instruments Act",
        }
        
        full_act = act_mappings.get(act.upper(), act)
        query = f'"{full_act}" section {section}'
        
        results = await self.search(query, doc_type="acts", max_results=5)
        
        if results:
            # Get the most relevant result
            for result in results:
                if f"section {section}" in result["title"].lower():
                    doc = await self.get_document(result["id"])
                    if doc:
                        return doc
            
            # Fall back to first result
            return await self.get_document(results[0]["id"])
        
        return None
    
    async def find_related_cases(
        self, 
        section: str, 
        max_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find cases related to a specific legal section
        
        Args:
            section: Section reference (e.g., "IPC 420", "Section 138 NI Act")
            max_results: Maximum number of cases to return
        
        Returns:
            List of related case summaries
        """
        return await self.search(
            section, 
            doc_type="judgments",
            max_results=max_results
        )


# Singleton instance
_client: Optional[IndianKanoonClient] = None

def get_indian_kanoon_client() -> IndianKanoonClient:
    """Get or create Indian Kanoon client"""
    global _client
    if _client is None:
        from ..config import settings
        api_key = getattr(settings, 'INDIAN_KANOON_API_KEY', None)
        _client = IndianKanoonClient(api_key=api_key)
    return _client
