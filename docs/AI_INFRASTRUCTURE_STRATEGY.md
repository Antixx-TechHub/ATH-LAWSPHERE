# LawSphere AI Infrastructure Strategy

> **Document Created**: December 30, 2025  
> **Last Updated**: December 30, 2025  
> **Status**: Active Decision Document

---

## Executive Summary

This document outlines the strategic decisions made regarding AI model hosting and data privacy for LawSphere, a legal technology application. Given the sensitive nature of legal data, we have adopted a **Hybrid Architecture** that balances performance, cost, and data privacy.

---

## 1. Core Problem Statement

### The Privacy Challenge

LawSphere handles highly sensitive legal data including:
- Client names and personal information
- Case details and privileged communications
- Legal strategies and confidential documents
- Financial information related to cases

**Regulatory Considerations:**
- Attorney-client privilege requirements
- GDPR compliance for EU users
- India's Digital Personal Data Protection Act (DPDPA) 2023
- Various bar association ethics rules

### The Performance Challenge

- Users expect fast, accurate AI responses
- Local models require significant hardware
- Cloud GPU costs can be prohibitive at scale
- Model quality varies significantly

---

## 2. Options Evaluated

### Option A: External APIs Only (OpenAI, Anthropic, Groq)

| Pros | Cons |
|------|------|
| Best model quality | Data sent to third parties |
| Zero infrastructure maintenance | Per-token costs at scale |
| Fastest integration | Dependency on external services |
| Continuous improvements | Potential compliance issues |

**Data Exposure Risk**: ⚠️ HIGH  
**Mitigation**: Enterprise agreements prevent training on data, but data still leaves your infrastructure.

### Option B: Fully Self-Hosted (On-Premise)

| Pros | Cons |
|------|------|
| Complete data isolation | High upfront hardware costs |
| No external dependencies | Requires ML/DevOps expertise |
| Full control over models | Slower model updates |
| Can fine-tune on your data | Performance may lag behind APIs |

**Data Exposure Risk**: ✅ NONE  
**Challenge**: Requires $10,000-50,000+ in GPU hardware for production quality.

### Option C: Self-Hosted Cloud (GPU VMs)

| Pros | Cons |
|------|------|
| Your data stays in your VMs | Monthly GPU costs ($200-2000) |
| Scalable on demand | Still requires some expertise |
| Modern model support | Network latency |
| Can fine-tune models | VM management overhead |

**Data Exposure Risk**: ✅ MINIMAL (your cloud account)  
**Recommended Providers**: RunPod, Lambda Labs, Vast.ai, Azure ML

### Option D: Hybrid Architecture (SELECTED) ✅

| Pros | Cons |
|------|------|
| Optimized cost/privacy balance | More complex routing logic |
| Best of all worlds | Multiple systems to maintain |
| Gradual migration path | Initial setup complexity |
| Risk mitigation | |

**Data Exposure Risk**: ✅ CONTROLLED  
**How it works**: Route queries based on sensitivity level.

---

## 3. Selected Architecture: Hybrid Model

### Three-Tier Routing Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER QUERY                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PRIVACY SCANNER                               │
│  - Detects PII (names, addresses, case numbers)                 │
│  - Identifies privileged content                                 │
│  - Calculates sensitivity score                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   TIER 1        │ │   TIER 2        │ │   TIER 3        │
│   SENSITIVE     │ │   MODERATE      │ │   GENERAL       │
│                 │ │                 │ │                 │
│ • Client data   │ │ • Anonymized    │ │ • Legal defs    │
│ • Case details  │ │   documents     │ │ • Statutes      │
│ • Privileged    │ │ • General legal │ │ • Public info   │
│   communications│ │   questions     │ │                 │
│                 │ │                 │ │                 │
│ ┌─────────────┐ │ │ ┌─────────────┐ │ │ ┌─────────────┐ │
│ │ SELF-HOSTED │ │ │ │   GROQ      │ │ │ │ OPENAI/GROQ │ │
│ │   OLLAMA    │ │ │ │ OPEN-SOURCE │ │ │ │   (FAST)    │ │
│ │ (GPU VM or  │ │ │ │ Llama, etc. │ │ │ │             │ │
│ │  On-Prem)   │ │ │ │             │ │ │ │             │ │
│ └─────────────┘ │ │ └─────────────┘ │ │ └─────────────┘ │
│                 │ │                 │ │                 │
│ DATA: NEVER     │ │ DATA: ANONYMIZED│ │ DATA: GENERAL   │
│ LEAVES INFRA    │ │ BEFORE SENDING  │ │ KNOWLEDGE ONLY  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Implementation in Code

