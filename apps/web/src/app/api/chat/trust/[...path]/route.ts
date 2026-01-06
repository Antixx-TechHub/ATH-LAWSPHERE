/**
 * Proxy for /api/chat/trust/* endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const url = `${AI_SERVICE_URL}/api/chat/trust/${path}`;
  
  console.log('[API Proxy] GET chat/trust:', url);
  console.log('[API Proxy] AI_SERVICE_URL:', AI_SERVICE_URL);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const text = await response.text();
    console.log('[API Proxy] Response status:', response.status, 'body preview:', text.substring(0, 100));
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: response.status });
    } catch {
      // Not JSON, return error with details
      return NextResponse.json(
        { error: 'AI service error', status: response.status, details: text },
        { status: response.status >= 400 ? response.status : 502 }
      );
    }
  } catch (error) {
    console.error('[API Proxy] Trust error:', error);
    return NextResponse.json(
      { error: 'AI service unavailable', details: String(error), url: AI_SERVICE_URL },
      { status: 503 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const path = params.path.join('/');
  const url = `${AI_SERVICE_URL}/api/chat/trust/${path}`;
  
  console.log('[API Proxy] POST chat/trust:', url);
  console.log('[API Proxy] AI_SERVICE_URL:', AI_SERVICE_URL);
  
  try {
    const body = await request.json();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const text = await response.text();
    console.log('[API Proxy] Response status:', response.status, 'body preview:', text.substring(0, 100));
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: response.status });
    } catch {
      // Not JSON, return error with details
      return NextResponse.json(
        { error: 'AI service error', status: response.status, details: text },
        { status: response.status >= 400 ? response.status : 502 }
      );
    }
  } catch (error) {
    console.error('[API Proxy] Trust error:', error);
    return NextResponse.json(
      { error: 'AI service unavailable', details: String(error), url: AI_SERVICE_URL },
      { status: 503 }
    );
  }
}
