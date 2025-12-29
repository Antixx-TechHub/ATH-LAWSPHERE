"""
Trust Router Module
Privacy-first routing with transparency for legal applications.
Ensures sensitive data NEVER leaves local environment.
"""

import os
import time
from enum import Enum
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from datetime import datetime

from .privacy_scanner import PrivacyScanner, ScanResult, SensitivityLevel

# Ollama base URL from environment (for Docker support)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")


class ModelProvider(Enum):
    """Model provider classification"""
    LOCAL = "local"          # On-premise, air-gapped
    CLOUD = "cloud"          # External API


class RoutingDecision(Enum):
    """Routing decision outcomes"""
    LOCAL_REQUIRED = "local_required"      # Sensitive - must be local
    LOCAL_PREFERRED = "local_preferred"    # Cost optimization
    CLOUD_ALLOWED = "cloud_allowed"        # Non-sensitive


@dataclass
class ModelConfig:
    """Configuration for each available model"""
    model_id: str
    display_name: str
    provider: ModelProvider
    api_base: Optional[str] = None
    api_key_env: Optional[str] = None
    cost_per_1k_tokens: float = 0.0
    latency_ms_avg: int = 1000
    context_window: int = 8192
    capabilities: List[str] = field(default_factory=list)
    priority: int = 1  # Lower = higher priority


@dataclass
class RoutingResult:
    """Complete routing decision with transparency info"""
    decision: RoutingDecision
    selected_model: ModelConfig
    privacy_scan: ScanResult
    
    # Trust indicators for UI
    is_local: bool
    trust_badge: str
    trust_message: str
    trust_details: List[str]
    
    # Cost info
    estimated_cost: float
    cost_saved_vs_cloud: float
    
    # Timing
    routing_time_ms: float
    timestamp: datetime
    
    # Audit
    audit_id: str
    can_log_content: bool  # False if too sensitive


