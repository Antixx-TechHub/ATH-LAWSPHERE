/**
 * Catch-all for /api/sessions/* requests
 * 
 * Handles session-related operations:
 * - /api/sessions/{sessionId} - Get/Delete session from PostgreSQL
 * - /api/sessions/{sessionId}/files - Get files for session from PostgreSQL
 * - /api/sessions/{sessionId}/messages - Proxy to AI service for chat history
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path;
  console.log('[Sessions API] GET path:', path);
  
  // Handle /api/sessions/{sessionId}
  if (path.length === 1) {
    const sessionId = path[0];
    return getSession(sessionId);
  }
  
  // Handle /api/sessions/{sessionId}/files
  if (path.length === 2 && path[1] === 'files') {
    const sessionId = path[0];
    return getSessionFiles(sessionId);
  }
  
  // Handle /api/sessions/{sessionId}/context - return session context from PostgreSQL
  if (path.length === 2 && path[1] === 'context') {
    const sessionId = path[0];
    return getSessionContext(sessionId);
  }
  
  // Handle /api/sessions/{sessionId}/messages - proxy to AI service
  if (path.length === 2 && path[1] === 'messages') {
    return proxyToAIService(request, 'GET', path);
  }
  
  // Unknown path - proxy to AI service
  return proxyToAIService(request, 'GET', path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path;
  console.log('[Sessions API] POST path:', path);
  
  // Proxy to AI service for messages
  return proxyToAIService(request, 'POST', path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path;
  console.log('[Sessions API] PATCH path:', path);
  
  // Handle /api/sessions/{sessionId} - rename session
  if (path.length === 1) {
    const sessionId = path[0];
    return renameSession(request, sessionId);
  }
  
  // Unknown PATCH path
  return NextResponse.json(
    { error: 'Not found' },
    { status: 404 }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path;
  console.log('[Sessions API] DELETE path:', path);
  
  // Handle /api/sessions/{sessionId} - delete from PostgreSQL
  if (path.length === 1) {
    const sessionId = path[0];
    return deleteSession(sessionId);
  }
  
  // Proxy other deletes to AI service
  return proxyToAIService(request, 'DELETE', path);
}

/**
 * Rename a session
 */
