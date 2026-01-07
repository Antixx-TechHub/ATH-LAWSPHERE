"""
Legal Research Tools for LangGraph Agent
Integrates with real legal databases and public APIs for case law, statutes, and court information.
"""

import os
import re
import httpx
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Optional, List
import structlog
from langchain_core.tools import tool

logger = structlog.get_logger()

# API Configuration
INDIAN_KANOON_BASE = "https://indiankanoon.org"
INDIA_CODE_BASE = "https://www.indiacode.nic.in"
ECOURTS_BASE = "https://services.ecourts.gov.in"
SCI_BASE = "https://main.sci.gov.in"

# User agent for web requests
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


@tool
async def search_indian_kanoon(
    query: str,
    doc_type: str = "all",
    court: Optional[str] = None,
    from_year: Optional[int] = None,
    to_year: Optional[int] = None,
    max_results: int = 5
) -> str:
    """
    Search Indian Kanoon for case law, judgments, and legal documents.
    
    Args:
        query: Search query - case name, legal topic, section number, or keywords
        doc_type: Document type filter - "all", "judgments", "laws", "tribunals"
        court: Court filter - "supremecourt", "allahabad", "bombay", "delhi", "calcutta", etc.
        from_year: Filter cases from this year
        to_year: Filter cases until this year
        max_results: Number of results to return (default 5, max 10)
    
    Returns:
        Search results with case names, citations, courts, dates, and snippets.
    
    Example queries:
        - "IPC Section 302 murder"
        - "Kesavananda Bharati"
        - "right to privacy"
        - "Article 21 life liberty"
    """
    logger.info("Tool: search_indian_kanoon", query=query, doc_type=doc_type, court=court)
    
    try:
        search_url = f"{INDIAN_KANOON_BASE}/search/"
        params = {"formInput": query}
        
        filter_parts = []
        if doc_type == "judgments":
            filter_parts.append("doctypes: judgments")
        elif doc_type == "laws":
            filter_parts.append("doctypes: laws")
        elif doc_type == "tribunals":
            filter_parts.append("doctypes: tribunals")
            
        if court:
            filter_parts.append(f"fromcourt: {court}")
        if from_year:
            filter_parts.append(f"fromdate: 1-1-{from_year}")
        if to_year:
            filter_parts.append(f"todate: 31-12-{to_year}")
            
        if filter_parts:
            params["formInput"] = query + " " + " ".join(filter_parts)
        
        async with httpx.AsyncClient(timeout=15.0, headers=HEADERS, follow_redirects=True) as client:
            response = await client.get(search_url, params=params)
            
            if response.status_code != 200:
                logger.warning("Indian Kanoon request failed", status=response.status_code)
                return f"Could not connect to Indian Kanoon. Status: {response.status_code}"
            
            soup = BeautifulSoup(response.text, "html.parser")
            results = soup.find_all("div", class_="result")
            
            if not results:
                results = soup.find_all("div", {"class": re.compile(r"result.*")})
            
            if not results:
                return f"""**Indian Kanoon Search: "{query}"**

No results found. Try:
- Using different keywords
- Searching for specific section numbers (e.g., "Section 420 IPC")
- Using case names (e.g., "Kesavananda Bharati")

[Search on Indian Kanoon directly]({INDIAN_KANOON_BASE}/search/?formInput={query.replace(' ', '+')})"""
            
            max_results = min(max_results, 10, len(results))
            output = f"""**Indian Kanoon Search Results: "{query}"**
*Found {len(results)}+ results, showing top {max_results}*

"""
            
            for i, result in enumerate(results[:max_results], 1):
                title_elem = result.find("a", class_="result_title") or result.find("a")
                if not title_elem:
                    continue
                    
                title = title_elem.get_text(strip=True)
                link = title_elem.get("href", "")
                if link and not link.startswith("http"):
                    link = f"{INDIAN_KANOON_BASE}{link}"
                
                snippet_elem = result.find("div", class_="headline") or result.find("span", class_="headline")
                snippet = ""
                if snippet_elem:
                    snippet = snippet_elem.get_text(strip=True)[:300]
                
                cite_elem = result.find("span", class_="docsource")
                citation = cite_elem.get_text(strip=True) if cite_elem else ""
                
                output += f"**{i}. {title}**\n"
                if citation:
                    output += f"   *{citation}*\n"
                if snippet:
                    output += f"   {snippet}...\n"
                if link:
                    output += f"   [Read Full Judgment]({link})\n"
                output += "\n"
            
            output += f"""---
[View all results on Indian Kanoon]({INDIAN_KANOON_BASE}/search/?formInput={query.replace(' ', '+')})"""
            
            return output
            
    except httpx.TimeoutException:
        logger.error("Indian Kanoon timeout")
        return f"""**Search Timeout**
Indian Kanoon is taking too long to respond. Please try:
- [Search directly on Indian Kanoon]({INDIAN_KANOON_BASE}/search/?formInput={query.replace(' ', '+')})"""
        
    except Exception as e:
        logger.error("Indian Kanoon error", error=str(e))
        return f"""**Search Error**
Could not complete the search. Error: {str(e)}

Try searching directly:
- [Indian Kanoon]({INDIAN_KANOON_BASE}/search/?formInput={query.replace(' ', '+')})"""