class TrustRouter:
    """
    Privacy-first LLM router with full transparency.
    
    CORE PRINCIPLES:
    1. Documents NEVER go to cloud
    2. PII NEVER goes to cloud
    3. User always knows where data is processed
    4. Full audit trail for compliance
    """
    
    # Model configurations
    MODELS: Dict[str, ModelConfig] = {
        # LOCAL MODELS (Priority for sensitive content)
        # Note: Smaller models first for CPU systems without GPU
        "qwen2.5-3b": ModelConfig(
            model_id="qwen2.5-3b",
            display_name="Qwen 2.5 3B (Local Fast)",
            provider=ModelProvider.LOCAL,
            api_base=OLLAMA_BASE_URL,
            cost_per_1k_tokens=0.0,  # Free - local
            latency_ms_avg=300,
            context_window=32768,
            capabilities=["legal", "quick_query", "simple_tasks"],
            priority=1  # Fastest on CPU
        ),
        "qwen2.5-7b": ModelConfig(
            model_id="qwen2.5-7b",
            display_name="Qwen 2.5 7B (Local)",
            provider=ModelProvider.LOCAL,
            api_base=OLLAMA_BASE_URL,
            cost_per_1k_tokens=0.0,  # Free - local
            latency_ms_avg=600,
            context_window=131072,
            capabilities=["legal", "summarization", "analysis", "indian_law"],
            priority=2
        ),
        "llama3.1-8b": ModelConfig(
            model_id="llama3.1-8b",
            display_name="Llama 3.1 8B (Local)",
            provider=ModelProvider.LOCAL,
            api_base=OLLAMA_BASE_URL,
            cost_per_1k_tokens=0.0,
            latency_ms_avg=500,
            context_window=131072,
            capabilities=["quick_query", "simple_tasks", "legal"],
            priority=3
        ),
        "qwen2.5-14b": ModelConfig(
            model_id="qwen2.5-14b",
            display_name="Qwen 2.5 14B (Local)",
            provider=ModelProvider.LOCAL,
            api_base=OLLAMA_BASE_URL,
            cost_per_1k_tokens=0.0,
            latency_ms_avg=400,
            context_window=131072,
            capabilities=["quick_query", "simple_tasks"],
            priority=3
        ),
        
        # CLOUD MODELS (Only for non-sensitive, generic queries)
        "gemini-flash": ModelConfig(
            model_id="gemini-2.0-flash-exp",
            display_name="Gemini 2.0 Flash",
            provider=ModelProvider.CLOUD,
            api_key_env="GOOGLE_API_KEY",
            cost_per_1k_tokens=0.000075,  # Very cheap
            latency_ms_avg=500,
            context_window=1000000,
            capabilities=["general", "quick_query"],
            priority=1
        ),
        "gpt-4o-mini": ModelConfig(
            model_id="gpt-4o-mini",
            display_name="GPT-4o Mini",
            provider=ModelProvider.CLOUD,
            api_key_env="OPENAI_API_KEY",
            cost_per_1k_tokens=0.00015,
            latency_ms_avg=600,
            context_window=128000,
            capabilities=["general", "analysis"],
            priority=2
        ),
        "gpt-4o": ModelConfig(
            model_id="gpt-4o",
            display_name="GPT-4o",
            provider=ModelProvider.CLOUD,
            api_key_env="OPENAI_API_KEY",
            cost_per_1k_tokens=0.005,
            latency_ms_avg=1500,
            context_window=128000,
            capabilities=["complex_analysis", "drafting"],
            priority=3
        ),
        "gpt-5-mini": ModelConfig(
            model_id="gpt-5-mini",
            display_name="GPT-5 Mini",
            provider=ModelProvider.CLOUD,
            api_key_env="OPENAI_API_KEY",
            cost_per_1k_tokens=0.00010,  # Very economical
            latency_ms_avg=800,
            context_window=128000,
            capabilities=["general", "analysis", "legal"],
            priority=1  # Highest priority for cost optimization
        ),
        "claude-3-sonnet": ModelConfig(
            model_id="claude-3-sonnet-20240229",
            display_name="Claude 3 Sonnet",
            provider=ModelProvider.CLOUD,
            api_key_env="ANTHROPIC_API_KEY",
            cost_per_1k_tokens=0.003,
            latency_ms_avg=1200,
            context_window=200000,
            capabilities=["legal", "analysis", "drafting"],
            priority=2
        ),
    }
    
    # Trust badges for UI
    TRUST_BADGES = {
        RoutingDecision.LOCAL_REQUIRED: "🔒 SECURE LOCAL",
        RoutingDecision.LOCAL_PREFERRED: "🏠 LOCAL PREFERRED",
        RoutingDecision.CLOUD_ALLOWED: "☁️ CLOUD OK",
    }
    
    # Complexity indicators for query analysis
    COMPLEX_TASK_KEYWORDS = [
        "draft", "analyze", "summarize", "compare", "review",
        "explain in detail", "comprehensive", "thorough",
        "legal opinion", "case analysis", "contract review",
        "due diligence", "legal research", "precedent",
    ]
    
    SIMPLE_TASK_KEYWORDS = [
        "what is", "who is", "when", "where", "define",
        "meaning of", "translate", "short answer",
        "yes or no", "list", "name",
    ]
    
    # Cloud models ordered by cost (lowest first)
    CLOUD_MODELS_BY_COST = [
        "gemini-flash",      # ₹0.006/1K - cheapest
        "gpt-4o-mini",       # ₹0.01/1K
        "claude-3-sonnet",   # ₹0.25/1K
        "gpt-4o",            # ₹0.40/1K - most expensive
    ]
    
    # Local models ordered by capability (user has 64GB RAM - use 14B for all)
    LOCAL_MODELS_SIMPLE = ["qwen2.5-14b", "qwen2.5-7b", "llama3.1-8b"]
    LOCAL_MODELS_COMPLEX = ["qwen2.5-14b", "qwen2.5-7b", "llama3.1-8b"]
    
    def __init__(
        self,
        enable_cloud: bool = True,
        default_local_model: str = "qwen2.5-14b",
        default_cloud_model: str = "gemini-flash",
        cost_optimization: bool = True,
        prefer_local: bool = True  # NEW: Prefer local models first
    ):
        self.privacy_scanner = PrivacyScanner()
        self.enable_cloud = enable_cloud
        self.default_local_model = default_local_model
        self.default_cloud_model = default_cloud_model
        self.cost_optimization = cost_optimization
        self.prefer_local = prefer_local
        self._request_counter = 0
    
    def analyze_complexity(self, content: str) -> str:
        """
        Analyze query complexity to select appropriate model tier.
        
        Returns:
            'simple' - Basic questions, definitions, short answers
            'moderate' - Standard legal queries
            'complex' - Analysis, drafting, comprehensive research
        """
        content_lower = content.lower()
        word_count = len(content.split())
        
        # Check for complex task indicators
        for keyword in self.COMPLEX_TASK_KEYWORDS:
            if keyword in content_lower:
                return "complex"
        
        # Check for simple task indicators
        for keyword in self.SIMPLE_TASK_KEYWORDS:
            if keyword in content_lower:
                return "simple"
        
        # Use length as a heuristic
        if word_count > 100:
            return "complex"
        elif word_count < 20:
            return "simple"
        
        return "moderate"
    
    def select_local_model(self, complexity: str) -> ModelConfig:
        """Select best local model based on complexity."""
        if complexity == "simple":
            # Use fastest local model for simple queries
            for model_id in self.LOCAL_MODELS_SIMPLE:
                if model_id in self.MODELS:
                    return self.MODELS[model_id]
        else:
            # Use most capable local model for moderate/complex
            for model_id in self.LOCAL_MODELS_COMPLEX:
                if model_id in self.MODELS:
                    return self.MODELS[model_id]
        
        return self.MODELS[self.default_local_model]
    
    def select_cloud_model(self, complexity: str) -> ModelConfig:
        """Select cloud model based on complexity and cost optimization."""
        if complexity == "simple":
            # Use cheapest cloud model for simple queries
            return self.MODELS[self.CLOUD_MODELS_BY_COST[0]]
        elif complexity == "complex":
            # Use more capable model for complex queries (but still cost-aware)
            return self.MODELS[self.CLOUD_MODELS_BY_COST[1]]  # gpt-4o-mini
        else:
            # Moderate - use cheapest
            return self.MODELS[self.CLOUD_MODELS_BY_COST[0]]
    
    def route(
        self,
        content: str,
        file_attached: bool = False,
        file_name: Optional[str] = None,
        file_content: Optional[str] = None,
        user_model_preference: Optional[str] = None,
        force_local: bool = False,
        estimated_tokens: int = 1000
    ) -> RoutingResult:
        """
        Route request to appropriate model with full transparency.
        
        CRITICAL RULES:
        1. If file_attached = True → LOCAL ONLY
        2. If PII detected → LOCAL ONLY
        3. If legal sensitivity markers → LOCAL ONLY
        4. User can always force local
        
        Args:
            content: The query text
            file_attached: Whether a document is attached
            file_name: Name of attached file
            file_content: Extracted text from file
            user_model_preference: User's explicit model choice
            force_local: User forced local processing
            estimated_tokens: Estimated token count for cost calculation
            
        Returns:
            RoutingResult with full transparency information
        """
        start_time = time.time()
        self._request_counter += 1
        audit_id = f"LR-{datetime.now().strftime('%Y%m%d%H%M%S')}-{self._request_counter:06d}"
        
        # Step 1: Privacy Scan (CRITICAL)
        scan_result = self.privacy_scanner.scan(
            content=content,
            file_attached=file_attached,
            file_name=file_name,
            file_content=file_content
        )
        
        # Step 2: Determine routing decision
        # SMART ROUTING: Use cloud for speed unless privacy requires local
        if force_local or scan_result.force_local or file_attached:
            # ABSOLUTE RULE: Documents and explicit force = LOCAL ONLY
            decision = RoutingDecision.LOCAL_REQUIRED
        elif scan_result.sensitivity_level in [SensitivityLevel.CONFIDENTIAL, SensitivityLevel.SECRET]:
            # HIGH SENSITIVITY: Must be local
            decision = RoutingDecision.LOCAL_REQUIRED
        elif scan_result.sensitivity_level == SensitivityLevel.INTERNAL:
            # MEDIUM SENSITIVITY: Prefer local but cloud OK if user wants speed
            decision = RoutingDecision.LOCAL_PREFERRED
        else:
            # LOW/NO SENSITIVITY: Use cloud for speed (Gemini Flash is very cheap)
            # This is the majority of queries - legal questions without PII
            decision = RoutingDecision.CLOUD_ALLOWED
        
        # Step 3: Analyze complexity for smart model selection
        complexity = self.analyze_complexity(content)
        
        # Step 4: Select model based on decision, complexity, and user preference
        is_auto_mode = not user_model_preference or user_model_preference == "auto"
        
        if decision in [RoutingDecision.LOCAL_REQUIRED, RoutingDecision.LOCAL_PREFERRED]:
            # SENSITIVE DATA: Must use local model for privacy
            if user_model_preference and user_model_preference in self.MODELS:
                model = self.MODELS[user_model_preference]
                if model.provider != ModelProvider.LOCAL:
                    # User chose cloud but we need local - override for privacy
                    model = self.select_local_model(complexity)
            else:
                # Auto mode or no preference: select based on complexity
                model = self.select_local_model(complexity)
        else:
            # NON-SENSITIVE: Cloud allowed
            if user_model_preference and user_model_preference in self.MODELS and not is_auto_mode:
                # User explicitly chose a specific model
                model = self.MODELS[user_model_preference]
            elif self.prefer_local:
                # LOCAL-FIRST MODE: Try local for privacy + cost savings
                # Only use cloud for complex queries that need more power
                if complexity == "complex" and self.enable_cloud:
                    # Complex query: use cheapest capable cloud model
                    model = self.select_cloud_model(complexity)
                else:
                    # Simple/moderate: local is sufficient and free
                    model = self.select_local_model(complexity)
            elif self.cost_optimization:
                # Cost-optimization mode: choose cheapest cloud model
                model = self.select_cloud_model(complexity)
            else:
                model = self.MODELS[self.default_cloud_model]
        
        # Step 5: Calculate costs
        estimated_cost = (estimated_tokens / 1000) * model.cost_per_1k_tokens
        
        # Cost saved vs using GPT-4o
        gpt4_cost = (estimated_tokens / 1000) * self.MODELS["gpt-4o"].cost_per_1k_tokens
        cost_saved = gpt4_cost - estimated_cost
        
        # Step 6: Generate trust information
        is_local = model.provider == ModelProvider.LOCAL
        
        # Badge reflects ACTUAL model used, not just what's allowed
        if is_local:
            trust_badge = "🏠 LOCAL"
        else:
            trust_badge = "☁️ CLOUD"
        
        # Complexity indicator for UI
        complexity_label = {
            "simple": "⚡ Simple query",
            "moderate": "📝 Standard query", 
            "complex": "🔬 Complex analysis"
        }.get(complexity, "📝 Standard query")
        
        if decision == RoutingDecision.LOCAL_REQUIRED:
            trust_message = "Your data is being processed securely on-premise. No information leaves your server."
            trust_details = [
                "✓ Document/query processed locally",
                "✓ No external API calls",
                "✓ No data transmitted to cloud",
                "✓ Full privacy maintained",
                f"✓ Model: {model.display_name}",
                f"✓ Complexity: {complexity_label}",
            ]
            if scan_result.pii_found:
                trust_details.append(f"✓ PII detected and protected: {len(scan_result.pii_found)} items")
            if scan_result.legal_markers:
                trust_details.append(f"✓ Legal sensitivity detected: {len(scan_result.legal_markers)} markers")
        elif decision == RoutingDecision.LOCAL_PREFERRED:
            trust_message = "Processing locally for cost optimization. Your data stays on-premise."
            trust_details = [
                "✓ Local processing for efficiency",
                "✓ Cost-optimized routing",
                f"✓ Model: {model.display_name}",
                f"✓ Complexity: {complexity_label}",
                f"✓ Estimated savings: ₹{cost_saved * 83:.2f}",
            ]
        else:
            # Cloud allowed
            if is_local:
                # Local-first mode chose local even though cloud was allowed
                trust_message = "Local-first mode: Processing locally for privacy and cost savings."
                trust_details = [
                    "✓ Local-first preference active",
                    "✓ No data sent to cloud",
                    f"✓ Model: {model.display_name}",
                    f"✓ Complexity: {complexity_label}",
                    f"✓ Savings vs cloud: ₹{cost_saved * 83:.2f}",
                ]
            else:
                trust_message = "No sensitive content detected. Using cloud for faster response."
                trust_details = [
                    "ℹ️ Generic query - cloud processing used",
                    "ℹ️ No documents or PII detected",
                    f"ℹ️ Model: {model.display_name}",
                    f"ℹ️ Complexity: {complexity_label}",
                    "ℹ️ You can switch to local anytime",
                ]
        
        routing_time_ms = (time.time() - start_time) * 1000
        
        return RoutingResult(
            decision=decision,
            selected_model=model,
            privacy_scan=scan_result,
            is_local=is_local,
            trust_badge=trust_badge,
            trust_message=trust_message,
            trust_details=trust_details,
            estimated_cost=estimated_cost,
            cost_saved_vs_cloud=cost_saved,
            routing_time_ms=routing_time_ms,
            timestamp=datetime.now(),
            audit_id=audit_id,
            can_log_content=not scan_result.force_local
        )
    
    def get_available_models(self, include_cloud: bool = True) -> Dict[str, ModelConfig]:
        """Get available models filtered by type"""
        if include_cloud and self.enable_cloud:
            return self.MODELS
        return {
            k: v for k, v in self.MODELS.items()
            if v.provider == ModelProvider.LOCAL
        }
    
    def get_trust_summary(self) -> Dict[str, Any]:
        """Get summary for dashboard display"""
        return {
            "local_models": [
                m.display_name for m in self.MODELS.values()
                if m.provider == ModelProvider.LOCAL
            ],
            "cloud_enabled": self.enable_cloud,
            "privacy_rules": [
                "Documents always processed locally",
                "PII never sent to cloud",
                "Legal privilege markers trigger local routing",
                "User can force local processing anytime",
            ],
            "cost_optimization": self.cost_optimization,
        }
