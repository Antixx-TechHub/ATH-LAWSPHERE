/**
 * Proxy for /api/sessions root endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${AI_SERVICE_URL}/api/sessions${searchParams ? `?${searchParams}` : ''}`;
  
  console.log('[API Proxy] GET sessions:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Proxy] Error:', error);
    return NextResponse.json(
      { error: 'AI service unavailable', details: String(error) },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  const url = `${AI_SERVICE_URL}/api/sessions`;
  
  console.log('[API Proxy] POST sessions:', url);
  
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
    console.error('[API Proxy] Error:', error);
    return NextResponse.json(
      { error: 'AI service unavailable', details: String(error) },
      { status: 503 }
    );
  }
}
