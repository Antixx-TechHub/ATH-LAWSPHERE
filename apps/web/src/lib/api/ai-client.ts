/**
 * API Client for AI Service communication
 */

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000';
console.log('[AIClient] AI_SERVICE_URL configured as:', AI_SERVICE_URL);

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  session_id?: string;
  document_attached?: boolean;
}

interface ChatResponse {
  id: string;
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface TrustInfo {
  is_local: boolean;
  trust_badge: string;
  trust_message: string;
  trust_details: string[];
  sensitivity_level: string;
  pii_detected: boolean;
  document_attached: boolean;
  model_used: string;
  model_provider: string;
  audit_id: string;
}

interface TrustChatResponse {
  id: string;
  message: {
    role: 'assistant' | 'user' | 'system';
    content: string;
  };
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  trust: TrustInfo;  // Backend sends "trust", not "trust_info"
  cost?: {
    estimated_cost_usd: number;
    estimated_cost_inr: number;
    saved_vs_cloud_usd: number;
    saved_vs_cloud_inr: number;
  };
  latency_ms?: number;
  routing_time_ms?: number;
}

interface SearchRequest {
  query: string;
  limit?: number;
  filters?: Record<string, string>;
}

interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, string>;
}

class AIClient {
  private baseUrl: string;

  constructor(baseUrl: string = AI_SERVICE_URL) {
    this.baseUrl = baseUrl;
    console.log('[AIClient] Initialized with baseUrl:', this.baseUrl);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('[AIClient] Request:', url);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log('[AIClient] Response status:', response.status);

    if (!response.ok) {
      let errorText = '';
      try {
        const error = await response.json();
        errorText = JSON.stringify(error);
        console.error('[AIClient] Error response:', error);
        // Try to extract detail or message
        throw new Error(error.detail || error.message || errorText || `Request failed: ${response.statusText}`);
      } catch (e) {
        // If not JSON, fallback to text
        const text = await response.text().catch(() => '');
        throw new Error(text || `Request failed: ${response.statusText}`);
      }
    }

    const data = await response.json();
    console.log('[AIClient] Response data keys:', Object.keys(data));
    console.log('[AIClient] Raw response data:', JSON.stringify(data, null, 2));
    if (data.message) {
      console.log('[AIClient] data.message:', data.message);
      console.log('[AIClient] data.message.content:', data.message.content);
      console.log('[AIClient] content type:', typeof data.message.content);
    }
    return data;
  }

  /**
   * Send a chat completion request
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/api/chat/completions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Send a trust-aware chat completion request (Privacy-First)
   */
  async trustChat(request: ChatRequest): Promise<TrustChatResponse> {
    // Always send all optional fields and ensure messages array is present
    return this.request<TrustChatResponse>('/api/chat/trust/completions', {
      method: 'POST',
      body: JSON.stringify({
        force_local: false,
        file_attached: false,
        file_name: null,
        file_content: null,
        ...request,
        messages: request.messages || [],
      }),
    });
  }

  /**
   * Stream a chat completion response
   */
  async *chatStream(
    request: ChatRequest
  ): AsyncGenerator<{ content: string }, void, unknown> {
    const url = `${this.baseUrl}/api/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              yield { content: parsed.content };
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  /**
   * Get available models
   */
  async getModels(): Promise<Array<{ id: string; name: string; provider: string }>> {
    return this.request('/api/chat/models');
  }

  /**
   * Upload a file for processing
   */
  async uploadFile(file: File): Promise<{ file_id: string; status: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/files/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get file processing status
   */
  async getFileStatus(fileId: string): Promise<{
    status: string;
    progress: number;
    text?: string;
  }> {
    return this.request(`/api/files/${fileId}/status`);
  }

  /**
   * Semantic search across documents
   */
  async search(request: SearchRequest): Promise<{ results: SearchResult[] }> {
    return this.request('/api/search/semantic', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Hybrid search (semantic + keyword)
   */
  async hybridSearch(request: SearchRequest): Promise<{ results: SearchResult[] }> {
    return this.request('/api/search/hybrid', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Health check
   */
  async health(): Promise<{ status: string; version: string }> {
    return this.request('/health');
  }

  /**
   * Get trust dashboard metrics
   */
  async getTrustDashboard(): Promise<{
    total_requests: number;
    local_routed: number;
    cloud_routed: number;
    privacy_protection_rate: number;
    pii_detected_count: number;
    sensitive_documents: number;
  }> {
    return this.request('/api/chat/trust/dashboard');
  }

  /**
   * Get available trust models
   */
  async getTrustModels(): Promise<{
    local_models: Array<{ id: string; name: string; status: string }>;
    cloud_models: Array<{ id: string; name: string; status: string }>;
  }> {
    return this.request('/api/chat/trust/models');
  }
}

// Export singleton instance
export const aiClient = new AIClient();

export default AIClient;