async function renameSession(request: NextRequest, sessionId: string) {
  try {
    const body = await request.json();
    const { title } = body;
    
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required and must be a non-empty string' },
        { status: 400 }
      );
    }
    
    const session = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { 
        name: title.trim(),
        updatedAt: new Date()
      }
    });
    
    console.log('[Sessions API] Renamed session:', sessionId, 'to:', title.trim());
    
    return NextResponse.json({
      id: session.id,
      title: session.name,
      user_id: session.createdById,
      created_at: session.createdAt.toISOString(),
      updated_at: session.updatedAt.toISOString()
    });
  } catch (error: any) {
    console.error('[Sessions API] renameSession error:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to rename session', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Get session by ID from PostgreSQL
 */
async function getSession(sessionId: string) {
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        _count: {
          select: { messages: true, files: true }
        }
      }
    });
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      id: session.id,
      title: session.name,
      description: session.description,
      user_id: session.createdById,
      created_at: session.createdAt.toISOString(),
      updated_at: session.updatedAt.toISOString(),
      message_count: session._count.messages,
      file_count: session._count.files
    });
  } catch (error) {
    console.error('[Sessions API] getSession error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Get files for a session from PostgreSQL
 */
async function getSessionFiles(sessionId: string) {
  try {
    // First check if session exists
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId }
    });
    
    if (!session) {
      console.log('[Sessions API] Session not found:', sessionId);
      // Return empty files object instead of 404 for non-existent sessions
      // This handles "local-*" sessions gracefully
      return NextResponse.json({ files: [] });
    }
    
    const files = await prisma.file.findMany({
      where: { sessionId: sessionId },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('[Sessions API] Found', files.length, 'files for session', sessionId);
    
    // Transform to expected format - match what frontend expects
    // Frontend expects: id, name, size, mime_type, status, uploaded_at, is_sensitive, pii_detected
    const result = files.map(f => ({
      id: f.id,
      name: f.originalName || f.filename,  // Frontend uses 'name'
      filename: f.filename,
      original_name: f.originalName,
      mime_type: f.mimeType,  // Frontend uses 'mime_type'
      content_type: f.mimeType,
      size: f.size,
      status: f.status?.toLowerCase() || 'ready',  // Ensure lowercase
      session_id: f.sessionId,
      user_id: f.userId,
      uploaded_at: f.createdAt.toISOString(),  // Frontend uses 'uploaded_at'
      created_at: f.createdAt.toISOString(),
      updated_at: f.updatedAt.toISOString(),
      is_sensitive: false,
      pii_detected: false
    }));
    
    // Return wrapped in { files: [...] } as expected by frontend
    return NextResponse.json({ files: result });
  } catch (error) {
    console.error('[Sessions API] getSessionFiles error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Get session context - files, extracted text, AND messages for AI context
 */
async function getSessionContext(sessionId: string) {
  try {
    // Get session with files from PostgreSQL
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        files: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            status: true,
            extractedText: true,
            createdAt: true
          }
        }
      }
    });
    
    // Also fetch messages from AI service
    let messages: any[] = [];
    try {
      const aiResponse = await fetch(`${AI_SERVICE_URL}/api/sessions/${sessionId}/context`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        messages = aiData.messages || [];
      }
    } catch (aiErr) {
      console.warn('[Sessions API] Could not fetch messages from AI service:', aiErr);
    }
    
    if (!session) {
      // Return messages from AI service even if no session in web DB
      return NextResponse.json({
        session_id: sessionId,
        messages: messages,
        files: [],
        context_text: '',
        file_count: 0
      });
    }
    
    // Build context from file extracted text
    const contextParts: string[] = [];
    for (const file of session.files) {
      if (file.extractedText) {
        contextParts.push(`--- File: ${file.filename} ---\n${file.extractedText}`);
      }
    }
    
    return NextResponse.json({
      session_id: sessionId,
      messages: messages,
      files: session.files.map(f => ({
        id: f.id,
        name: f.originalName || f.filename,
        filename: f.filename,
        mime_type: f.mimeType,
        size: f.size,
        status: f.status?.toLowerCase() || 'ready',  // Chat panel expects lowercase status
        extracted_text: f.extractedText || null,     // Chat panel needs the actual text!
        has_text: !!f.extractedText,
        created_at: f.createdAt.toISOString()
      })),
      context_text: contextParts.join('\n\n'),
      file_count: session.files.length
    });
  } catch (error) {
    console.error('[Sessions API] getSessionContext error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch context', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Delete session from PostgreSQL
 */
async function deleteSession(sessionId: string) {
  try {
    await prisma.chatSession.delete({
      where: { id: sessionId }
    });
    
    // Also notify AI service
    try {
      await fetch(`${AI_SERVICE_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });
    } catch {
      // Ignore AI service errors
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Sessions API] deleteSession error:', error);
    return NextResponse.json(
      { error: 'Failed to delete session', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Proxy request to AI service
 */
async function proxyToAIService(
  request: NextRequest, 
  method: string, 
  path: string[]
) {
  const pathStr = path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${AI_SERVICE_URL}/api/sessions/${pathStr}${searchParams ? `?${searchParams}` : ''}`;
  
  console.log(`[Sessions API] Proxy ${method} to:`, url);
  
  try {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (method === 'POST' || method === 'PUT') {
      options.body = JSON.stringify(await request.json());
    }
    
    const response = await fetch(url, options);
    
    // Try to parse as JSON, but handle non-JSON responses gracefully
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: response.status });
    } catch {
      // AI service returned non-JSON (e.g., "Internal Server Error")
      console.error('[Sessions API] AI service returned non-JSON:', text.substring(0, 100));
      return NextResponse.json(
        { error: 'AI service error', details: text.substring(0, 200) },
        { status: response.status >= 400 ? response.status : 502 }
      );
    }
  } catch (error) {
    console.error('[Sessions API] Proxy error:', error);
    return NextResponse.json(
      { error: 'AI service unavailable', details: String(error) },
      { status: 503 }
    );
  }
}
