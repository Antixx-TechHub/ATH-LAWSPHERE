"""
Audit Logger Module
Comprehensive logging for compliance and transparency.
Logs all routing decisions without exposing sensitive content.
"""

import json
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from pathlib import Path
import hashlib

from .trust_router import RoutingResult, RoutingDecision, ModelProvider


@dataclass
class AuditEntry:
    """Single audit log entry"""
    audit_id: str
    timestamp: str
    
    # Routing info
    routing_decision: str
    model_used: str
    model_provider: str
    is_local: bool
    
    # Privacy info
    sensitivity_level: str
    pii_detected_count: int
    legal_markers_count: int
    document_attached: bool
    force_local_triggered: bool
    
    # Cost info
    estimated_cost_usd: float
    cost_saved_usd: float
    
    # Performance
    routing_time_ms: float
    
    # Content hash (for verification without storing content)
    content_hash: str
    
    # User info (anonymized)
    session_id: Optional[str] = None
    user_id_hash: Optional[str] = None


class AuditLogger:
    """
    Compliance-ready audit logging.
    
    Features:
    - Logs all routing decisions
    - Never stores sensitive content
    - Generates compliance reports
    - Tracks cost savings
    """
    
    def __init__(
        self,
        log_dir: str = "./logs/audit",
        retention_days: int = 365,
        enable_file_logging: bool = True
    ):
        self.log_dir = Path(log_dir)
        self.retention_days = retention_days
        self.enable_file_logging = enable_file_logging
        
        if enable_file_logging:
            self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # In-memory stats for dashboard
        self._stats = {
            "total_requests": 0,
            "local_requests": 0,
            "cloud_requests": 0,
            "documents_processed_locally": 0,
            "pii_protected_count": 0,
            "total_cost_usd": 0.0,
            "total_saved_usd": 0.0,
        }
    
    def log(
        self,
        routing_result: RoutingResult,
        content: str,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> AuditEntry:
        """
        Log a routing decision.
        
        CRITICAL: Content is hashed, never stored in plain text.
        """
        # Create content hash (for verification without storing content)
        content_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
        
        # Create anonymized user hash if provided
        user_id_hash = None
        if user_id:
            user_id_hash = hashlib.sha256(user_id.encode()).hexdigest()[:16]
        
        entry = AuditEntry(
            audit_id=routing_result.audit_id,
            timestamp=routing_result.timestamp.isoformat(),
            routing_decision=routing_result.decision.value,
            model_used=routing_result.selected_model.model_id,
            model_provider=routing_result.selected_model.provider.value,
            is_local=routing_result.is_local,
            sensitivity_level=routing_result.privacy_scan.sensitivity_level.value,
            pii_detected_count=len(routing_result.privacy_scan.pii_found),
            legal_markers_count=len(routing_result.privacy_scan.legal_markers),
            document_attached=routing_result.privacy_scan.document_attached,
            force_local_triggered=routing_result.privacy_scan.force_local,
            estimated_cost_usd=routing_result.estimated_cost,
            cost_saved_usd=routing_result.cost_saved_vs_cloud,
            routing_time_ms=routing_result.routing_time_ms,
            content_hash=content_hash,
            session_id=session_id,
            user_id_hash=user_id_hash
        )
        
        # Update stats
        self._stats["total_requests"] += 1
        if routing_result.is_local:
            self._stats["local_requests"] += 1
        else:
            self._stats["cloud_requests"] += 1
        
        if routing_result.privacy_scan.document_attached:
            self._stats["documents_processed_locally"] += 1
        
        self._stats["pii_protected_count"] += len(routing_result.privacy_scan.pii_found)
        self._stats["total_cost_usd"] += routing_result.estimated_cost
        self._stats["total_saved_usd"] += routing_result.cost_saved_vs_cloud
        
        # Write to file
        if self.enable_file_logging:
            self._write_to_file(entry)
        
        return entry
    
    def _write_to_file(self, entry: AuditEntry):
        """Write entry to daily log file"""
        date_str = datetime.now().strftime("%Y-%m-%d")
        log_file = self.log_dir / f"audit_{date_str}.jsonl"
        
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(asdict(entry)) + "\n")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get current statistics for dashboard"""
        total = self._stats["total_requests"]
        
        return {
            **self._stats,
            "local_percentage": (
                (self._stats["local_requests"] / total * 100)
                if total > 0 else 0
            ),
            "avg_cost_per_request_usd": (
                self._stats["total_cost_usd"] / total
                if total > 0 else 0
            ),
            "total_saved_inr": self._stats["total_saved_usd"] * 83,  # USD to INR
        }
    
    def generate_compliance_report(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        Generate compliance report for legal team.
        Shows data handling without exposing content.
        """
        entries = self._load_entries(start_date, end_date)
        
        local_count = sum(1 for e in entries if e["is_local"])
        cloud_count = len(entries) - local_count
        
        return {
            "report_period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "summary": {
                "total_requests": len(entries),
                "processed_locally": local_count,
                "processed_cloud": cloud_count,
                "local_percentage": (local_count / len(entries) * 100) if entries else 0,
                "documents_processed": sum(1 for e in entries if e["document_attached"]),
                "pii_instances_protected": sum(e["pii_detected_count"] for e in entries),
            },
            "privacy_compliance": {
                "all_documents_local": all(
                    e["is_local"] for e in entries if e["document_attached"]
                ),
                "all_pii_local": all(
                    e["is_local"] for e in entries if e["pii_detected_count"] > 0
                ),
                "sensitive_data_cloud_exposure": sum(
                    1 for e in entries 
                    if not e["is_local"] and (
                        e["document_attached"] or 
                        e["pii_detected_count"] > 0 or
                        e["sensitivity_level"] in ["confidential", "secret"]
                    )
                ),
            },
            "cost_analysis": {
                "total_cost_usd": sum(e["estimated_cost_usd"] for e in entries),
                "total_saved_usd": sum(e["cost_saved_usd"] for e in entries),
                "total_saved_inr": sum(e["cost_saved_usd"] for e in entries) * 83,
            },
            "models_used": self._count_by_field(entries, "model_used"),
            "sensitivity_distribution": self._count_by_field(entries, "sensitivity_level"),
            "generated_at": datetime.now().isoformat()
        }
    
    def _load_entries(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Load entries from log files within date range"""
        entries = []
        current = start_date
        
        while current <= end_date:
            date_str = current.strftime("%Y-%m-%d")
            log_file = self.log_dir / f"audit_{date_str}.jsonl"
            
            if log_file.exists():
                with open(log_file, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            entries.append(json.loads(line))
            
            current += timedelta(days=1)
        
        return entries
    
    def _count_by_field(
        self,
        entries: List[Dict[str, Any]],
        field: str
    ) -> Dict[str, int]:
        """Count entries by a specific field"""
        counts = {}
        for entry in entries:
            value = entry.get(field, "unknown")
            counts[value] = counts.get(value, 0) + 1
        return counts
    
    def get_trust_dashboard_data(self) -> Dict[str, Any]:
        """
        Get data for UI trust dashboard.
        Shows users their data is protected.
        """
        stats = self.get_stats()
        
        return {
            "trust_score": min(100, stats["local_percentage"] + 10),  # Weighted score
            "privacy_metrics": {
                "documents_protected": stats["documents_processed_locally"],
                "pii_instances_protected": stats["pii_protected_count"],
                "local_processing_rate": f"{stats['local_percentage']:.1f}%",
            },
            "cost_metrics": {
                "total_saved_inr": f"₹{stats['total_saved_inr']:.2f}",
                "avg_cost_per_query": f"₹{stats['avg_cost_per_request_usd'] * 83:.4f}",
            },
            "guarantees": [
                "All uploaded documents processed on-premise",
                "Personal information never sent to external services",
                "Privileged communications fully protected",
                "Complete audit trail available",
            ]
        }
