# Production Deployment Checklist

## Quick Reference for Railway Deployment

### Required Environment Variables

#### Web Service (`apps/web`)

```bash
# Database (Railway PostgreSQL - auto-configured)
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:PORT/railway

# Authentication (REQUIRED)
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>

# AI Service URL
AI_SERVICE_URL=http://ai-service.railway.internal:8000

# File Storage
USE_LOCAL_STORAGE=false  # Set true if not using S3
S3_BUCKET=lawsphere-files
S3_REGION=us-east-1
S3_ACCESS_KEY=<your-key>
S3_SECRET_KEY=<your-secret>
S3_ENDPOINT=<your-endpoint>  # For MinIO/custom S3

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

#### AI Service (`apps/ai-service`)

```bash
# Environment
APP_ENV=production
DEBUG=false

# LLM Provider (choose one - Groq is FREE!)
GROQ_API_KEY=<your-groq-key>  # Get free at console.groq.com/keys

# Model Configuration
OPENSOURCE_PROVIDER=groq
OPENSOURCE_MODEL=llama-3.1-8b-instant
DEFAULT_MODEL=llama-3.1-8b-instant

# Optional: Paid providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# Tracing (optional)
LANGCHAIN_TRACING_V2=false
```

### Pre-Deployment Steps

1. **Generate secrets:**
   ```bash
   openssl rand -base64 32  # For NEXTAUTH_SECRET
   ```

2. **Get Groq API Key (FREE):**
   - Go to https://console.groq.com/keys
   - Create account & generate API key
   - Add to Railway env vars

3. **Verify build locally:**
   ```bash
   cd apps/web && npm run build
   cd ../ai-service && pip install -r requirements.txt
   ```

### Railway Service Configuration

| Service | Root Directory | Start Command |
|---------|----------------|---------------|
| web | `apps/web` | `node server.js` |
| ai-service | `apps/ai-service` | Auto-detected |
| postgres | - | Railway template |

### Health Check Endpoints

- **Web**: `https://your-app.railway.app/_health`
- **AI Service**: `https://your-ai.railway.app/health`

### Post-Deployment Verification

1. Check health endpoints
2. Test login flow
3. Test chat with Groq models
4. Verify file upload (if S3 configured)

### Available Groq Models (FREE)

| Model | Use Case | Context |
|-------|----------|---------|
| `llama-3.1-8b-instant` | Fast responses | 131K |
| `llama-3.3-70b-versatile` | Complex analysis | 131K |
| `mixtral-8x7b-32768` | General purpose | 32K |
| `gemma2-9b-it` | Compact & capable | 8K |

### Troubleshooting

**Build fails:**
- Check Railway logs for errors
- Ensure `package.json` has correct scripts
- Verify Prisma schema is valid

**502 errors:**
- Check if server is binding to `0.0.0.0:PORT`
- Verify health endpoint returns 200

**Chat not working:**
- Verify GROQ_API_KEY is set
- Check AI service logs for errors
- Ensure AI_SERVICE_URL is correct

**Files not uploading:**
- If using S3: verify S3 credentials
- If local: set USE_LOCAL_STORAGE=true (not recommended for prod)