@tool
async def get_ipc_section(section_number: str) -> str:
    """
    Get details of a specific Indian Penal Code (IPC) section.
    
    Args:
        section_number: IPC section number (e.g., "302", "420", "376", "34")
    
    Returns:
        Section title, description, punishment, and related case law.
    """
    logger.info("Tool: get_ipc_section", section=section_number)
    
    ipc_sections = {
        "34": {
            "title": "Acts done by several persons in furtherance of common intention",
            "description": "When a criminal act is done by several persons in furtherance of the common intention of all, each of such persons is liable for that act in the same manner as if it were done by him alone.",
            "punishment": "Same as the principal offence",
            "category": "General Exceptions",
            "keywords": ["common intention", "joint liability", "group crime"]
        },
        "107": {
            "title": "Abetment of a thing",
            "description": "A person abets the doing of a thing who: First - Instigates; Secondly - Engages with one or more persons in conspiracy; Thirdly - Intentionally aids by act or illegal omission.",
            "punishment": "Varies based on offence abetted",
            "category": "Abetment",
            "keywords": ["abetment", "conspiracy", "instigation"]
        },
        "120B": {
            "title": "Punishment of criminal conspiracy",
            "description": "Whoever is a party to a criminal conspiracy to commit an offence punishable with death, imprisonment for life, or rigorous imprisonment for 2+ years shall be punished.",
            "punishment": "Same manner as if abetted the offence / Up to 6 months + fine",
            "category": "Criminal Conspiracy",
            "keywords": ["conspiracy", "planning crime", "agreement to commit offence"]
        },
        "302": {
            "title": "Punishment for murder",
            "description": "Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.",
            "punishment": "Death OR Imprisonment for life + Fine",
            "category": "Offences Affecting Life",
            "keywords": ["murder punishment", "death penalty", "life imprisonment"]
        },
        "304": {
            "title": "Punishment for culpable homicide not amounting to murder",
            "description": "If done with intention: Imprisonment for life or up to 10 years + fine. If done with knowledge: Up to 10 years or fine or both.",
            "punishment": "Life/10 years + fine OR 10 years/fine",
            "category": "Offences Affecting Life",
            "keywords": ["culpable homicide", "manslaughter"]
        },
        "304A": {
            "title": "Causing death by negligence",
            "description": "Whoever causes the death of any person by doing any rash or negligent act not amounting to culpable homicide.",
            "punishment": "Up to 2 years imprisonment or fine or both",
            "category": "Offences Affecting Life",
            "keywords": ["negligence", "accident", "rash driving", "medical negligence"]
        },
        "306": {
            "title": "Abetment of suicide",
            "description": "If any person commits suicide, whoever abets the commission of such suicide shall be punished.",
            "punishment": "Up to 10 years imprisonment + fine",
            "category": "Offences Affecting Life",
            "keywords": ["suicide", "abetment", "instigation to suicide"]
        },
        "307": {
            "title": "Attempt to murder",
            "description": "Whoever does any act with such intention or knowledge and under such circumstances that if he caused death, he would be guilty of murder.",
            "punishment": "Up to 10 years + fine; If hurt caused: Life imprisonment",
            "category": "Offences Affecting Life",
            "keywords": ["attempt to murder", "attempted killing"]
        },
        "354": {
            "title": "Assault or criminal force to woman with intent to outrage her modesty",
            "description": "Whoever assaults or uses criminal force to any woman, intending to outrage or knowing it to be likely to outrage her modesty.",
            "punishment": "1-5 years imprisonment + fine",
            "category": "Sexual Offences",
            "keywords": ["molestation", "outraging modesty", "assault on woman"]
        },
        "376": {
            "title": "Punishment for rape",
            "description": "Whoever commits rape shall be punished with rigorous imprisonment of not less than 10 years extendable to life + fine.",
            "punishment": "Minimum 10 years RI, extendable to life imprisonment + fine",
            "category": "Sexual Offences",
            "keywords": ["rape", "sexual assault", "POCSO"]
        },
        "379": {
            "title": "Punishment for theft",
            "description": "Whoever commits theft shall be punished.",
            "punishment": "Up to 3 years imprisonment or fine or both",
            "category": "Theft",
            "keywords": ["theft", "stealing", "larceny"]
        },
        "420": {
            "title": "Cheating and dishonestly inducing delivery of property",
            "description": "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property, or to make, alter or destroy valuable security.",
            "punishment": "Up to 7 years imprisonment + fine",
            "category": "Cheating",
            "keywords": ["cheating", "fraud", "419", "scam", "financial fraud"]
        },
        "498A": {
            "title": "Husband or relative of husband subjecting woman to cruelty",
            "description": "Whoever being the husband or relative of husband subjects a woman to cruelty shall be punished.",
            "punishment": "Up to 3 years imprisonment + fine",
            "category": "Cruelty by Husband",
            "keywords": ["dowry harassment", "domestic violence", "cruelty", "498a"]
        },
        "506": {
            "title": "Punishment for criminal intimidation",
            "description": "Whoever commits criminal intimidation shall be punished.",
            "punishment": "Up to 2 years or fine or both; 7 years if threat to cause death/grievous hurt",
            "category": "Criminal Intimidation",
            "keywords": ["intimidation", "threat", "extortion"]
        },
    }
    
    section = section_number.strip().upper().replace("SECTION", "").replace("SEC", "").replace(".", "").strip()
    
    if section in ipc_sections:
        s = ipc_sections[section]
        return f"""**IPC Section {section}: {s['title']}**

**Category**: {s['category']}

**Description**:
{s['description']}

**Punishment**:
{s['punishment']}

**Keywords**: {', '.join(s['keywords'])}

---
**Related Resources**:
- [Search cases on Indian Kanoon]({INDIAN_KANOON_BASE}/search/?formInput=section+{section}+IPC)
- [Full IPC on India Code]({INDIA_CODE_BASE})

*Note: IPC has been replaced by Bharatiya Nyaya Sanhita (BNS) 2023 for offences from July 1, 2024*"""
    
    return f"""**IPC Section {section}**

This section is not in my quick reference database.

**Search Resources**:
- [Search Section {section} on Indian Kanoon]({INDIAN_KANOON_BASE}/search/?formInput=section+{section}+IPC)
- [India Code - Full IPC]({INDIA_CODE_BASE})
- [Legislative Department](https://legislative.gov.in/)"""


