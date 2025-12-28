# Lawsphere Development Session Notes

> Last Updated: December 28, 2025

---

## 🎯 Project Overview

**Lawsphere** is a legal-tech AI platform built for Indian legal professionals with a **privacy-first architecture**. 

**Target Market**: Indian lawyers, law firms, legal departments
**Key Differentiator**: Sensitive legal data NEVER leaves the local environment

---

## ✅ Completed Features

### 1. Core Application Structure
- **Frontend**: Next.js 14 with App Router, Tailwind CSS, Radix UI
- **Backend**: FastAPI with LangGraph
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Storage**: MinIO (S3-compatible)

### 2. Authentication System
- NextAuth.js with credentials provider
- Login/Register pages
- Protected dashboard routes

### 3. Dashboard UI
- Sidebar navigation
- Top bar with user menu
- Chat interface
- Files panel
- Notes panel
- Settings page

### 4. Trust-First LLM Routing (Privacy Architecture)

#### Privacy Scanner (`apps/ai-service/app/routing/privacy_scanner.py`)
Detects sensitive content:
- **Indian PII**: Aadhaar (1234-5678-9012), PAN (ABCDE1234F), Phone (+91...)
- **Legal Markers**: Attorney-client privilege, confidential, case numbers
- **Document Types**: Vakalatnama, affidavit, NDA, contracts
- **Financial**: Bank accounts, IFSC codes, settlements

#### Trust Router (`apps/ai-service/app/routing/trust_router.py`)
Routes requests based on sensitivity:
```
SENSITIVE DATA → 🔒 LOCAL MODEL (Ollama)
GENERIC QUERIES → ☁️ CLOUD MODEL (Gemini Flash)
```

#### Audit Logger (`apps/ai-service/app/routing/audit_logger.py`)
- Logs all routing decisions
- Hashes content (never stores plaintext)
- Compliance-ready JSONL format
- Daily log files in `logs/audit/`

#### Trust Chat API (`apps/ai-service/app/api/trust_chat.py`)
New endpoints:
- `POST /api/chat/trust/completions` - Privacy-aware chat
- `GET /api/chat/trust/dashboard` - Privacy metrics
- `GET /api/chat/trust/stats` - Statistics
- `GET /api/chat/trust/models` - Available models
- `GET /api/chat/trust/routing-rules` - Transparency rules

### 5. Ollama Integration (`apps/ai-service/app/models/ollama_client.py`)
- Async HTTP client for local inference
- Health checking
- Model listing
- Chat and generate endpoints
- Streaming support

### 6. UI Components

#### Trust Badge (`apps/web/src/components/chat/trust-badge.tsx`)
- `TrustBadge` - Full trust info display
- `TrustIndicator` - Compact local/cloud indicator
- `TrustDashboard` - Privacy metrics dashboard
- `TrustModelSelector` - Model picker with trust grouping

#### Chat Panel (`apps/web/src/components/chat/chat-panel.tsx`)
- Model selector grouped by Local/Cloud
- Trust indicators on AI messages
- Overflow handling for code blocks

#### Footer (`apps/web/src/components/layout/footer.tsx`)
- ATH Tech Hub branding
- Social links (LinkedIn, GitHub, Website)
- Copyright notice

---

## 📁 Key File Locations

### Backend (AI Service)
```
apps/ai-service/
├── main.py                          # FastAPI app entry
├── app/
│   ├── config.py                    # Settings & env vars
│   ├── agents/
│   │   └── legal_assistant.py       # LangGraph agent
│   ├── api/
│   │   ├── chat.py                  # Basic chat endpoints
│   │   ├── trust_chat.py            # Privacy-aware chat ⭐
│   │   ├── files.py                 # File handling
│   │   ├── health.py                # Health checks + Ollama status
│   │   └── search.py                # Legal search
│   ├── models/
│   │   ├── llm_router.py            # Model routing
│   │   └── ollama_client.py         # Ollama integration ⭐
│   └── routing/
│       ├── privacy_scanner.py       # PII detection ⭐
│       ├── trust_router.py          # Routing logic ⭐
│       └── audit_logger.py          # Compliance logging ⭐
```

### Frontend (Web)
```
apps/web/src/
├── app/
│   ├── dashboard/                   # Protected pages
│   ├── auth/                        # Login/Register
│   └── api/                         # API routes
├── components/
│   ├── chat/
│   │   ├── chat-panel.tsx           # Main chat UI ⭐
│   │   ├── trust-badge.tsx          # Trust indicators ⭐
│   │   ├── files-panel.tsx
│   │   └── notes-panel.tsx
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── top-bar.tsx
│   │   └── footer.tsx
│   └── ui/                          # Radix UI components
└── lib/
    ├── auth.ts                      # NextAuth config
    └── prisma.ts                    # Database client
```

