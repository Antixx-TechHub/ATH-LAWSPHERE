# Lawsphere Local LLM Setup Guide

## Privacy-First Architecture with Local Inference

This guide covers setting up local LLM inference for Lawsphere to ensure **sensitive legal documents NEVER leave your infrastructure**.

---

## 🖥️ System Requirements

### Minimum (Basic local inference)
| Component | Requirement |
|-----------|-------------|
| RAM | 32GB |
| GPU | NVIDIA RTX 3070/4060 (8GB VRAM) |
| Storage | 50GB SSD free space |
| OS | Windows 10/11, Ubuntu 22.04+, macOS 13+ |

### Recommended (Production)
| Component | Requirement |
|-----------|-------------|
| RAM | 64GB |
| GPU | NVIDIA RTX 4080/4090 (16GB VRAM) or A100 |
| Storage | 100GB NVMe SSD |
| OS | Ubuntu 22.04 LTS (Server) |

### Cloud VM Options (Cost-effective)
| Provider | Instance Type | vCPU | RAM | GPU | Cost/hr |
|----------|--------------|------|-----|-----|---------|
| Azure | NC4as_T4_v3 | 4 | 28GB | T4 16GB | ~$0.53 |
| Azure | NC6s_v3 | 6 | 112GB | V100 16GB | ~$3.06 |
| AWS | g4dn.xlarge | 4 | 16GB | T4 16GB | ~$0.52 |
| AWS | g5.xlarge | 4 | 16GB | A10G 24GB | ~$1.00 |

---

## 📦 Installation Steps

### Step 1: Install Ollama

#### Windows
```powershell
# Using winget
winget install Ollama.Ollama

# Or download from https://ollama.ai/download
```

#### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### macOS
```bash
brew install ollama
```

### Step 2: Start Ollama Service

#### Windows
```powershell
# Ollama runs as a service automatically after installation
# To start manually:
ollama serve
```

#### Linux (systemd)
```bash
sudo systemctl enable ollama
sudo systemctl start ollama

# Check status
sudo systemctl status ollama
```

#### Docker (Recommended for Production)
```bash
docker run -d \
  --name ollama \
  --gpus all \
  -p 11434:11434 \
  -v ollama_data:/root/.ollama \
  ollama/ollama
```

### Step 3: Pull Required Models

```bash
# Recommended models for legal work (choose based on your hardware)

# Small & Fast (1.5GB - Good for quick queries)
ollama pull qwen2.5:3b

# Medium & Balanced (5GB - Best for most legal tasks)
ollama pull qwen2.5:7b

# Large & Powerful (9GB - Complex analysis, document summarization)
ollama pull qwen2.5:14b

# Alternative: Llama 3.1 (Good multilingual support)
ollama pull llama3.1:8b

# Verify models
ollama list
```

### Step 4: Test Ollama

```bash
# Quick test
ollama run qwen2.5:7b "What are the key elements of a valid contract under Indian Contract Act?"

# API test
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:7b",
  "prompt": "Explain Section 138 of Negotiable Instruments Act",
  "stream": false
}'
```

---

## ⚙️ Lawsphere AI Service Configuration

### Step 1: Environment Variables

Create or update `.env` in `apps/ai-service/`:

```env
# ===========================================
# LAWSPHERE AI SERVICE CONFIGURATION
# ===========================================

# Ollama Configuration (Local LLM)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TIMEOUT=300

# Default Models
DEFAULT_LOCAL_MODEL=qwen2.5-7b
DEFAULT_CLOUD_MODEL=gemini-flash

# Cloud API Keys (for non-sensitive queries)
GOOGLE_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key          # Optional
ANTHROPIC_API_KEY=your_anthropic_api_key    # Optional

# Trust Router Settings
ENABLE_CLOUD=true                # Allow cloud for non-sensitive
FORCE_LOCAL_ONLY=false           # Set true to disable cloud completely
COST_OPTIMIZATION=true           # Prefer cheaper options when safe

# Audit Logging
AUDIT_LOG_DIR=./logs/audit
ENABLE_AUDIT_LOGGING=true
```

### Step 2: Update Model Configuration

Edit `apps/ai-service/app/routing/trust_router.py`:

```python
# Update MODELS dict with your available models
MODELS = {
    # Add models you've pulled
    "qwen2.5-7b": ModelConfig(
        model_id="qwen2.5-7b",
        display_name="Qwen 2.5 7B (Local)",
        provider=ModelProvider.LOCAL,
        api_base="http://localhost:11434",
        cost_per_1k_tokens=0.0,
        latency_ms_avg=600,
        context_window=131072,
        capabilities=["legal", "summarization", "analysis", "indian_law"],
        priority=1
    ),
    # ... add other models
}
```

### Step 3: Update Ollama Client

Edit `apps/ai-service/app/models/ollama_client.py`:

```python
# Update MODEL_MAPPING with your models
MODEL_MAPPING = {
    "qwen2.5-7b": "qwen2.5:7b",
    "qwen2.5-3b": "qwen2.5:3b",
    "qwen2.5-14b": "qwen2.5:14b",
    "llama3.1-8b": "llama3.1:8b",
}
```

### Step 4: Start the AI Service

