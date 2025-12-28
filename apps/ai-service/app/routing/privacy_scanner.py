"""
Privacy Scanner Module
Detects sensitive content in documents and queries to ensure 
confidential data NEVER leaves the local environment.
"""

import re
from enum import Enum
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass


class SensitivityLevel(Enum):
    """Data classification levels following legal industry standards"""
    PUBLIC = "public"           # Can use cloud APIs
    INTERNAL = "internal"       # Prefer local, cloud OK for generic
    CONFIDENTIAL = "confidential"  # LOCAL ONLY - client data
    SECRET = "secret"           # LOCAL ONLY - privileged communications


@dataclass
class ScanResult:
    """Result of privacy scan"""
    sensitivity_level: SensitivityLevel
    detected_patterns: List[str]
    pii_found: List[str]
    legal_markers: List[str]
    document_attached: bool
    confidence_score: float
    recommendation: str
    force_local: bool


class PrivacyScanner:
    """
    Scans content for sensitive information to determine routing.
    CRITICAL: This is the first line of defense for data privacy.
    """
    
    # PII Patterns (Indian + International)
    PII_PATTERNS = {
        # Indian identifiers
        "aadhaar": r'\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b',
        "pan": r'\b[A-Z]{5}[0-9]{4}[A-Z]\b',
        "indian_phone": r'\b(?:\+91[\-\s]?)?[6-9]\d{9}\b',
        "indian_passport": r'\b[A-Z][0-9]{7}\b',
        "gstin": r'\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z]\b',
        
        # International identifiers
        "ssn": r'\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b',
        "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        "credit_card": r'\b(?:\d{4}[-\s]?){3}\d{4}\b',
        "ip_address": r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b',
        
        # Names patterns (simplified)
        "person_name_context": r'\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Shri|Smt\.|Adv\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b',
    }
    
    # Legal sensitivity markers
    LEGAL_SENSITIVITY_MARKERS = {
        "privileged": [
            "attorney-client privilege",
            "attorney client privilege",
            "legal privilege",
            "privileged communication",
            "privileged and confidential",
            "work product doctrine",
            "litigation privilege",
        ],
        "confidential": [
            "confidential",
            "strictly confidential",
            "private and confidential",
            "not for circulation",
            "internal use only",
            "do not distribute",
            "trade secret",
            "proprietary information",
        ],
        "client_data": [
            "client name",
            "client details",
            "party details",
            "petitioner",
            "respondent",
            "plaintiff",
            "defendant",
            "complainant",
            "accused",
            "witness statement",
            "affidavit",
        ],
        "case_identifiers": [
            # Only flag SPECIFIC case references with numbers, not general legal terms
            r"case\s*no\.?\s*:?\s*\d+",
            r"writ\s*petition\s*(?:no\.?)?\s*\d+",
            r"civil\s*suit\s*(?:no\.?)?\s*\d+",
            r"criminal\s*case\s*(?:no\.?)?\s*\d+",
            r"fir\s*no\.?\s*:?\s*\d+",
            r"cnr\s*(?:number|no\.?)?\s*:?\s*[A-Z]{4}\d+",
            r"diary\s*no\.?\s*:?\s*\d+",
            r"o\.?\s*a\.?\s*no\.?\s*\d+",  # Original Application
            r"c\.?\s*a\.?\s*no\.?\s*\d+",  # Civil Appeal
            r"w\.?\s*p\.?\s*no\.?\s*\d+",  # Writ Petition
        ],
        "financial": [
            "bank account",
            "account number",
            "settlement amount",
            "compensation",
            "damages claimed",
            "court fees",
            "stamp duty",
        ],
        "document_types": [
            "vakalatnama",
            "power of attorney",
            "affidavit",
            "petition",
            "written statement",
            "rejoinder",
            "surrejoinder",
            "bail application",
            "anticipatory bail",
            "settlement deed",
            "memorandum of understanding",
            "non-disclosure agreement",
            "nda",
        ]
    }
    
    # File extensions that always require local processing
    SENSITIVE_FILE_TYPES = {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx",
        ".ppt", ".pptx", ".odt", ".rtf", ".txt"
    }
    
    def __init__(self):
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Pre-compile regex patterns for performance"""
        self._pii_compiled = {
            name: re.compile(pattern, re.IGNORECASE)
            for name, pattern in self.PII_PATTERNS.items()
        }
        
        self._case_patterns = [
            re.compile(pattern, re.IGNORECASE)
            for pattern in self.LEGAL_SENSITIVITY_MARKERS["case_identifiers"]
        ]
    
    def scan(
        self,
        content: str,
        file_attached: bool = False,
        file_name: Optional[str] = None,
        file_content: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> ScanResult:
        """
        Comprehensive scan for sensitive content.
        
        Args:
            content: The query/message text
            file_attached: Whether a file is attached
            file_name: Name of attached file
            file_content: Content of attached file (if extracted)
            metadata: Additional context
            
        Returns:
            ScanResult with sensitivity level and detected patterns
        """
        detected_patterns = []
        pii_found = []
        legal_markers = []
        sensitivity_level = SensitivityLevel.PUBLIC
        force_local = False
        
        # Combine all text to scan
        full_text = content
        if file_content:
            full_text += " " + file_content
        
        full_text_lower = full_text.lower()
        
        # RULE 1: Any file attachment = CONFIDENTIAL minimum
        if file_attached:
            sensitivity_level = SensitivityLevel.CONFIDENTIAL
            detected_patterns.append("document_attached")
            force_local = True
        
        # RULE 2: Check for PII
        for pii_name, pattern in self._pii_compiled.items():
            matches = pattern.findall(full_text)
            if matches:
                pii_found.extend([f"{pii_name}: {m[:4]}***" for m in matches[:3]])
                sensitivity_level = max(
                    sensitivity_level,
                    SensitivityLevel.CONFIDENTIAL,
                    key=lambda x: list(SensitivityLevel).index(x)
                )
                force_local = True
        
        # RULE 3: Check for privileged communication markers
        for marker in self.LEGAL_SENSITIVITY_MARKERS["privileged"]:
            if marker in full_text_lower:
                legal_markers.append(f"privileged: {marker}")
                sensitivity_level = SensitivityLevel.SECRET
                force_local = True
        
        # RULE 4: Check for confidential markers
        for marker in self.LEGAL_SENSITIVITY_MARKERS["confidential"]:
            if marker in full_text_lower:
                legal_markers.append(f"confidential: {marker}")
                sensitivity_level = max(
                    sensitivity_level,
                    SensitivityLevel.CONFIDENTIAL,
                    key=lambda x: list(SensitivityLevel).index(x)
                )
                force_local = True
        
        # RULE 5: Check for client/case data
        for marker in self.LEGAL_SENSITIVITY_MARKERS["client_data"]:
            if marker in full_text_lower:
                legal_markers.append(f"client_data: {marker}")
                sensitivity_level = max(
                    sensitivity_level,
                    SensitivityLevel.CONFIDENTIAL,
                    key=lambda x: list(SensitivityLevel).index(x)
                )
                force_local = True
        
        # RULE 6: Check for case identifiers
        for pattern in self._case_patterns:
            if pattern.search(full_text):
                legal_markers.append("case_identifier_detected")
                force_local = True
        
        # RULE 7: Check for document type mentions
        for doc_type in self.LEGAL_SENSITIVITY_MARKERS["document_types"]:
            if doc_type in full_text_lower:
                legal_markers.append(f"document_type: {doc_type}")
                sensitivity_level = max(
                    sensitivity_level,
                    SensitivityLevel.INTERNAL,
                    key=lambda x: list(SensitivityLevel).index(x)
                )
        
        # RULE 8: Financial data check
        for marker in self.LEGAL_SENSITIVITY_MARKERS["financial"]:
            if marker in full_text_lower:
                legal_markers.append(f"financial: {marker}")
                sensitivity_level = max(
                    sensitivity_level,
                    SensitivityLevel.CONFIDENTIAL,
                    key=lambda x: list(SensitivityLevel).index(x)
                )
                force_local = True
        
        # Calculate confidence score
        total_markers = len(pii_found) + len(legal_markers) + len(detected_patterns)
        confidence_score = min(1.0, total_markers * 0.2 + (0.5 if file_attached else 0))
        
        # Generate recommendation
        if force_local:
            recommendation = "LOCAL_ONLY: Sensitive content detected. Processing on-premise."
        elif sensitivity_level == SensitivityLevel.INTERNAL:
            recommendation = "LOCAL_PREFERRED: Some legal context detected. Local recommended."
        else:
            recommendation = "CLOUD_OK: No sensitive content detected. Cloud processing allowed."
        
        return ScanResult(
            sensitivity_level=sensitivity_level,
            detected_patterns=detected_patterns,
            pii_found=pii_found,
            legal_markers=legal_markers,
            document_attached=file_attached,
            confidence_score=confidence_score,
            recommendation=recommendation,
            force_local=force_local
        )
    
    def get_redacted_version(self, content: str) -> Tuple[str, List[str]]:
        """
        Create a redacted version of content for logging.
        Useful for audit trails without exposing PII.
        """
        redacted = content
        redactions = []
        
        for pii_name, pattern in self._pii_compiled.items():
            matches = pattern.findall(content)
            for match in matches:
                redacted = redacted.replace(match, f"[REDACTED-{pii_name.upper()}]")
                redactions.append(f"{pii_name}: {match[:4]}***")
        
        return redacted, redactions
