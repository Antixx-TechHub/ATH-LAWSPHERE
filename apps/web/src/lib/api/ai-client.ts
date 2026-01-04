/**
 * API Client for AI Service communication
 * 
 * In production, this calls Next.js API routes which proxy to the AI service.
 * The browser cannot directly reach the AI service.
 */

// For client-side, always use relative URLs to hit Next.js API routes
// The API routes will proxy to the actual AI service server-side
const isServer = typeof window === 'undefined';
const AI_SERVICE_URL = isServer 
  ? (process.env.AI_SERVICE_URL || 'http://localhost:8000')  // Server-side: direct to AI service
  : '';  // Client-side: use relative URLs to Next.js API routes

console.log('[AIClient] Running on:', isServer ? 'server' : 'client');

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  session_id?: string;
  user_id?: string;
  document_attached?: boolean;
}

interface ChatResponse {
  id: string;
  session_id: string;
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
  session_id?: string;
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
    options: RequestInit = {},
    timeoutMs: number = 15000
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('[AIClient] Request:', url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

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
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out - AI service may be unavailable');
      }
      throw error;
    }
  }

  /**
   * Send a chat completion request
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/api/chat/completions', {
      method: 'POST',
      body: JSON.stringify(request),
    }, 60000);  // 60 second timeout for LLM calls
  }

  /**
   * Send a trust-aware chat completion request (Privacy-First)
   */
  async trustChat(request: ChatRequest): Promise<TrustChatResponse> {
    // Always send all optional fields and ensure messages array is present
    // Use longer timeout (60 seconds) for LLM API calls
    return this.request<TrustChatResponse>('/api/chat/trust/completions', {
      method: 'POST',
      body: JSON.stringify({
        force_local: false,
        file_attached: request.document_attached || false,  // Map frontend field to backend field
        file_name: null,
        file_content: null,
        ...request,
        messages: request.messages || [],
      }),
    }, 60000);  // 60 second timeout for LLM calls
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
   * Sessions
   */
  async createSession(title?: string, user_id?: string): Promise<{ id: string; title: string }> {
    return this.request('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ title, user_id }),
    });
  }

  async listSessions(user_id?: string): Promise<Array<{ id: string; title: string; updated_at: string; last_message_preview?: string }>> {
    const query = user_id ? `?user_id=${encodeURIComponent(user_id)}` : '';
    return this.request(`/api/sessions${query}`);
  }

  async renameSession(sessionId: string, title: string): Promise<{ id: string; title: string }> {
    return this.request(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  async deleteSession(sessionId: string): Promise<{ status: string }> {
    return this.request(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async getSessionContext(sessionId: string): Promise<{ messages: any[]; files: any[]; notes: any[] }> {
    return this.request(`/api/sessions/${sessionId}/context`);
  }

  async listSessionFiles(sessionId: string): Promise<{ files: any[] }> {
    return this.request(`/api/sessions/${sessionId}/files`);
  }

  async listSessionNotes(sessionId: string): Promise<{ notes: any[] }> {
    return this.request(`/api/sessions/${sessionId}/notes`);
  }

  async upsertNote(sessionId: string, title: string, content: string, noteId?: string): Promise<{ note_id: string }> {
    return this.request(`/api/sessions/${sessionId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ title, content, note_id: noteId }),
    });
  }

  async deleteNote(noteId: string): Promise<{ status: string }> {
    return this.request(`/api/sessions/notes/${noteId}`, { method: 'DELETE' });
  }

  /**
   * Upload a file for processing
   */
  async uploadFile(file: File, sessionId?: string, userId?: string): Promise<{ file_id: string; status: string }> {
    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) formData.append('session_id', sessionId);
    if (userId) formData.append('user_id', userId);

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
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<{ status: string; file_id: string }> {
    return this.request(`/api/files/${fileId}` , { method: 'DELETE' });
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

  /**
   * Get note version history
   */
  async getNoteHistory(noteId: string): Promise<{
    note_id: string;
    history: Array<{
      version: number;
      title: string;
      content: string;
      edited_at: string;
      is_current: boolean;
    }>;
  }> {
    return this.request(`/api/sessions/notes/${noteId}/history`);
  }

  /**
   * Restore a note to a previous version
   */
  async restoreNoteVersion(noteId: string, version: number): Promise<{ status: string; version: number }> {
    return this.request(`/api/sessions/notes/${noteId}/restore/${version}`, {
      method: 'POST',
    });
  }
}

// Export singleton instance
export const aiClient = new AIClient();

export default AIClient;
