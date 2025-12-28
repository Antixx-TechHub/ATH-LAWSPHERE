/**
 * API Client for AI Service communication
 */

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000';

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  session_id?: string;
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
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Request failed: ${response.statusText}`);
    }

    return response.json();
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
}

// Export singleton instance
export const aiClient = new AIClient();

export default AIClient;
