# Lawsphere Team Setup Guide

Complete setup guide for teams to develop, test, and deploy Lawsphere.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [One-Time Team Setup](#one-time-team-setup)
3. [Daily Development](#daily-development)
4. [Testing](#testing)
5. [Debugging](#debugging)
6. [Deploying](#deploying)
7. [Team Roles](#team-roles)

---

## 📦 Prerequisites

### Required
- **Docker Desktop** (includes Docker & Docker Compose)
  - [Windows](https://www.docker.com/products/docker-desktop)
  - [Mac](https://www.docker.com/products/docker-desktop)
  - [Linux](https://docs.docker.com/engine/install/)
  - **Minimum**: 4GB RAM, 10GB disk space
  - **Recommended**: 8GB RAM, 20GB disk space

- **Git** (for cloning and commits)
  - [Download](https://git-scm.com/)

- **Text Editor** (optional but recommended)
  - VS Code, WebStorm, or your preferred editor

### Not Required (for local dev)
- Node.js
- Python
- PostgreSQL
- Redis
- *(All included in Docker containers)*

---

## 🚀 One-Time Team Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/lawsphere.git
cd lawsphere
```

### Step 2: Create Environment File

```bash
# Copy the development template
cp .env.example .env.development

# Edit and add your API keys (or skip for now)
# You need at least ONE of:
#   - OPENAI_API_KEY
#   - ANTHROPIC_API_KEY
#   - GOOGLE_API_KEY
```

### Step 3: Start Development Environment

**Windows:**
```bash
.\scripts\team-dev.cmd
# Select option 1: Start development environment
```

**Mac/Linux:**
```bash
bash scripts/team-dev.sh
# Select option 1: Start development environment
```

### Step 4: Verify Everything Works

After services start, verify endpoints:
```bash
# Web Frontend
curl http://localhost:3000

# AI API
curl http://localhost:8000/health

# Database
# psql -h localhost -U lawsphere -d lawsphere_dev
```

Or use the health check:
```bash
# Windows
.\scripts\team-dev.cmd
# Select option 10: Health check

# Mac/Linux
bash scripts/team-dev.sh
# Select option 10: Health check
```

---

## 💻 Daily Development

### Starting Your Day

```bash
# Windows
.\scripts\team-dev.cmd
# Select 1: Start development environment

# Mac/Linux
bash scripts/team-dev.sh
# Select 1: Start development environment
```

Services will be available at:
- **Web Frontend:** http://localhost:3000
- **AI API:** http://localhost:8000
- **Database:** localhost:5432 (user: `lawsphere`, password: `lawsphere_dev`)
- **Redis:** localhost:6379
- **Ollama (Local LLM):** http://localhost:11434 (optional, pull models as needed)

### Making Code Changes

#### For Web Frontend (Next.js)
```bash
# The development server auto-reloads on changes
# Edit files in: apps/web/src/

# Example:
# 1. Edit apps/web/src/components/chat/chat-panel.tsx
# 2. Save the file
# 3. http://localhost:3000 auto-refreshes
```

#### For AI Service (FastAPI)
```bash
# The development server auto-reloads on changes
# Edit files in: apps/ai-service/app/

# Example:
# 1. Edit apps/ai-service/app/api/chat.py
# 2. Save the file
# 3. Changes auto-reload, test with: curl http://localhost:8000/api/chat
```

### Running Tests Locally

```bash
# Windows
.\scripts\team-dev.cmd
# Select 9: Run tests

# Mac/Linux
bash scripts/team-dev.sh
# Select 9: Run tests
```

Or manually:
```bash
# Web frontend linting
docker-compose -f docker-compose.dev.local.yml exec web npm run lint

# AI service syntax check
docker-compose -f docker-compose.dev.local.yml exec ai-service python -m py_compile $(find . -name "*.py")
```

### Viewing Logs

```bash
# Windows
.\scripts\team-dev.cmd
# Select 4: View logs
# Then choose which service

# Mac/Linux
bash scripts/team-dev.sh
# Select 4: View logs
# Then choose which service

# Or directly:
docker-compose -f docker-compose.dev.local.yml logs -f web
docker-compose -f docker-compose.dev.local.yml logs -f ai-service
```

### Stopping Development

```bash
# Windows
.\scripts\team-dev.cmd
# Select 2: Stop all services

# Mac/Linux
bash scripts/team-dev.sh
# Select 2: Stop all services
```

---

## 🧪 Testing

### Database Testing

Access the database shell:
```bash
# Windows
.\scripts\team-dev.cmd
# Select 5: Database shell

# Mac/Linux
bash scripts/team-dev.sh
# Select 5: Database shell
```

Common queries:
```sql
-- List all tables
\dt

-- Check recent messages
SELECT * FROM chat_message ORDER BY created_at DESC LIMIT 10;

-- Check sessions
SELECT * FROM chat_session;

-- Check uploaded files
SELECT * FROM session_file;
```

### API Testing

Test AI service endpoints:
```bash
# Health check
curl http://localhost:8000/health

# Get sessions
curl http://localhost:8000/api/sessions

# Create session
curl -X POST http://localhost:8000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Session"}'

# Send chat message
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "session-uuid",
    "message": "Hello",
    "model": "auto"
  }'
```

### Frontend Testing

Test the web frontend:
1. Open http://localhost:3000
2. Test user flows:
   - Create new session
   - Upload file
   - Send message
   - Check file appears in Files tab
   - Delete file
   - Delete session

### Automated Tests

Run the CI/CD test suite locally:
```bash
# Web tests
docker-compose -f docker-compose.dev.local.yml exec web npm run lint

# AI tests
docker-compose -f docker-compose.dev.local.yml exec ai-service python -m pytest app/
```

---

## 🔍 Debugging

### Service Health Check

```bash
# Windows
.\scripts\team-dev.cmd
# Select 10: Health check

# Mac/Linux
bash scripts/team-dev.sh
# Select 10: Health check
```

### View Service Logs

```bash
docker-compose -f docker-compose.dev.local.yml logs -f SERVICE_NAME

# Examples:
docker-compose -f docker-compose.dev.local.yml logs -f web
docker-compose -f docker-compose.dev.local.yml logs -f ai-service
docker-compose -f docker-compose.dev.local.yml logs -f postgres
```

### Service Shell Access

```bash
# Web service shell
docker-compose -f docker-compose.dev.local.yml exec web /bin/bash

# AI service shell
docker-compose -f docker-compose.dev.local.yml exec ai-service /bin/bash

# Database shell
docker-compose -f docker-compose.dev.local.yml exec postgres psql -U lawsphere -d lawsphere_dev
```

### Debugging Connectivity Issues

```bash
# Windows
.\scripts\team-dev.cmd
# Select 11: Debug connectivity

# Mac/Linux
bash scripts/team-dev.sh
# Select 11: Debug connectivity

# This tests:
# - Web → AI API connectivity
# - AI → Database connectivity
# - AI → Redis connectivity
```

### Common Issues

**Port Already in Use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :3000   # Windows, then taskkill /PID <PID> /F

# Kill process on port 8000
lsof -ti:8000 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :8000   # Windows
```

**Database Connection Error**
```bash
# Restart PostgreSQL
docker-compose -f docker-compose.dev.local.yml restart postgres

# Or hard reset everything
.\scripts\team-dev.cmd
# Select 8: Clean everything
```

**API Returns 404**
```bash
# Check if AI service is running
docker-compose -f docker-compose.dev.local.yml ps ai-service

# Check logs
docker-compose -f docker-compose.dev.local.yml logs ai-service

# Verify endpoint exists
curl -v http://localhost:8000/api/health
```

---

## 🚀 Deploying

### Automatic Deployments

The CI/CD pipeline (`GitHub Actions`) automatically:
1. **On any push to `develop`:**
   - Runs tests
   - Builds Docker images
   - Deploys to **Staging**

2. **On any push to `main`:**
   - Runs tests
   - Builds Docker images
   - Deploys to **Production**

### Manual Testing Before Deployment

1. **Test in development:**
   ```bash
   .\scripts\team-dev.cmd
   # or
   bash scripts/team-dev.sh
   ```

2. **Test new features thoroughly**

3. **Commit and push:**
   ```bash
   git add .
   git commit -m "Feature: description"
   git push origin feature-branch
   ```

4. **Create Pull Request**
   - Request review from team
   - Wait for CI/CD tests to pass
   - Merge when approved

### Staging Deployment

Test in staging environment before production:
```bash
# 1. Merge to develop branch
git checkout develop
git merge --no-ff feature-branch
git push origin develop

# 2. GitHub Actions auto-deploys to staging
# 3. Test at: https://lawsphere-staging.railway.app
```

### Production Deployment

Deploy to production:
```bash
# 1. Create release tag
git checkout main
git merge --no-ff develop
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main
git push origin v1.0.0

# 2. GitHub Actions auto-deploys to production
# 3. Verify at: https://lawsphere.app
```

---

## 👥 Team Roles

### Frontend Developer
- **Work in:** `apps/web/src/`
- **Tools:** Browser DevTools, Next.js docs
- **Common Tasks:**
  - Build UI components
  - Handle authentication
  - Integrate with AI API
- **Testing:** `npm run lint`, manual testing at http://localhost:3000

### Backend/AI Developer
- **Work in:** `apps/ai-service/app/`
- **Tools:** Postman, curl, database tools
- **Common Tasks:**
  - Build API endpoints
  - Integrate LLM models
  - Handle data processing
- **Testing:** API tests with curl, database queries

### DevOps/Infrastructure
- **Work in:** `docker-compose.*.yml`, `.github/workflows/`
- **Responsibilities:**
  - Manage deployments
  - Configure environments
  - Monitor production
  - Database backups
- **Tools:** Railway dashboard, GitHub Actions, Docker

### QA/Tester
- **Focus:** Manual testing, edge cases
- **Common Tasks:**
  - Test workflows end-to-end
  - Report bugs
  - Verify fixes
  - Load testing
- **Tools:** Development environment, staging environment

---

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Local LLM Setup Guide](./LOCAL_LLM_SIMPLIFIED.md) - Use free local models in development!
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Railway Documentation](https://docs.railway.app/)

---

## 📞 Getting Help

**Team Channel:** #lawsphere-dev (Slack/Discord/Teams)

**Common Questions:**
1. **"Services won't start"** → Check Docker is running, check port conflicts
2. **"Database connection error"** → Restart containers: `docker-compose -f docker-compose.dev.local.yml restart`
3. **"API returning 404"** → Check logs: `docker-compose -f docker-compose.dev.local.yml logs ai-service`
4. **"Frontend not updating"** → Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

---

**Last Updated:** December 29, 2025