The architecture is implemented in `apps/ai-service/app/routing/trust_router.py`:

```python
class ModelProvider(str, Enum):
    LOCAL = "local"           # Ollama - complete privacy
    OPENSOURCE = "opensource" # Groq - fast but external (free tier)
    OPENAI = "openai"         # Most capable but external
```

**Routing Logic:**
1. `PrivacyScanner` analyzes incoming query
2. If PII/sensitive content detected → Route to LOCAL (Ollama)
3. If Ollama unavailable → Anonymize and use OPENSOURCE (Groq)
4. For general queries → Use fastest available provider

---

## 4. Current Implementation Status

### Phase 1: Demo/Testing (CURRENT - Dec 2025)

| Component | Status | Notes |
|-----------|--------|-------|
| Groq Integration | ✅ Complete | Free tier, open-source models |
| Trust Router | ✅ Complete | Sensitivity-based routing |
| Privacy Scanner | ✅ Complete | PII detection |
| Web App (Railway) | ✅ Deployed | Production ready |
| AI Service | ⏳ Pending | Needs Railway deployment |

**Groq Models Available (FREE):**
- `llama-3.1-8b-instant` - Fast responses
- `llama-3.3-70b-versatile` - Complex reasoning
- `mixtral-8x7b-32768` - Long context

### Phase 2: Production (Target: Q1 2026)

| Component | Status | Notes |
|-----------|--------|-------|
| GPU VM Setup | 📋 Planned | RunPod or Lambda Labs |
| Self-hosted Llama 3.1 | 📋 Planned | 70B parameter model |
| Full hybrid routing | 📋 Planned | Automatic fallbacks |

### Phase 3: Enterprise (Target: Q2-Q3 2026)

| Component | Status | Notes |
|-----------|--------|-------|
| On-premise option | 📋 Planned | For enterprise clients |
| Fine-tuned legal model | 📋 Planned | Trained on Indian legal corpus |
| Multi-tenant isolation | 📋 Planned | Per-client data separation |

---

## 5. Provider Comparison

### External API Providers

| Provider | Free Tier | Best Model | Speed | Privacy Policy |
|----------|-----------|------------|-------|----------------|
| **Groq** | ✅ Yes | Llama 3.3 70B | ⚡ Fastest | No training on data |
| **OpenAI** | ❌ No | GPT-4o | Fast | Enterprise: No training |
| **Anthropic** | ❌ No | Claude 3.5 | Fast | No training on data |
| **Together AI** | ✅ Limited | Llama 3.1 405B | Fast | No training on data |

### Self-Hosted GPU Providers

| Provider | GPU Options | Cost/Hour | Best For |
|----------|-------------|-----------|----------|
| **RunPod** | A100, H100 | $1.50-4.00 | On-demand, easy setup |
| **Lambda Labs** | A100 | $1.29 | Spot instances |
| **Vast.ai** | Various | $0.20-2.00 | Budget, variable |
| **Azure ML** | A100, H100 | $3.00-5.00 | Enterprise, compliance |
| **AWS SageMaker** | Various | $3.00-6.00 | Enterprise, ecosystem |

---

## 6. Data Privacy Guarantees

### What We Promise Clients

1. **Sensitive Data Never Leaves Infrastructure**
   - Client names, case numbers, privileged content
   - Routed exclusively to self-hosted models