### Documentation
```
docs/
├── LOCAL_LLM_SETUP.md               # Ollama setup guide ⭐
└── SESSION_NOTES.md                 # This file
```

---

## 🔧 Configuration

### Environment Variables

**AI Service** (`apps/ai-service/.env`):
```env
GOOGLE_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key        # Optional
ANTHROPIC_API_KEY=your_anthropic_key  # Optional
DEFAULT_MODEL=gemini-2.0-flash-exp
OLLAMA_BASE_URL=http://localhost:11434
```

**Web App** (`apps/web/.env`):
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
AI_SERVICE_URL=http://localhost:8000
```

---

## 🚀 How to Run

### Start All Services
```bash
# Option 1: Script
./scripts/start-all.cmd   # Windows
./scripts/start-all.sh    # Linux/Mac

# Option 2: Docker
docker-compose up -d

# Option 3: Manual
# Terminal 1: Database & Redis
docker-compose up postgres redis minio -d

# Terminal 2: AI Service
cd apps/ai-service
python -m uvicorn main:app --port 8000 --reload

# Terminal 3: Web App
cd apps/web
npm run dev
```

### Start Ollama (for local inference)
```bash
ollama serve
ollama pull qwen2.5:7b
ollama pull llama3.1:8b
```

### URLs
| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| AI Service | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Ollama | http://localhost:11434 |

---

## ⏳ Pending Tasks

### High Priority
1. **Test Local Inference on Powerful Machine**
   - Need 32GB+ RAM or GPU for Ollama
   - Current dev machine has only 16GB RAM, no GPU
   - Follow `docs/LOCAL_LLM_SETUP.md`

2. **Connect Frontend to Trust Chat API**
   - Update `apps/web/src/lib/api/ai-client.ts` to use `/api/chat/trust/completions`
   - Display trust info in chat messages

3. **Add Trust Dashboard Page**
   - Create `/dashboard/privacy` route
   - Show privacy metrics from `/api/chat/trust/dashboard`

### Medium Priority
4. **File Upload with Local Processing**
   - Upload to MinIO
   - Extract text locally
   - Route to local LLM

5. **Legal Document Templates**
   - Contract drafts
   - Affidavits
   - Vakalatnama

6. **Search Integration**
   - Indian legal databases
   - Case law search

### Low Priority
7. **User Management**
   - Roles (Admin, Lawyer, Paralegal)
   - Organization support

8. **Billing Integration**
   - Track token usage
   - Razorpay integration

---

## 💡 Key Decisions Made

### Why Privacy-First Routing?
- Indian legal data is highly sensitive
- Client trust is paramount
- Regulatory compliance (upcoming DPDP Act)
- Competitive differentiator for Indian market

### Why Ollama for Local Inference?
- Free and open source
- Simple API (OpenAI compatible)
- Supports latest models (Qwen, Llama, Mistral)
- Easy Docker deployment

### Why Gemini Flash for Cloud?
- Cheapest: $0.000075/1K tokens (₹0.006)
- Fast: ~500ms latency
- Good quality for general queries
- Generous free tier

### Model Selection
| Use Case | Model | Why |
|----------|-------|-----|
| Sensitive docs | Qwen 2.5 7B (Local) | Best multilingual, free |
| Quick local | Llama 3.1 8B (Local) | Fast, good reasoning |
| Cloud queries | Gemini Flash | Cheap, fast |
| Complex analysis | GPT-4o | Best quality ($$) |

---

## 🐛 Known Issues

1. **Ollama Memory**: 7B models need ~6GB RAM free
   - Solution: Use 3B model or dedicated server

2. **First Model Load Slow**: 30-60 seconds on first request
   - Solution: Pre-warm models on startup

3. **Windows `nul` File**: Git can't track Windows reserved names
   - Solution: Deleted the files

---

## 📞 Contacts

- **Project**: Lawsphere by ATH Tech Hub
- **Website**: https://antixxtechhub.com
- **LinkedIn**: https://www.linkedin.com/company/antixx-tech-hub

---

## 📝 Session History

### December 28, 2025
- Fixed footer layout (logo, powered by text)
- Added colorful social link icons
- Fixed chat panel overflow for code blocks
- Discussed LLM routing strategies (LiteLLM, semantic routing)
- Implemented Trust-First Architecture:
  - Privacy Scanner
  - Trust Router
  - Audit Logger
  - Trust Chat API
  - Trust Badge UI
- Installed Ollama on Windows
- Pulled Qwen 2.5 7B and Llama 3.1 8B models
- Discovered memory limitations (16GB RAM insufficient)
- Created LOCAL_LLM_SETUP.md documentation
- Created this SESSION_NOTES.md

### Previous Sessions
- Initial project setup
- Database schema design
- Authentication implementation
- Dashboard UI creation
- Basic chat functionality

---

*This file is version controlled. Update it as you make progress!*