@tool
async def search_supreme_court(
    query: str,
    case_type: str = "all",
    year: Optional[int] = None,
    max_results: int = 5
) -> str:
    """
    Search Supreme Court of India judgments and orders.
    
    Args:
        query: Case name, topic, or keywords to search
        case_type: Type - "all", "civil", "criminal", "writ", "slp"
        year: Filter by year
        max_results: Number of results (default 5)
    
    Returns:
        Supreme Court cases with case numbers, dates, and links.
    """
    logger.info("Tool: search_supreme_court", query=query, case_type=case_type)
    
    try:
        search_query = f"{query} fromcourt: supremecourt"
        if year:
            search_query += f" fromdate: 1-1-{year} todate: 31-12-{year}"
        
        async with httpx.AsyncClient(timeout=15.0, headers=HEADERS, follow_redirects=True) as client:
            response = await client.get(
                f"{INDIAN_KANOON_BASE}/search/",
                params={"formInput": search_query}
            )
            
            if response.status_code != 200:
                raise Exception(f"Status code: {response.status_code}")
            
            soup = BeautifulSoup(response.text, "html.parser")
            results = soup.find_all("div", class_="result")[:max_results]
            
            if not results:
                return f"""**Supreme Court Search: "{query}"**

No judgments found. Try:
- Different keywords
- Broader search terms
- Specific case names

**Direct Links**:
- [SCI Judgment Portal](https://main.sci.gov.in/judgments)
- [Search on Indian Kanoon]({INDIAN_KANOON_BASE}/search/?formInput={query.replace(' ', '+')}+fromcourt:supremecourt)"""
            
            output = f"""**Supreme Court of India - Search Results: "{query}"**

"""
            for i, result in enumerate(results, 1):
                title_elem = result.find("a")
                if not title_elem:
                    continue
                title = title_elem.get_text(strip=True)
                link = title_elem.get("href", "")
                if link and not link.startswith("http"):
                    link = f"{INDIAN_KANOON_BASE}{link}"
                
                cite_elem = result.find("span", class_="docsource")
                citation = cite_elem.get_text(strip=True) if cite_elem else "Supreme Court of India"
                
                output += f"""**{i}. {title}**
   {citation}
   [Read Judgment]({link})

"""
            
            output += f"""---
[View more on SCI Portal](https://main.sci.gov.in/judgments) | [Indian Kanoon]({INDIAN_KANOON_BASE}/search/?formInput={query.replace(' ', '+')}+fromcourt:supremecourt)"""
            
            return output
            
    except Exception as e:
        logger.error("Supreme Court search error", error=str(e))
        return f"""**Supreme Court Search**

Could not complete search. Please try directly:
- [Supreme Court Judgment Portal](https://main.sci.gov.in/judgments)
- [Indian Kanoon SC Search]({INDIAN_KANOON_BASE}/search/?formInput={query.replace(' ', '+')}+fromcourt:supremecourt)
- [SCI Case Status](https://main.sci.gov.in/case-status)"""