```bash
cd apps/ai-service

# Install dependencies
pip install -r requirements.txt

# Start service
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🧪 Testing the Setup

### 1. Health Check
```bash
curl http://localhost:8000/api/health
```

### 2. Ollama Status
```bash
curl http://localhost:8000/api/ollama/status
```

Expected response:
```json
{
  "status": "running",
  "base_url": "http://localhost:11434",
  "models": [
    {"name": "qwen2.5:7b", "size": "4.7 GB"},
    {"name": "llama3.1:8b", "size": "4.9 GB"}
  ],
  "model_count": 2
}
```

### 3. Trust Routing Test (Non-sensitive → Cloud)
```bash
curl -X POST http://localhost:8000/api/chat/trust/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is the limitation period for civil suits in India?"}],
    "stream": false
  }'
```

Expected: `"is_local": false, "trust_badge": "☁️ CLOUD OK"`

### 4. Trust Routing Test (Sensitive → Local)
```bash
curl -X POST http://localhost:8000/api/chat/trust/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Review this document for my client Rahul Sharma, Aadhaar: 1234-5678-9012"}],
    "file_attached": true,
    "force_local": true,
    "stream": false
  }'
```

Expected: `"is_local": true, "trust_badge": "🔒 SECURE LOCAL"`

### 5. View Routing Rules
```bash
curl http://localhost:8000/api/chat/trust/routing-rules
```

---

## 🔒 Privacy Routing Rules

The system automatically routes to LOCAL for:

| Trigger | Example | Action |
|---------|---------|--------|
| **File Upload** | Any document attached | 🔒 LOCAL ONLY |
| **Aadhaar Number** | 1234-5678-9012 | 🔒 LOCAL ONLY |
| **PAN Number** | ABCDE1234F | 🔒 LOCAL ONLY |
| **Phone Number** | +91 98765 43210 | 🔒 LOCAL ONLY |
| **Attorney-Client Privilege** | "privileged communication" | 🔒 LOCAL ONLY |
| **Case Numbers** | CNR: DLHC010012345 | 🔒 LOCAL ONLY |
| **Client Names** | "my client Rahul Sharma" | 🔒 LOCAL ONLY |
| **Financial Details** | Bank account numbers | 🔒 LOCAL ONLY |
| **User Force Local** | force_local=true | 🔒 LOCAL ONLY |

Cloud is used ONLY for:
- Generic legal questions
- Public legal information
- No PII detected
- No documents attached

---

## 🚀 Production Deployment

### Docker Compose (Recommended)

Create `docker-compose.ollama.yml`:

```yaml
version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    container_name: lawsphere-ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/"]
      interval: 30s
      timeout: 10s
      retries: 3

  ollama-setup:
    image: ollama/ollama:latest
    depends_on:
      ollama:
        condition: service_healthy
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        ollama pull qwen2.5:7b
        ollama pull llama3.1:8b
        echo "Models ready!"

volumes:
  ollama_data:
```

Run:
```bash
docker-compose -f docker-compose.ollama.yml up -d
```

### Remote Ollama Server

If running Ollama on a separate server:

1. Configure Ollama to listen on all interfaces:
```bash
# Linux: Edit /etc/systemd/system/ollama.service
Environment="OLLAMA_HOST=0.0.0.0"
```

2. Update AI service `.env`:
```env
OLLAMA_BASE_URL=http://your-ollama-server:11434
```

3. Secure with firewall/VPN:
```bash
# Allow only from AI service IP
ufw allow from 10.0.0.5 to any port 11434
```

---

## 📊 Monitoring & Optimization

### GPU Memory Usage
```bash
# Monitor GPU
watch -n 1 nvidia-smi

# Check Ollama memory
curl http://localhost:11434/api/ps
```

### Performance Tuning

Edit Ollama settings:
```bash
# Set GPU layers (more = faster but more VRAM)
OLLAMA_NUM_GPU=35 ollama serve

# Limit context length for faster inference
OLLAMA_NUM_CTX=4096 ollama serve
```

### Audit Logs Location
```
apps/ai-service/logs/audit/
├── audit_2025-12-28.jsonl
├── audit_2025-12-29.jsonl
└── ...
```

---

## 🆘 Troubleshooting

### Issue: "Model not found"
```bash
# Check available models
ollama list

# Pull the model
ollama pull qwen2.5:7b
```

### Issue: "Out of memory"
```bash
# Use smaller model
ollama pull qwen2.5:3b

# Update DEFAULT_LOCAL_MODEL in .env
DEFAULT_LOCAL_MODEL=qwen2.5-3b
```

### Issue: "Connection refused"
```bash
# Check if Ollama is running
curl http://localhost:11434/

# Start Ollama
ollama serve
```

### Issue: Slow inference
- Ensure GPU is being used: `nvidia-smi` should show ollama process
- Use smaller models (3b instead of 7b)
- Reduce context length
- Add more GPU memory

---

## 📞 Support

For issues with:
- **Ollama**: https://github.com/ollama/ollama/issues
- **Lawsphere**: Contact ATH Tech Hub support

---

## 📝 Change Log

| Date | Change |
|------|--------|
| 2025-12-28 | Initial setup guide created |
| | Added Qwen 2.5 and Llama 3.1 models |
| | Privacy-first routing implemented |
