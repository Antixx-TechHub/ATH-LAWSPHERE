/**
 * Knowledge Graph Feedback API
 * Captures user feedback on nodes/edges for model learning
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/knowledge-graph/feedback
 * Submit feedback on a node or edge
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      sessionId, 
      nodeId, 
      edgeId, 
      feedbackType, 
      originalValue, 
      correctedValue, 
      rating,
      comment 
    } = body;

    if (!sessionId || !feedbackType) {
      return NextResponse.json(
        { error: 'Session ID and feedback type required' }, 
        { status: 400 }
      );
    }

    // Verify user owns this session
    const chatSession = await prisma.chatSession.findFirst({
      where: { id: sessionId, createdById: session.user.id }
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Create feedback record
    const feedback = await prisma.knowledgeFeedback.create({
      data: {
        sessionId,
        nodeId,
        edgeId,
        feedbackType,
        originalValue,
        correctedValue,
        rating,
        comment,
        userId: session.user.id
      }
    });

    // If it's a node edit, update the node
    if (feedbackType === 'EDIT' && nodeId && correctedValue) {
      await prisma.knowledgeNode.update({
        where: { id: nodeId },
        data: {
          label: correctedValue.label || undefined,
          description: correctedValue.description || undefined,
          type: correctedValue.type || undefined,
          properties: correctedValue.properties || undefined
        }
      });
    }

    // If it's a node deletion
    if (feedbackType === 'DELETE_NODE' && nodeId) {
      await prisma.knowledgeNode.delete({
        where: { id: nodeId }
      });
    }

    // If it's an edge deletion
    if (feedbackType === 'DELETE_EDGE' && edgeId) {
      await prisma.knowledgeEdge.delete({
        where: { id: edgeId }
      });
    }

    // Update daily metrics
    await updateDailyMetrics(feedbackType);

    return NextResponse.json({ 
      success: true, 
      feedbackId: feedback.id 
    });

  } catch (error) {
    console.error('[Feedback API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' }, 
      { status: 500 }
    );
  }
}

/**
 * GET /api/knowledge-graph/feedback?sessionId=xxx
 * Get feedback history for a session
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' }, 
        { status: 400 }
      );
    }

    const feedback = await prisma.knowledgeFeedback.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return NextResponse.json({ feedback });

  } catch (error) {
    console.error('[Feedback API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to get feedback' }, 
      { status: 500 }
    );
  }
}

/**
 * Update daily metrics with feedback
 */
async function updateDailyMetrics(feedbackType: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    await prisma.modelMetrics.upsert({
      where: { date: today },
      create: {
        date: today,
        totalFeedback: 1,
        acceptCount: feedbackType === 'ACCEPT' ? 1 : 0,
        rejectCount: feedbackType === 'REJECT' ? 1 : 0,
        editCount: feedbackType === 'EDIT' ? 1 : 0
      },
      update: {
        totalFeedback: { increment: 1 },
        acceptCount: feedbackType === 'ACCEPT' ? { increment: 1 } : undefined,
        rejectCount: feedbackType === 'REJECT' ? { increment: 1 } : undefined,
        editCount: feedbackType === 'EDIT' ? { increment: 1 } : undefined
      }
    });
  } catch (error) {
    console.error('[Metrics] Failed to update:', error);
  }
}