@tool
async def search_high_court(
    query: str,
    court: str = "delhi",
    year: Optional[int] = None,
    max_results: int = 5
) -> str:
    """
    Search High Court judgments.
    
    Args:
        query: Case name, topic, or keywords
        court: High Court name - "delhi", "bombay", "calcutta", "madras", "allahabad", 
               "karnataka", "kerala", "punjab", "gujarat", "rajasthan"
        year: Filter by year
        max_results: Number of results
    
    Returns:
        High Court judgments with citations and links.
    """
    logger.info("Tool: search_high_court", query=query, court=court)
    
    court_mapping = {
        "delhi": "Delhi High Court",
        "bombay": "Bombay High Court",
        "calcutta": "Calcutta High Court",
        "madras": "Madras High Court",
        "allahabad": "Allahabad High Court",
        "karnataka": "Karnataka High Court",
        "kerala": "Kerala High Court",
        "punjab": "Punjab and Haryana High Court",
        "gujarat": "Gujarat High Court",
        "rajasthan": "Rajasthan High Court",
    }
    
    court_name = court_mapping.get(court.lower(), court)
    
    try:
        search_query = f"{query} fromcourt: {court}"
        if year:
            search_query += f" fromdate: 1-1-{year} todate: 31-12-{year}"
        
        async with httpx.AsyncClient(timeout=15.0, headers=HEADERS, follow_redirects=True) as client:
            response = await client.get(
                f"{INDIAN_KANOON_BASE}/search/",
                params={"formInput": search_query}
            )
            
            if response.status_code != 200:
                raise Exception(f"Status code: {response.status_code}")
            
            soup = BeautifulSoup(response.text, "html.parser")
            results = soup.find_all("div", class_="result")[:max_results]
            
            if not results:
                return f"""**{court_name} Search: "{query}"**

No judgments found. Try different keywords or search directly:
- [Indian Kanoon {court_name}]({INDIAN_KANOON_BASE}/search/?formInput={query.replace(' ', '+')}+fromcourt:{court})"""
            
            output = f"""**{court_name} - Search Results: "{query}"**

"""
            for i, result in enumerate(results, 1):
                title_elem = result.find("a")
                if not title_elem:
                    continue
                title = title_elem.get_text(strip=True)
                link = title_elem.get("href", "")
                if link and not link.startswith("http"):
                    link = f"{INDIAN_KANOON_BASE}{link}"
                
                output += f"""**{i}. {title}**
   [Read Judgment]({link})

"""
            
            return output
            
    except Exception as e:
        logger.error("High Court search error", error=str(e))
        return f"""**{court_name} Search**

Could not complete search. Try:
- [Indian Kanoon]({INDIAN_KANOON_BASE}/search/?formInput={query.replace(' ', '+')}+fromcourt:{court})
- [E-Courts Services](https://services.ecourts.gov.in/)"""