2. **PII Anonymization Before External API**
   - Names → [PERSON_1], [PERSON_2]
   - Addresses → [ADDRESS_REDACTED]
   - Case numbers → [CASE_REF_1]

3. **Enterprise API Agreements**
   - Groq, OpenAI, Anthropic all offer enterprise terms
   - Explicit: "We do not train on your data"

4. **Audit Logging**
   - Every query logged with routing decision
   - Which provider handled which query
   - Redacted versions stored for compliance

### Trust Badges in UI

```
🟢 LOCAL     - "Processed locally - data never left your infrastructure"
🔵 OPENSOURCE - "Processed with open-source model - anonymized"
🟡 OPENAI    - "Processed with OpenAI - no PII detected"
```

---

## 7. Migration Roadmap

### Immediate (Now - January 2026)

```bash
# 1. Deploy AI service to Railway
# 2. Set GROQ_API_KEY environment variable
# 3. Test full chat flow with Groq
```

### Short-term (Q1 2026)

```bash
# 1. Set up RunPod account
# 2. Deploy Ollama with Llama 3.1 70B
# 3. Configure OLLAMA_HOST to point to RunPod VM
# 4. Test hybrid routing
```

### Medium-term (Q2 2026)

```bash
# 1. Fine-tune Llama on Indian legal corpus
# 2. Deploy fine-tuned model
# 3. Add specialized legal reasoning
```

### Long-term (Q3 2026+)

```bash
# 1. Offer on-premise deployment option
# 2. Multi-region support
# 3. Client-specific model isolation
```

---

## 8. Cost Projections

### Current (Demo Phase)

| Item | Cost |
|------|------|
| Groq API | $0 (free tier) |
| Railway Web App | ~$5/month |
| Railway AI Service | ~$5/month |
| Railway PostgreSQL | ~$5/month |
| **Total** | **~$15/month** |

### Production (100 users)

| Item | Cost |
|------|------|
| Groq API | $0-50/month |
| Self-hosted GPU (RunPod) | $200-400/month |
| Railway infrastructure | ~$50/month |
| **Total** | **~$300-500/month** |

### Scale (1000+ users)

| Item | Cost |
|------|------|
| Reserved GPU instances | $500-1000/month |
| Multiple Railway services | ~$200/month |
| CDN/caching | ~$50/month |
| **Total** | **~$750-1250/month** |

---

## 9. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Dec 30, 2025 | Use Groq for demo | FREE, fast, open-source models |
| Dec 30, 2025 | Adopt hybrid architecture | Balance privacy and performance |
| Dec 30, 2025 | Keep Ollama integration | Future self-hosted production |
| Dec 30, 2025 | Implement trust routing | User transparency on data handling |

---

## 10. Key Contacts & Resources

### API Keys Required

| Service | Where to Get | Purpose |
|---------|--------------|---------|
| Groq | https://console.groq.com | Open-source models (FREE) |
| OpenAI | https://platform.openai.com | GPT-4 (paid) |
| Together | https://api.together.xyz | Llama 405B (paid) |

### Documentation

- [Groq Documentation](https://console.groq.com/docs)
- [Ollama Documentation](https://ollama.ai/docs)
- [RunPod Documentation](https://docs.runpod.io)
- [Lambda Labs](https://lambdalabs.com/service/gpu-cloud)

---

## 11. Conclusion

The **Hybrid Architecture** allows LawSphere to:

1. ✅ **Protect sensitive data** - Never expose client information to external APIs
2. ✅ **Maintain performance** - Use fast external APIs for non-sensitive queries
3. ✅ **Control costs** - Free tier for demo, scalable for production
4. ✅ **Future-proof** - Easy migration to fully self-hosted when ready
5. ✅ **Build trust** - Transparent trust badges show users how their data is handled

This approach acknowledges the reality that:
- External AI models ARE getting faster and more capable
- Complete data isolation IS possible but has trade-offs
- A hybrid approach gives the best of both worlds
- The architecture can evolve as the product and team mature

---

*This document should be reviewed and updated quarterly or when major infrastructure decisions are made.*
