/**
 * Proxy for /api/chat/models endpoint
 */

import { NextResponse } from 'next/server';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export async function GET() {
  const url = `${AI_SERVICE_URL}/api/chat/models`;
  
  console.log('[API Proxy] GET chat/models:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Proxy] Models error:', error);
    // Return default models if AI service is unavailable
    return NextResponse.json({
      models: [
        { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
      ]
    });
  }
}
