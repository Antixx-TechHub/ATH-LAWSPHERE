/**
 * Learning Dashboard API
 * Provides model metrics and learning insights for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/learning
 * Get learning metrics and insights
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get daily metrics for the period
    const metrics = await prisma.modelMetrics.findMany({
      where: { date: { gte: startDate } },
      orderBy: { date: 'asc' }
    });

    // Get total feedback by type
    const feedbackStats = await prisma.knowledgeFeedback.groupBy({
      by: ['feedbackType'],
      where: { createdAt: { gte: startDate } },
      _count: true
    });

    // Get recent insights
    const insights = await prisma.learningInsight.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Calculate overall stats
    const totalFeedback = feedbackStats.reduce((sum, f) => sum + f._count, 0);
    const acceptCount = feedbackStats.find(f => f.feedbackType === 'ACCEPT')?._count || 0;
    const rejectCount = feedbackStats.find(f => f.feedbackType === 'REJECT')?._count || 0;
    const editCount = feedbackStats.find(f => f.feedbackType === 'EDIT')?._count || 0;

    // Calculate accuracy (simplified: accept / (accept + reject))
    const overallAccuracy = totalFeedback > 0 
      ? (acceptCount / (acceptCount + rejectCount + editCount)) * 100 
      : 0;

    // Get accuracy by entity type from feedback
    const entityAccuracy = await calculateEntityAccuracy(startDate);

    // Get common errors
    const commonErrors = await getCommonErrors(startDate);

    // Get training samples count
    const trainingSamples = await prisma.knowledgeFeedback.count({
      where: { createdAt: { gte: startDate } }
    });

    return NextResponse.json({
      summary: {
        overallAccuracy: overallAccuracy.toFixed(1),
        totalFeedback,
        acceptCount,
        rejectCount,
        editCount,
        acceptRate: totalFeedback > 0 ? ((acceptCount / totalFeedback) * 100).toFixed(1) : '0',
        rejectRate: totalFeedback > 0 ? ((rejectCount / totalFeedback) * 100).toFixed(1) : '0',
        editRate: totalFeedback > 0 ? ((editCount / totalFeedback) * 100).toFixed(1) : '0',
        trainingSamples,
        modelVersion: 'lawsphere-kg-v1.0'
      },
      entityAccuracy,
      dailyMetrics: metrics,
      insights,
      commonErrors
    });

  } catch (error) {
    console.error('[Learning API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get learning metrics' }, 
      { status: 500 }
    );
  }
}

/**
 * Calculate accuracy by entity type
 */
async function calculateEntityAccuracy(startDate: Date) {
  const feedbackWithNodes = await prisma.knowledgeFeedback.findMany({
    where: {
      createdAt: { gte: startDate },
      nodeId: { not: null }
    },
    select: {
      feedbackType: true,
      originalValue: true
    }
  });

  const entityStats: Record<string, { accept: number; reject: number; edit: number }> = {
    PERSON: { accept: 0, reject: 0, edit: 0 },
    ORGANIZATION: { accept: 0, reject: 0, edit: 0 },
    LAW_REFERENCE: { accept: 0, reject: 0, edit: 0 },
    DATE: { accept: 0, reject: 0, edit: 0 },
    LOCATION: { accept: 0, reject: 0, edit: 0 },
    CLAIM: { accept: 0, reject: 0, edit: 0 },
    EVIDENCE: { accept: 0, reject: 0, edit: 0 },
    EVENT: { accept: 0, reject: 0, edit: 0 }
  };

  for (const fb of feedbackWithNodes) {
    const nodeType = (fb.originalValue as any)?.type || 'CONCEPT';
    if (entityStats[nodeType]) {
      if (fb.feedbackType === 'ACCEPT') entityStats[nodeType].accept++;
      else if (fb.feedbackType === 'REJECT') entityStats[nodeType].reject++;
      else if (fb.feedbackType === 'EDIT') entityStats[nodeType].edit++;
    }
  }

  const accuracy: Record<string, number> = {};
  for (const [type, stats] of Object.entries(entityStats)) {
    const total = stats.accept + stats.reject + stats.edit;
    accuracy[type] = total > 0 ? (stats.accept / total) * 100 : 0;
  }

  return accuracy;
}

/**
 * Get common errors from feedback
 */
async function getCommonErrors(startDate: Date) {
  const errors = await prisma.knowledgeFeedback.findMany({
    where: {
      createdAt: { gte: startDate },
      feedbackType: { in: ['REJECT', 'EDIT', 'DELETE_NODE'] }
    },
    select: {
      originalValue: true,
      correctedValue: true,
      comment: true,
      feedbackType: true
    },
    take: 100
  });

  const errorPatterns: Record<string, { count: number; examples: any[] }> = {};

  for (const error of errors) {
    const orig = error.originalValue as any;
    const corrected = error.correctedValue as any;
    
    let pattern = 'unknown_error';
    
    if (error.feedbackType === 'DELETE_NODE') {
      pattern = 'false_positive_' + (orig?.type || 'unknown');
    } else if (corrected?.type && orig?.type && corrected.type !== orig.type) {
      pattern = 'misclassified_' + orig.type + '_as_' + corrected.type;
    } else if (corrected?.label && orig?.label && corrected.label !== orig.label) {
      pattern = 'wrong_label_' + (orig.type || 'unknown');
    }

    if (!errorPatterns[pattern]) {
      errorPatterns[pattern] = { count: 0, examples: [] };
    }
    errorPatterns[pattern].count++;
    if (errorPatterns[pattern].examples.length < 3) {
      errorPatterns[pattern].examples.push({
        original: orig?.label,
        corrected: corrected?.label,
        comment: error.comment
      });
    }
  }

  return Object.entries(errorPatterns)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([pattern, data]) => ({
      pattern,
      ...data
    }));
}

/**
 * POST /api/admin/learning
 * Create or resolve learning insights
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, insightId, insight } = body;

    if (action === 'resolve' && insightId) {
      await prisma.learningInsight.update({
        where: { id: insightId },
        data: { resolved: true }
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'create' && insight) {
      const created = await prisma.learningInsight.create({
        data: {
          type: insight.type,
          title: insight.title,
          description: insight.description,
          severity: insight.severity || 'info',
          actionable: insight.actionable ?? true,
          metadata: insight.metadata
        }
      });
      return NextResponse.json({ success: true, insightId: created.id });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[Learning API] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' }, 
      { status: 500 }
    );
  }
}
