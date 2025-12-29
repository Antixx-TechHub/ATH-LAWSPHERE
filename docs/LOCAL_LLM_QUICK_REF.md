# Local LLM Quick Reference Card

**Save this for quick copy-paste commands!**

---

## Start With Local LLM

```bash
# 1. Start all services (includes Ollama)
docker-compose -f docker-compose.dev.local.yml up -d

# 2. Pull Qwen 2.5 (recommended)
docker-compose -f docker-compose.dev.local.yml exec ollama ollama pull qwen2

# 3. Open http://localhost:3000
# Select model dropdown → Qwen 2.5 7B
# Chat with zero API costs!
```

---

## Model Selection

| When | Model | Command |
|------|-------|---------|
| Quick testing | Qwen 3B | `ollama pull qwen2:3b` |
| **Development** | **Qwen 7B** | **`ollama pull qwen2`** |
| Complex tasks | Qwen 14B | `ollama pull qwen2:14b` |
| Code tasks | Llama 8B | `ollama pull llama2` |

---

## Essential Commands

```bash
# List models
docker-compose -f docker-compose.dev.local.yml exec ollama ollama list

# Pull a model
docker-compose -f docker-compose.dev.local.yml exec ollama ollama pull qwen2

# Remove model
docker-compose -f docker-compose.dev.local.yml exec ollama ollama rm qwen2:3b

# Test API
curl http://localhost:11434/api/tags

# Check memory
docker stats lawsphere-ollama-dev
```

---

## Environment Variables

```bash
# Enable local LLM
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen2

# Add fallback (optional)
OPENAI_API_KEY=sk-your-key
```

---

## Cost Comparison

| Scenario | Model | Cost per Query | Time |
|----------|-------|----------------|------|
| Development | Qwen 2.5 Local | **$0** | 5-7 sec |
| Production | GPT-4 | $0.01-0.03 | 2-3 sec |
| Staging | Qwen + GPT-4 Fallback | Hybrid | Varies |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Model not found | `ollama pull qwen2` |
| Out of memory | `ollama pull qwen2:3b` (smaller) |
| Slow first response | Normal! Model loads. ~10 sec. |
| API not responding | `docker-compose restart ollama` |

---

## Team Roles

| Role | Use Case | Command |
|------|----------|---------|
| **Frontend** | UI testing, instant feedback | `./scripts/team-dev.cmd` → Start → Use local |
| **Backend** | API development, no rate limits | `docker-compose logs ai-service -f` |
| **QA** | Fast iteration testing | `ollama pull qwen2` then test |
| **DevOps** | Monitor and configure | `docker stats lawsphere-ollama-dev` |

---

## One-Liners

```bash
# Start everything with local LLM ready
docker-compose -f docker-compose.dev.local.yml up -d && \
docker-compose -f docker-compose.dev.local.yml exec ollama ollama pull qwen2

# Check all systems healthy
docker-compose -f docker-compose.dev.local.yml ps && \
docker-compose -f docker-compose.dev.local.yml exec ollama ollama list

# Clean and reset
docker-compose -f docker-compose.dev.local.yml down -v && \
docker-compose -f docker-compose.dev.local.yml up -d && \
docker-compose -f docker-compose.dev.local.yml exec ollama ollama pull qwen2
```

---

**Print this card and share with your team!**
