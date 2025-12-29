# Local LLM Setup for Teams (Docker-Based)

**Quick version:** No installation needed! Ollama is included in `docker-compose.dev.local.yml`

---

## ⚡ Quick Start (3 Steps)

### 1. Start Environment with Ollama

```bash
docker-compose -f docker-compose.dev.local.yml up -d
```

### 2. Pull a Model

```bash
# Qwen 2.5 (recommended - best balance)
docker-compose -f docker-compose.dev.local.yml exec ollama ollama pull qwen2

# Takes 2-5 minutes first time
```

### 3. Use It!

- Open http://localhost:3000
- Select model dropdown → **Qwen 2.5 7B**
- Chat with no API costs!

---

## 📋 Supported Models

Your system has **Ollama** running in Docker with these models available:

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| **Qwen 2.5 3B** | 2GB | ⚡⚡⚡ Fast | ⭐⭐⭐ | Quick testing |
| **Qwen 2.5 7B** | 4GB | ⚡⚡ | ⭐⭐⭐⭐ | **Development** |
| **Qwen 2.5 14B** | 8GB | ⚡ | ⭐⭐⭐⭐⭐ | Complex analysis |
| **Llama 3.1 8B** | 4.7GB | ⚡⚡ | ⭐⭐⭐⭐ | Code & reasoning |

**Recommended:** Start with **Qwen 2.5 7B** for balanced speed/quality.

---

## 🚀 Docker Integration

### Ollama Runs Automatically

In `docker-compose.dev.local.yml`:
```yaml
ollama:
  image: ollama/ollama:latest
  ports:
    - "11434:11434"
  volumes:
    - ollama_dev_data:/root/.ollama
```

No separate installation needed!

### Commands Reference

```bash
# List available models
docker-compose -f docker-compose.dev.local.yml exec ollama ollama list

# Pull new model
docker-compose -f docker-compose.dev.local.yml exec ollama ollama pull llama2

# Remove model (free space)
docker-compose -f docker-compose.dev.local.yml exec ollama ollama rm qwen2:3b

# Check Ollama health
docker-compose -f docker-compose.dev.local.yml exec ollama ollama list
```

---

## 💻 Using Local LLMs

### Via Web UI (Easiest)

1. **Start env:** `docker-compose -f docker-compose.dev.local.yml up -d`
2. **Open:** http://localhost:3000
3. **Select model:** Qwen 2.5 7B (from dropdown)
4. **Chat:** Type your question
5. **Wait:** First response ~10 sec (model loads), then 5-7 sec each

### Via Direct API (Testing)

```bash
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2",
    "prompt": "Explain GDPR compliance for legal firms",
    "stream": false
  }'
```

### In Python Code

```python
import httpx

async def chat_with_local_llm(question: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://ollama:11434/api/generate",
            json={
                "model": "qwen2",
                "prompt": question,
                "stream": False
            }
        )
        return response.json()["response"]
```

---

## 🔄 Switching Models

Edit `.env.development`:

```bash
# Qwen variants (all free, local)
OLLAMA_MODEL=qwen2:3b       # Fastest
OLLAMA_MODEL=qwen2:7b       # Balanced (default)
OLLAMA_MODEL=qwen2:14b      # Most powerful

# Or other models
OLLAMA_MODEL=llama2
OLLAMA_MODEL=mistral
```

Restart services:
```bash
docker-compose -f docker-compose.dev.local.yml restart ai-service
```

---

## ⚡ Performance Tips

### Default (CPU Mode)
- Works on any machine
- First response: 10-20 sec
- Subsequent: 5-10 sec

### GPU Acceleration (10x Faster!)

**Linux with NVIDIA GPU:**

1. Install NVIDIA Container Toolkit:
   ```bash
   sudo apt-get install nvidia-container-toolkit
   ```

2. Uncomment in `docker-compose.dev.local.yml`:
   ```yaml
   ollama:
     deploy:
       resources:
         reservations:
           devices:
             - driver: nvidia
               count: 1
               capabilities: [gpu]
   ```

3. Restart:
   ```bash
   docker-compose -f docker-compose.dev.local.yml up -d ollama
   ```

**Result:** First response 2-3 sec, then 1-2 sec each

**Windows/Mac Docker Desktop:**
- GPU support limited
- CPU mode works fine for development
- Not recommended for production inference

---

## 🎓 Team Usage Patterns

### Frontend Developers
```bash
# Just work with local models
# No API key needed, instant responses
# Perfect for UI testing
```

### Backend Developers
```bash
# Develop with local models (free, unlimited)
# Test API without rate limits
# Switch to cloud for production
```

### QA Teams
```bash
# Test with local (fast iteration)
# Test with cloud (production-like)
# Verify model switching works
```

---

## 🔀 Auto Mode (Smart Fallback)

Your system supports **Auto mode** that:
1. Tries local LLM first (Qwen/Llama)
2. Falls back to OpenAI if set
3. Falls back to Anthropic if set

### Using Auto Mode

```bash
# .env.development
OLLAMA_ENABLED=true
OLLAMA_MODEL=qwen2
OPENAI_API_KEY=sk-your-key  # Fallback only
```

