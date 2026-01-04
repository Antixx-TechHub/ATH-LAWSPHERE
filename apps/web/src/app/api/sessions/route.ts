/**
 * Sessions API - Create and list chat sessions
 * 
 * Sessions are stored in the web app's PostgreSQL database (not AI service).
 * This ensures files uploaded to sessions work correctly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sessions - List chat sessions
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  
  console.log('[Sessions API] GET sessions for user:', userId);
  
  try {
    const sessions = await prisma.chatSession.findMany({
      where: userId ? { createdById: userId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: { messages: true, files: true }
        }
      }
    });
    
    // Transform to match expected format
    const result = sessions.map(s => ({
      id: s.id,
      title: s.name,
      description: s.description,
      user_id: s.createdById,
      created_at: s.createdAt.toISOString(),
      updated_at: s.updatedAt.toISOString(),
      message_count: s._count.messages,
      file_count: s._count.files
    }));
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Sessions API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions - Create a new chat session
 */
/**
 * Generate a default session name with date
 * Format: "Session - Jan 4, 2026"
 */
function generateDefaultSessionName(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  };
  const dateStr = now.toLocaleDateString('en-US', options);
  return `Session - ${dateStr}`;
}

export async function POST(request: NextRequest) {
  console.log('[Sessions API] POST - Creating new session');
  
  try {
    const body = await request.json();
    const { title, user_id } = body;
    
    // Use a default user ID if not provided (for anonymous sessions)
    const userId = user_id || 'anonymous';
    // Generate meaningful default name with date if not provided
    const sessionTitle = title || generateDefaultSessionName();
    
    // First, ensure the user exists (create if needed for anonymous)
    let user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      // Try to find by email for anonymous
      user = await prisma.user.findUnique({
        where: { email: `${userId}@lawsphere.local` }
      });
      
      if (!user) {
        // Create anonymous user
        user = await prisma.user.create({
          data: {
            id: userId,
            email: `${userId}@lawsphere.local`,
            name: userId === 'anonymous' ? 'Anonymous User' : userId,
            passwordHash: 'no-password'
          }
        });
        console.log('[Sessions API] Created user:', user.id);
      }
    }
    
    // Create the session in PostgreSQL
    const session = await prisma.chatSession.create({
      data: {
        name: sessionTitle,
        createdById: user.id
      }
    });
    
    console.log('[Sessions API] Created session:', session.id);
    
    // Also notify AI service about the session (optional, for chat history)
    try {
      await fetch(`${AI_SERVICE_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: session.id, // Use same ID
          title: sessionTitle, 
          user_id: userId 
        })
      });
    } catch (aiError) {
      // AI service notification is optional - don't fail if it's down
      console.warn('[Sessions API] Could not notify AI service:', aiError);
    }
    
    return NextResponse.json({
      id: session.id,
      title: session.name,
      user_id: session.createdById,
      created_at: session.createdAt.toISOString(),
      updated_at: session.updatedAt.toISOString()
    }, { status: 201 });
    
  } catch (error) {
    console.error('[Sessions API] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create session', details: String(error) },
      { status: 500 }
    );
  }
}