@tool 
async def get_case_status(
    case_number: str,
    court_type: str = "high_court",
    state: str = "delhi",
    case_year: Optional[int] = None
) -> str:
    """
    Get case status from E-Courts system.
    
    Args:
        case_number: Case number (e.g., "123/2024", "WP(C) 456/2023")
        court_type: "supreme_court", "high_court", or "district_court"
        state: State for High Court/District Court
        case_year: Year of the case
    
    Returns:
        Information about checking case status with direct links.
    """
    logger.info("Tool: get_case_status", case_number=case_number, court_type=court_type)
    
    if court_type == "supreme_court":
        year_line = f"- Year: {case_year}" if case_year else "- Year of filing"
        return f"""**Case Status: {case_number}**

To check Supreme Court case status:

1. **SCI Case Status Portal**: 
   [main.sci.gov.in/case-status](https://main.sci.gov.in/case-status)
   
2. **Required Information**:
   - Case Type (Civil/Criminal/Writ/SLP)
   - Case Number: {case_number}
   {year_line}

3. **Alternative**:
   - Call: 011-23388942
   - SMS: Type 'SCI <case_number>' to 9212357123

Download SCI Mobile App for status updates."""

    elif court_type == "high_court":
        year_line = f"- Year: {case_year}" if case_year else ""
        return f"""**High Court Case Status: {case_number}**

To check {state.title()} High Court case status:

1. **E-Courts Portal**:
   [services.ecourts.gov.in/ecourtindia_v6/](https://services.ecourts.gov.in/ecourtindia_v6/)

2. **Steps**:
   - Select State: {state.title()}
   - Select High Court
   - Enter Case Number: {case_number}
   {year_line}

3. **High Court Website**:
   - Most High Courts have dedicated case status pages
   
*You can also search by party name, advocate name, or FIR number*"""

    else:
        return f"""**District Court Case Status: {case_number}**

To check District Court case status:

1. **E-Courts Services**:
   [services.ecourts.gov.in/ecourtindia_v6/](https://services.ecourts.gov.in/ecourtindia_v6/)

2. **Steps**:
   - Select State: {state.title()}
   - Select District
   - Select Court Complex
   - Enter Case Details

3. **Search Options**:
   - CNR Number (unique case identifier)
   - Case Number: {case_number}
   - Party Name
   - Advocate Name
   - FIR Number
   - Filing Number

Download E-Courts Mobile App for easy access."""


@tool
async def get_bare_act(
    act_name: str,
    section: Optional[str] = None
) -> str:
    """
    Get information about Indian Acts and Statutes.
    
    Args:
        act_name: Name of the act (e.g., "Indian Contract Act", "CPC", "CrPC", "Evidence Act")
        section: Specific section number (optional)
    
    Returns:
        Act information with links to full text.
    """
    logger.info("Tool: get_bare_act", act_name=act_name, section=section)
    
    common_acts = {
        "ipc": {
            "full_name": "Indian Penal Code, 1860",
            "short": "IPC",
            "replaced_by": "Bharatiya Nyaya Sanhita, 2023 (from July 1, 2024)",
            "description": "The main criminal code of India covering all substantive aspects of criminal law.",
            "sections": "1-511"
        },
        "crpc": {
            "full_name": "Code of Criminal Procedure, 1973",
            "short": "CrPC",
            "replaced_by": "Bharatiya Nagarik Suraksha Sanhita, 2023 (from July 1, 2024)",
            "description": "Procedural law for administration of criminal law in India.",
            "sections": "1-484"
        },
        "cpc": {
            "full_name": "Code of Civil Procedure, 1908",
            "short": "CPC",
            "description": "Procedural law for civil courts in India.",
            "sections": "1-158"
        },
        "evidence": {
            "full_name": "Indian Evidence Act, 1872",
            "short": "IEA",
            "replaced_by": "Bharatiya Sakshya Adhiniyam, 2023 (from July 1, 2024)",
            "description": "Rules and allied matters of evidence in Indian courts.",
            "sections": "1-167"
        },
        "contract": {
            "full_name": "Indian Contract Act, 1872",
            "short": "ICA",
            "description": "Law relating to contracts in India.",
            "sections": "1-238"
        },
        "constitution": {
            "full_name": "Constitution of India, 1950",
            "short": "COI",
            "description": "Supreme law of India with fundamental rights, directive principles, and government structure.",
            "articles": "1-395 + 12 Schedules"
        },
        "companies": {
            "full_name": "Companies Act, 2013",
            "short": "CA 2013",
            "description": "Regulates incorporation, responsibilities of companies, directors, dissolution, etc.",
            "sections": "1-470"
        },
        "arbitration": {
            "full_name": "Arbitration and Conciliation Act, 1996",
            "short": "A and C Act",
            "description": "Law relating to domestic and international arbitration.",
            "sections": "1-86"
        },
        "it act": {
            "full_name": "Information Technology Act, 2000",
            "short": "IT Act",
            "description": "Legal framework for electronic governance and cybercrime.",
            "sections": "1-90"
        },
        "rti": {
            "full_name": "Right to Information Act, 2005",
            "short": "RTI Act",
            "description": "Citizens right to access information from public authorities.",
            "sections": "1-31"
        },
        "consumer protection": {
            "full_name": "Consumer Protection Act, 2019",
            "short": "CPA 2019",
            "description": "Protection of consumer rights and establishment of consumer forums.",
            "sections": "1-107"
        }
    }
    
    act_key = act_name.lower().replace("act", "").replace(",", "").strip()
    for digit in "0123456789":
        act_key = act_key.replace(digit, "")
    act_key = act_key.strip()
    act_key = act_key.replace("indian penal code", "ipc").replace("penal code", "ipc")
    act_key = act_key.replace("code of criminal procedure", "crpc").replace("criminal procedure", "crpc")
    act_key = act_key.replace("code of civil procedure", "cpc").replace("civil procedure", "cpc")
    act_key = act_key.replace("indian evidence", "evidence")
    act_key = act_key.replace("indian contract", "contract")
    
    act_info = common_acts.get(act_key)
    
    if act_info:
        output = f"""**{act_info['full_name']}** ({act_info['short']})

**Description**: {act_info['description']}

"""
        if "sections" in act_info:
            output += f"**Sections**: {act_info['sections']}\n"
        if "articles" in act_info:
            output += f"**Articles**: {act_info['articles']}\n"
        if "replaced_by" in act_info:
            output += f"\n**Note**: {act_info['replaced_by']}\n"
        
        search_term = act_info['full_name'].replace(",", "").replace(" ", "+")
        
        output += f"""
---
**Resources**:
- [Full Text on India Code]({INDIA_CODE_BASE})
- [Search on Indian Kanoon]({INDIAN_KANOON_BASE}/search/?formInput={search_term})
"""
        if section:
            output += f"- [Section {section} Cases]({INDIAN_KANOON_BASE}/search/?formInput=section+{section}+{act_info['short'].replace(' ', '+')})\n"
        
        return output
    
    return f"""**{act_name}**

This act is not in my quick reference. 

**Find the full text**:
- [India Code (Official)]({INDIA_CODE_BASE})
- [Indian Kanoon]({INDIAN_KANOON_BASE}/search/?formInput={act_name.replace(' ', '+')})
- [Legislative Department](https://legislative.gov.in/)"""


