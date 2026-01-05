/**
 * Chat API Routes - Next.js API Route Handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messages, model, temperature, max_tokens, session_id, stream } = body;

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Create or get chat session
    let chatSession;
    if (session_id) {
      chatSession = await prisma.chatSession.findUnique({
        where: { id: session_id },
      });
    }

    if (!chatSession) {
      // Create new session
      chatSession = await prisma.chatSession.create({
        data: {
          createdById: session.user.id,
          name: messages[0]?.content?.slice(0, 50) || 'New Chat',
        },
      });
    }

    // Store user message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'user') {
      await prisma.message.create({
        data: {
          sessionId: chatSession.id,
          userId: session.user.id,
          type: 'USER',
          content: lastMessage.content,
        },
      });
    }

    const startTime = Date.now();

    // Forward to AI service
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model: model || 'gpt-4o',
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 2048,
        session_id: chatSession.id,
        stream: false,
      }),
    });

    const latency = Date.now() - startTime;

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error('AI service error:', error);
      return NextResponse.json(
        { error: 'AI service error' },
        { status: aiResponse.status }
      );
    }

    const data = await aiResponse.json();

    // Store assistant message
    await prisma.message.create({
      data: {
        sessionId: chatSession.id,
        userId: session.user.id,
        type: 'AI',
        content: data.content,
        aiModel: data.model,
        tokenCount: data.usage?.total_tokens,
        responseTime: latency,
      },
    });

    // Log AI interaction
    await prisma.aIInteraction.create({
      data: {
        userId: session.user.id,
        model: data.model || 'unknown',
        prompt: lastMessage?.content || '',
        response: data.content || '',
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        latency,
      },
    });

    return NextResponse.json({
      ...data,
      session_id: chatSession.id,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get chat history
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (sessionId) {
      // Get specific session with messages
      const chatSession = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!chatSession || chatSession.createdById !== session.user.id) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      return NextResponse.json(chatSession);
    }

    // Get all sessions for user
    const sessions = await prisma.chatSession.findMany({
      where: { createdById: session.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
