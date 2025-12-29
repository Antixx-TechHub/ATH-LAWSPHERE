#!/bin/bash
# Initialize Ollama by pulling default model on startup
# This script ensures models are available when deployment starts

set -e

# Configuration
OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2}"
MAX_RETRIES=30
RETRY_DELAY=2

echo "=========================================="
echo "Ollama Model Initialization Script"
echo "=========================================="
echo "Host: $OLLAMA_HOST"
echo "Model: $OLLAMA_MODEL"
echo ""

# Function to check if Ollama is ready
check_ollama_ready() {
    curl -s "$OLLAMA_HOST/api/tags" > /dev/null 2>&1
    return $?
}

# Wait for Ollama to be ready
echo "[1/3] Waiting for Ollama service to be ready..."
RETRIES=0
while ! check_ollama_ready; do
    RETRIES=$((RETRIES + 1))
    if [ $RETRIES -gt $MAX_RETRIES ]; then
        echo "❌ Ollama failed to start after $MAX_RETRIES attempts"
        exit 1
    fi
    echo "  ⏳ Attempt $RETRIES/$MAX_RETRIES - Waiting ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
done
echo "✅ Ollama service is ready"
echo ""

# Check if model already exists
echo "[2/3] Checking if model '$OLLAMA_MODEL' is available..."
if curl -s "$OLLAMA_HOST/api/tags" | grep -q "\"name\":\"$OLLAMA_MODEL\""; then
    echo "✅ Model '$OLLAMA_MODEL' is already available"
else
    echo "⏳ Pulling model '$OLLAMA_MODEL' (this may take 5-15 minutes on first run)..."
    
    # Pull the model
    if curl -X POST "$OLLAMA_HOST/api/pull" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$OLLAMA_MODEL\"}" \
        -s | grep -q "success"; then
        echo "✅ Model '$OLLAMA_MODEL' pulled successfully"
    else
        # Alternative: try ollama CLI if curl fails
        echo "⚠️  Using ollama CLI for model pull..."
        if command -v ollama &> /dev/null; then
            ollama pull "$OLLAMA_MODEL"
            echo "✅ Model '$OLLAMA_MODEL' pulled successfully"
        else
            echo "❌ Failed to pull model - Ollama CLI not available"
            exit 1
        fi
    fi
fi
echo ""

# Display available models
echo "[3/3] Checking available models..."
echo "Available models:"
curl -s "$OLLAMA_HOST/api/tags" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | sed 's/^/  ✓ /'
echo ""

echo "=========================================="
echo "✅ Ollama initialization complete!"
echo "=========================================="
echo ""
echo "Your AI service can now use local LLMs:"
echo "  - Model: $OLLAMA_MODEL"
echo "  - Endpoint: $OLLAMA_HOST"
echo "  - Cost: FREE (no API charges)"
echo ""