@tool
async def legal_citation_lookup(citation: str) -> str:
    """
    Look up a legal citation to find the full case.
    
    Args:
        citation: Legal citation (e.g., "AIR 1973 SC 1461", "(2017) 10 SCC 1", "1950 SCR 88")
    
    Returns:
        Case information based on the citation.
    """
    logger.info("Tool: legal_citation_lookup", citation=citation)
    
    try:
        async with httpx.AsyncClient(timeout=15.0, headers=HEADERS, follow_redirects=True) as client:
            response = await client.get(
                f"{INDIAN_KANOON_BASE}/search/",
                params={"formInput": citation}
            )
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                results = soup.find_all("div", class_="result")[:3]
                
                if results:
                    output = f"""**Citation Lookup: {citation}**

"""
                    for i, result in enumerate(results, 1):
                        title_elem = result.find("a")
                        if title_elem:
                            title = title_elem.get_text(strip=True)
                            link = title_elem.get("href", "")
                            if link and not link.startswith("http"):
                                link = f"{INDIAN_KANOON_BASE}{link}"
                            
                            output += f"""**{i}. {title}**
   [Read Full Judgment]({link})

"""
                    return output
                    
    except Exception as e:
        logger.error("Citation lookup error", error=str(e))
    
    return f"""**Citation Lookup: {citation}**

Could not find this citation automatically. 

**Search manually**:
- [Indian Kanoon]({INDIAN_KANOON_BASE}/search/?formInput={citation.replace(' ', '+')})
- [SCC Online](https://www.scconline.com/)
- [Manupatra](https://www.manupatra.com/)

**Citation formats explained**:
- **AIR**: All India Reporter (e.g., AIR 1973 SC 1461)
- **SCC**: Supreme Court Cases (e.g., (2017) 10 SCC 1)
- **SCR**: Supreme Court Reports (e.g., 1950 SCR 88)"""


# Export all tools
LEGAL_TOOLS = [
    search_indian_kanoon,
    get_ipc_section,
    search_supreme_court,
    search_high_court,
    get_case_status,
    get_bare_act,
    legal_citation_lookup,
]
