"""
eCourts India Integration
Fetches case status, hearing dates, and court information from eCourts portal
"""

import httpx
import re
from typing import Optional, List, Dict, Any
from bs4 import BeautifulSoup
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Indian state codes for eCourts
STATE_CODES = {
    "andhra_pradesh": "1",
    "arunachal_pradesh": "2", 
    "assam": "3",
    "bihar": "4",
    "chhattisgarh": "5",
    "goa": "6",
    "gujarat": "7",
    "haryana": "8",
    "himachal_pradesh": "9",
    "jharkhand": "10",
    "karnataka": "11",
    "kerala": "12",
    "madhya_pradesh": "13",
    "maharashtra": "14",
    "manipur": "15",
    "meghalaya": "16",
    "mizoram": "17",
    "nagaland": "18",
    "odisha": "19",
    "punjab": "20",
    "rajasthan": "21",
    "sikkim": "22",
    "tamil_nadu": "23",
    "telangana": "24",
    "tripura": "25",
    "uttar_pradesh": "26",
    "uttarakhand": "27",
    "west_bengal": "28",
    "delhi": "29",
}

class ECourtsClient:
    """Client for fetching case information from eCourts India"""
    
    BASE_URL = "https://services.ecourts.gov.in/ecourtindia_v6"
    
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
    
    async def get_case_by_cnr(self, cnr_number: str) -> Optional[Dict[str, Any]]:
        """
        Fetch case details by CNR (Case Number Record) number
        
        CNR Format: STCC0T0NNNNN0YYYY
        - ST: State code (2 chars)
        - CC: Court complex code (2 chars)  
        - 0T: Establishment code
        - 0NNNNN: Case sequence number
        - 0YYYY: Year
        
        Args:
            cnr_number: 16-digit CNR number
        
        Returns:
            Case details including status, parties, next hearing, etc.
        """
        try:
            # Validate CNR format
            cnr_number = cnr_number.strip().upper()
            if len(cnr_number) != 16:
                logger.warning(f"Invalid CNR length: {cnr_number}")
                return None
            
            # Note: eCourts doesn't have a public API
            # This would require either:
            # 1. Official API access (apply at ecourts.gov.in)
            # 2. Selenium-based scraping (complex due to captcha)
            # For now, we'll return a structured template
            
            # Parse CNR components
            state_code = cnr_number[:2]
            court_code = cnr_number[2:4]
            year = cnr_number[-4:]
            
            return {
                "cnr_number": cnr_number,
                "state_code": state_code,
                "court_code": court_code,
                "year": year,
                "status": "PENDING",  # Would be fetched from actual API
                "message": "eCourts integration requires official API access. Apply at ecourts.gov.in for API credentials.",
                "portal_url": f"https://services.ecourts.gov.in/ecourtindia_v6/?p=casestatus/index&app_token=&CNR={cnr_number}"
            }
            
        except Exception as e:
            logger.error(f"Failed to fetch CNR {cnr_number}: {e}")
            return None
    
    async def search_cases(
        self,
        state: str,
        district: Optional[str] = None,
        case_type: Optional[str] = None,
        party_name: Optional[str] = None,
        advocate_name: Optional[str] = None,
        filing_year: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for cases with various filters
        
        Args:
            state: State name (e.g., "delhi", "maharashtra")
            district: District name
            case_type: Type of case (criminal, civil, etc.)
            party_name: Name of petitioner or respondent
            advocate_name: Name of advocate
            filing_year: Year of filing
        
        Returns:
            List of matching cases
        """
        try:
            # Note: Full implementation would require official API
            # Returning search guidance for now
            
            state_code = STATE_CODES.get(state.lower().replace(" ", "_"))
            
            return [{
                "message": "Case search requires eCourts API access",
                "state": state,
                "state_code": state_code,
                "search_url": f"https://services.ecourts.gov.in/ecourtindia_v6/?p=home/searchByParty&state_code={state_code}",
                "instructions": [
                    "1. Visit the eCourts portal",
                    "2. Select your state and district",
                    "3. Enter party name or case details",
                    "4. Copy the CNR number",
                    "5. Use get_case_by_cnr() with the CNR"
                ]
            }]
            
        except Exception as e:
            logger.error(f"Case search failed: {e}")
            return []
    
    async def get_cause_list(
        self,
        state: str,
        court: str,
        date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get cause list (scheduled cases) for a court
        
        Args:
            state: State name
            court: Court name or code
            date: Date for cause list (defaults to today)
        
        Returns:
            List of scheduled cases
        """
        if date is None:
            date = datetime.now()
        
        return [{
            "message": "Cause list requires eCourts API access",
            "state": state,
            "court": court,
            "date": date.strftime("%Y-%m-%d"),
            "portal_url": f"https://services.ecourts.gov.in/ecourtindia_v6/?p=causelist/causelist_qry"
        }]
    
    async def get_orders(
        self,
        cnr_number: str,
        order_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get orders/judgments for a case
        
        Args:
            cnr_number: CNR number of the case
            order_date: Optional date filter
        
        Returns:
            List of orders with dates and download links
        """
        return [{
            "cnr_number": cnr_number,
            "message": "Order retrieval requires eCourts API access",
            "portal_url": f"https://services.ecourts.gov.in/ecourtindia_v6/?p=casestatus/index&CNR={cnr_number}"
        }]
    
    def parse_cnr(self, cnr_number: str) -> Dict[str, str]:
        """
        Parse CNR number into components
        
        Args:
            cnr_number: 16-digit CNR
        
        Returns:
            Dictionary with parsed components
        """
        cnr = cnr_number.strip().upper()
        
        return {
            "state_code": cnr[:2],
            "court_complex_code": cnr[2:4],
            "establishment_code": cnr[4:6],
            "case_sequence": cnr[6:12],
            "year": cnr[12:16],
            "full_cnr": cnr
        }
    
    def validate_cnr(self, cnr_number: str) -> bool:
        """Validate CNR number format"""
        cnr = cnr_number.strip().upper()
        
        if len(cnr) != 16:
            return False
        
        if not cnr.isalnum():
            return False
        
        # Check year is valid
        try:
            year = int(cnr[-4:])
            if year < 1950 or year > 2100:
                return False
        except ValueError:
            return False
        
        return True


# NJDG (National Judicial Data Grid) Integration
class NJDGClient:
    """Client for National Judicial Data Grid statistics"""
    
    BASE_URL = "https://njdg.ecourts.gov.in"
    
    async def get_pendency_stats(
        self,
        state: Optional[str] = None,
        court_type: str = "district"  # district, high_court
    ) -> Dict[str, Any]:
        """
        Get case pendency statistics
        
        Args:
            state: Filter by state
            court_type: Type of court
        
        Returns:
            Pendency statistics
        """
        return {
            "message": "NJDG statistics available at njdg.ecourts.gov.in",
            "court_type": court_type,
            "state": state,
            "portal_url": f"{self.BASE_URL}/njdgnew/index.php"
        }
    
    async def get_disposal_stats(
        self,
        state: Optional[str] = None,
        period: str = "monthly"
    ) -> Dict[str, Any]:
        """
        Get case disposal statistics
        """
        return {
            "message": "Disposal statistics available at NJDG portal",
            "period": period,
            "state": state,
            "portal_url": f"{self.BASE_URL}/njdgnew/index.php"
        }


# Singleton instances
_ecourts_client: Optional[ECourtsClient] = None
_njdg_client: Optional[NJDGClient] = None

def get_ecourts_client() -> ECourtsClient:
    """Get or create eCourts client"""
    global _ecourts_client
    if _ecourts_client is None:
        _ecourts_client = ECourtsClient()
    return _ecourts_client

def get_njdg_client() -> NJDGClient:
    """Get or create NJDG client"""
    global _njdg_client
    if _njdg_client is None:
        _njdg_client = NJDGClient()
    return _njdg_client