In UI select: **"🤖 Auto (Recommended)"**

---

## 🚀 Development vs Production

### Development (Local)
```bash
OLLAMA_ENABLED=true
OPENAI_API_KEY=  # Empty
# Cost: $0, Speed: Good, Privacy: Perfect
```

### Staging (Hybrid)
```bash
OLLAMA_ENABLED=true
OPENAI_API_KEY=sk-your-key  # Fallback
# Test both paths
```

### Production (Cloud Preferred)

**Option A - Cloud APIs (Best Quality)**
```bash
OLLAMA_ENABLED=false
OPENAI_API_KEY=sk-your-key
# Cost: Minimal per query, Quality: Best
```

**Option B - Self-Hosted Ollama (Privacy)**
```bash
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=https://your-server:11434
# Cost: Server fees, Privacy: Perfect
```

---

## 🔧 Managing Models

### See All Models

```bash
docker-compose -f docker-compose.dev.local.yml exec ollama ollama list

# NAME               LATEST ID      SIZE     MODIFIED
# qwen2:latest       abc123         4.4 GB   2 minutes ago
# llama2:latest      def456         3.8 GB   1 hour ago
```

### Pull Additional Models

```bash
# All Qwen variants
docker-compose -f docker-compose.dev.local.yml exec ollama ollama pull qwen2:3b
docker-compose -f docker-compose.dev.local.yml exec ollama ollama pull qwen2:7b
docker-compose -f docker-compose.dev.local.yml exec ollama ollama pull qwen2:14b

# Llama models
docker-compose -f docker-compose.dev.local.yml exec ollama ollama pull llama2
docker-compose -f docker-compose.dev.local.yml exec ollama ollama pull llama2-uncensored

# Other models
docker-compose -f docker-compose.dev.local.yml exec ollama ollama pull mistral
docker-compose -f docker-compose.dev.local.yml exec ollama ollama pull neural-chat
```

### Free Disk Space

```bash
# Remove unused models
docker-compose -f docker-compose.dev.local.yml exec ollama ollama rm qwen2:3b

# Check usage
docker-compose -f docker-compose.dev.local.yml exec ollama du -h /root/.ollama
```

---

## 🐛 Troubleshooting

### Ollama Not Starting

```bash
# Check status
docker-compose -f docker-compose.dev.local.yml ps ollama

# View logs
docker-compose -f docker-compose.dev.local.yml logs ollama

# Restart
docker-compose -f docker-compose.dev.local.yml restart ollama
```

### Out of Memory

```
Error: cannot allocate memory

Solution:
1. Use smaller model: ollama pull qwen2:3b
2. Increase Docker memory (Docker Desktop settings)
3. Stop other services: docker-compose down
```

### Model Unresponsive

```bash
# Test directly
curl http://localhost:11434/api/tags

# Should show list of models
# If empty or error, restart:
docker-compose -f docker-compose.dev.local.yml restart ollama
```

### Slow Responses

**Normal:** First response takes 10-20 sec (model loads)

**Consistently slow?**
```bash
# Check memory/CPU
docker stats lawsphere-ollama-dev

# Try smaller model
docker-compose -f docker-compose.dev.local.yml exec ollama ollama pull qwen2:3b
```

---

## 📊 Monitoring

### Memory Usage

```bash
docker stats lawsphere-ollama-dev

# CONTAINER             CPU %    MEM USAGE / LIMIT
# lawsphere-ollama      15%      6.2 GB / 16 GB
```

### Model Info

```bash
docker-compose -f docker-compose.dev.local.yml exec ollama ollama show qwen2
```

---

## 💡 Real-World Examples

### Example 1: Legal Document Q&A
```python
# Developer uses local LLM for testing
question = "What are the key clauses in this NDA?"
answer = await chat_with_local_llm(question)
# Response: ~5 sec, Cost: $0
```

### Example 2: Contract Analysis
```python
# Production uses GPT-4 for accuracy
if production:
    model = "gpt-4"  # Best quality
else:
    model = "qwen2"  # Free, local
```

### Example 3: Team Testing
```bash
# QA tests locally first
./scripts/team-dev.cmd
# Select: Qwen 2.5 7B

# Then test staging with GPT-4
# OPENAI_API_KEY=sk-... docker-compose up -d
```

---

## ✅ Checklist

- [ ] `docker-compose -f docker-compose.dev.local.yml up -d`
- [ ] `docker-compose -f docker-compose.dev.local.yml exec ollama ollama pull qwen2`
- [ ] `.env.development` has `OLLAMA_ENABLED=true`
- [ ] Test: `curl http://localhost:11434/api/tags`
- [ ] Open http://localhost:3000
- [ ] Select **Qwen 2.5 7B** from model dropdown
- [ ] Chat and verify it works!

---

## 📚 Resources

- **Ollama Website:** https://ollama.ai
- **Model Library:** https://ollama.ai/library
- **Qwen Models:** https://github.com/QwenLM/Qwen
- **Llama Models:** https://llama.meta.com

---

**Last Updated:** December 29, 2025
