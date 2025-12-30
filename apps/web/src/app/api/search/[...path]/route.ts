/**
 * Proxy for /api/search/* requests to AI service
 */

import { NextRequest, NextResponse } from 'next/server';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const url = `${AI_SERVICE_URL}/api/search/${path}`;
  
  console.log('[API Proxy] POST search:', url);
  
  try {
    const body = await request.json();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Proxy] Search error:', error);
    return NextResponse.json(
      { error: 'AI service unavailable', details: String(error) },
      { status: 503 }
    );
  }
}
