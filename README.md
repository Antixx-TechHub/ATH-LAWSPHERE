# Lawsphere - Legal-Tech AI Platform

A next-generation legal-tech AI platform that empowers legal professionals, clients, and teams to interact with legal information, collaborate on cases, and leverage state-of-the-art AI models for research, drafting, and discovery.

## 🏗️ Architecture

### Monorepo Structure

```
lawsphere/
├── apps/
│   ├── web/                 # Next.js frontend application
│   └── ai-service/          # FastAPI AI orchestration backend
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── database/            # Prisma schema and client
│   └── shared/              # Shared types and utilities
├── docker/                  # Docker configurations
└── docs/                    # Documentation
```

### Technology Stack

**Frontend:**
- Next.js 14+ (App Router)
- React 18+
- Tailwind CSS
- Socket.IO Client
- NextAuth.js

**Backend (Node.js):**
- Next.js API Routes
- Socket.IO Server
- Prisma ORM
- Redis (pub/sub)

**Backend (Python):**
- FastAPI
- LangGraph
- LangSmith
- LangChain

**Database:**
- PostgreSQL with PGVector
- Redis

**Infrastructure:**
- Docker & Docker Compose
- Kafka
- S3-compatible storage

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15+ with PGVector

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd lawsphere
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/ai-service/.env.example apps/ai-service/.env
```

4. Start infrastructure services:
```bash
npm run docker:up
```

5. Run database migrations:
```bash
npm run db:push
```

6. Start development servers:
```bash
npm run dev
```

## 📦 Apps & Packages

### Apps

- **web**: Next.js frontend with real-time chat, file management, and collaborative notes
- **ai-service**: FastAPI backend for AI orchestration with LangGraph

### Packages

- **ui**: Shared React components with Tailwind CSS
- **database**: Prisma schema and database client
- **shared**: Shared TypeScript types and utilities

## 🔐 Features

- **Authentication & SSO**: OAuth 2.0, JWT, Multi-Factor Authentication
- **Real-Time Chat**: WebSocket-based multi-user sessions
- **AI Integration**: Multi-LLM routing (GPT-4, Claude, Gemini)
- **File Processing**: OCR, document parsing, vector embeddings
- **Collaborative Notes**: Real-time editing with version history
- **Vector Search**: Semantic search with PGVector
- **RBAC**: Role-based access control

## �️ Development

### Running Locally

```bash
# Start all infrastructure (PostgreSQL, Redis, Kafka, MinIO)
docker-compose up -d postgres redis minio

# Run database migrations
cd apps/web && npx prisma migrate dev

# Start Next.js frontend (with Socket.IO)
npm run dev --workspace=apps/web

# Start FastAPI backend (in separate terminal)
cd apps/ai-service && uvicorn main:app --reload --port 8000
```

### Project Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all development servers |
| `npm run build` | Build all applications |
| `npm run lint` | Lint all packages |
| `npm run test` | Run all tests |
| `docker-compose up -d` | Start infrastructure services |

### Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string  
- `NEXTAUTH_SECRET` - NextAuth.js secret key
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key
- `GOOGLE_API_KEY` - Google AI API key

## 📁 Key Files

```
apps/web/
├── src/app/                    # Next.js App Router pages
│   ├── dashboard/              # Protected dashboard routes
│   │   ├── chat/               # AI chat interface
│   │   ├── files/              # File management
│   │   ├── search/             # Semantic search
│   │   └── settings/           # User settings
│   └── api/                    # API routes
├── src/components/             # React components
│   ├── chat/                   # Chat components
│   ├── layout/                 # Layout components
│   └── ui/                     # UI primitives
├── src/lib/                    # Utilities
│   ├── auth.ts                 # NextAuth configuration
│   ├── prisma.ts               # Prisma client
│   └── socket-server.ts        # Socket.IO server
└── prisma/schema.prisma        # Database schema

apps/ai-service/
├── app/
│   ├── agents/                 # LangGraph agents
│   │   └── legal_assistant.py  # Legal AI assistant
│   ├── api/                    # FastAPI routes
│   ├── models/                 # LLM router
│   └── middleware/             # Request middleware
└── main.py                     # FastAPI application
```

## 🔧 API Endpoints

### Next.js API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | ALL | NextAuth.js authentication |
| `/api/chat` | GET/POST | Chat sessions and messages |
| `/api/files` | GET/POST/DELETE | File management |

### FastAPI Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/chat/completions` | POST | AI chat completion |
| `/api/chat/models` | GET | Available AI models |
| `/api/files/upload` | POST | Upload file for processing |
| `/api/search/semantic` | POST | Semantic search |
| `/api/search/hybrid` | POST | Hybrid search |

## 🤖 AI Models Supported

| Model | Provider | Use Case |
|-------|----------|----------|
| GPT-4o | OpenAI | General, cost-effective |
| GPT-4 | OpenAI | Complex legal analysis |
| Claude 3 Opus | Anthropic | Long documents |
| Claude 3 Sonnet | Anthropic | Balanced performance |
| Gemini Pro | Google | Fast responses |

## �📄 License

MIT License - see LICENSE file for details
