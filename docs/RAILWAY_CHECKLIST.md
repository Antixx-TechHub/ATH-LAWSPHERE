# Railway Deployment Checklist ✅

**Complete this checklist to deploy Lawsphere on Railway.app with local LLM support.**

## Pre-Deployment (Do Once)

- [ ] **GitHub Account**
  - GitHub account created and verified
  - Two-factor authentication enabled (recommended)

- [ ] **Railway Account**  
  - Created account at [railway.app](https://railway.app)
  - Payment method added (pay-as-you-go)
  - [Estimated cost: $15-30/month with local LLMs]

- [ ] **Repository Prepared**
  - Repository forked to your GitHub account
  - Pushed latest code to main branch
  - `.github/workflows/deploy.yml` exists
  - `docker-compose.railway.yml` exists

## Railway Project Setup (Do Once)

- [ ] **Create Railway Project**
  1. Go to [railway.app](https://railway.app)
  2. Click "New Project"
  3. Select "Deploy from GitHub repo"
  4. Connect GitHub account
  5. Select your lawsphere fork
  6. Wait for services to initialize

- [ ] **Set Environment Variables**
  
  In Railway Dashboard → Variables, set all:
  
  ```
  DATABASE_URL=postgresql://... (Railway generates)
  REDIS_PASSWORD=your-secure-password
  NEXTAUTH_URL=https://your-app-name.railway.app
  NEXTAUTH_SECRET=openssl rand -base64 32
  POSTGRES_USER=lawsphere
  POSTGRES_PASSWORD=secure-password
  POSTGRES_DB=lawsphere
  
  # Local LLM Configuration
  OLLAMA_ENABLED=true
  OLLAMA_BASE_URL=http://ollama:11434
  OLLAMA_MODEL=qwen2
  
  # Cloud API Keys (Optional fallback)
  OPENAI_API_KEY=sk-... (if using fallback)
  ANTHROPIC_API_KEY=... (optional)
  GOOGLE_API_KEY=... (optional)
  
  # Logging
  LOG_LEVEL=info
  ```

- [ ] **Configure Services**
  
  For each service, verify:
  - [ ] **postgres**: 
    - Uses `pgvector/pgvector:pg16` image
    - Has 10GB+ storage allocated
    - Health checks enabled
  
  - [ ] **redis**:
    - Uses `redis:7-alpine` image
    - Has 1GB+ storage allocated
    - Health checks enabled
  
  - [ ] **ollama**:
    - Uses `ollama/ollama:latest` image
    - Has 20GB+ storage allocated (for models)
    - Health checks enabled
    - Port 11434 exposed
  
  - [ ] **ai-service**:
    - Uses ghcr.io image from your registry
    - Depends on postgres, redis, ollama
    - Port 8000 exposed
    - Restart policy: always
  
  - [ ] **web**:
    - Uses ghcr.io image from your registry
    - Depends on ai-service
    - Port 3000 exposed
    - Restart policy: always

- [ ] **Enable Deployments**
  
  - [ ] GitHub Actions workflows enabled in your fork
  - [ ] Secrets configured in GitHub:
    - [ ] `RAILWAY_TOKEN_STAGING` (from Railway)
    - [ ] `RAILWAY_TOKEN_PROD` (from Railway)

## First Deployment

- [ ] **Trigger Deployment**
  ```bash
  git push origin main  # Auto-triggers GitHub Actions
  # Watch Railway dashboard for build progress
  ```

- [ ] **Verify Services**
  
  In Railway dashboard, check each service:
  - [ ] postgres - status: Running ✅
  - [ ] redis - status: Running ✅
  - [ ] ollama - status: Running ✅
  - [ ] ai-service - status: Running ✅
  - [ ] web - status: Running ✅

- [ ] **Check Service Logs**
  
  Click each service → View Logs:
  ```
  postgres: "database system is ready"
  redis: "Ready to accept connections"
  ollama: "listening on 0.0.0.0:11434"
  ai-service: "Uvicorn running on 0.0.0.0:8000"
  web: "Ready - started server on..."
  ```

## Initialize Ollama Model

- [ ] **SSH into Railway**
  ```bash
  railway shell
  ```

- [ ] **Pull Default Model**
  ```bash
  # Run initialization script
  ./scripts/init-ollama.sh
  
  # Or manually pull
  docker exec lawsphere-ollama-railway ollama pull qwen2
  # Wait 5-15 minutes (depends on internet speed)
  ```

- [ ] **Verify Model Loaded**
  ```bash
  railway shell
  curl http://ollama:11434/api/tags
  # Should show: "name": "qwen2"
  ```

## Post-Deployment Verification

- [ ] **Test Frontend**
  - [ ] Visit https://your-app-name.railway.app
  - [ ] Should load Lawsphere UI
  - [ ] Can navigate to dashboard

- [ ] **Test Backend Health**
  ```bash
  curl https://your-app-name.railway.app/api/health
  # Should return: {"status": "healthy"}
  ```

- [ ] **Test Chat with Local LLM**
  1. Navigate to Chat
  2. Type a message
  3. Wait for response (first one takes 8-12 seconds)
  4. Should see local LLM response
  5. No API charges! ✅

- [ ] **Test File Upload**
  1. Upload a file (PDF, TXT, etc.)
  2. Check Files tab
  3. Should appear in database

- [ ] **Test OAuth (Optional)**
  1. Try Google login
  2. Try GitHub login
  3. Should redirect properly

## Ongoing Operations

### Daily Checks

- [ ] Check Railway dashboard for errors
- [ ] Verify all services running
- [ ] Monitor costs (Railway shows in dashboard)

### Regular Tasks

- [ ] **Push Code Updates**
  ```bash
  git add .
  git commit -m "Feature: ..."
  git push origin main  # Auto-deploys
  ```

- [ ] **Check Logs**
  ```bash
  railway shell
  docker logs lawsphere-ai-railway -f
  ```

- [ ] **Monitor Costs**
  - Railway dashboard → Billing
  - Typical cost with local LLM: $15-30/month
  - No usage-based fees!

### Update Models

- [ ] **Try Different Model**
  ```bash
  railway shell
  docker exec ollama ollama pull llama2  # Or other model
  ```

- [ ] **Change Default**
  - Update Railway variable: `OLLAMA_MODEL=llama2`
  - Services auto-restart

## Troubleshooting

### Service Won't Start

**Problem:** Red X on service in Railway

**Solution:**
1. Click service → View Logs
2. Check error message
3. Common fixes:
   - Increase memory allocation
   - Increase disk allocation
   - Check environment variables
   - Restart service

### Ollama Not Responding

**Problem:** Chat times out or says model unavailable

**Solution:**
```bash
railway shell
docker logs lawsphere-ollama-railway
docker exec ollama ollama list  # Check if model loaded
```

If model missing:
```bash
docker exec ollama ollama pull qwen2
```

### Out of Memory

**Problem:** Ollama kills or restarts frequently

**Solution:**
1. Use smaller model:
   ```
   OLLAMA_MODEL=qwen2:3b  (instead of qwen2:7b)
   ```
2. Or increase Railway plan to get more memory

### Database Connection Error

**Problem:** "database connection refused"

**Solution:**
1. Ensure postgres service running
2. Check DATABASE_URL variable
3. Verify postgres is healthy (Railway dashboard)
4. Restart postgres service

## Cost Optimization

### Current Setup Cost

| Service | Monthly Cost |
|---------|--------------|
| Compute (2 vCPU) | $7-12 |
| PostgreSQL (10GB) | $5-8 |
| Redis | $2-3 |
| Storage | $0-2 |
| **Total** | **$14-25/month** |

### API Comparison

**With Ollama (Local):**
- Cost: $14-25/month
- Storage: 5GB/month (models)
- Unlimited requests: ✅

**Without Ollama (Cloud API):**
- Cost: $300-500/month (at scale)
- Storage: 0-5GB/month
- Rate limited: ⚠️

**Savings: 95%+**

## Next Steps

1. ✅ Complete this checklist
2. ✅ Test all features in Railway
3. ✅ Monitor costs and performance
4. ✅ Configure team access (Railway > Teams)
5. ✅ Set up backups (Railway Plugins)
6. ✅ Plan disaster recovery

## Quick Commands Reference

```bash
# SSH into Railway
railway shell

# View logs
railway logs

# View variables
railway variables

# Restart service
railway restart --service ai-service

# Pull a model
docker exec ollama ollama pull llama2

# Check Ollama health
curl http://ollama:11434/api/tags

# Check AI service health
curl http://ai-service:8000/health

# Database shell
psql $DATABASE_URL

# Redis shell
redis-cli
```

## Support Links

- Railway Docs: https://docs.railway.app
- Ollama Docs: https://github.com/ollama/ollama
- Local LLM Guide: [LOCAL_LLM_SIMPLIFIED.md](LOCAL_LLM_SIMPLIFIED.md)
- Team Setup: [TEAM_SETUP.md](TEAM_SETUP.md)

---

**Questions?** Check the full [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) guide.
