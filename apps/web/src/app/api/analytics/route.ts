/**
 * Analytics API - Get cost, usage, and savings analytics
 * Supports filtering by day, week, month, year
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type TimeRange = 'day' | 'week' | 'month' | 'year' | 'all';

function getDateRange(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case 'day':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return new Date(0); // Beginning of time
  }
}

function getGroupByFormat(range: TimeRange): string {
  switch (range) {
    case 'day':
      return 'hour';
    case 'week':
    case 'month':
      return 'day';
    case 'year':
    case 'all':
      return 'month';
    default:
      return 'day';
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || 'anonymous';
    
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') as TimeRange) || 'month';
    const startDate = getDateRange(range);

    // Get analytics data
    const analytics = await prisma.chatAnalytics.findMany({
      where: {
        userId: userId === 'anonymous' ? null : userId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate summary statistics
    const totalMessages = analytics.length;
    const totalCost = analytics.reduce((sum, a) => sum + (a.actualCost || 0), 0);
    const totalSaved = analytics.reduce((sum, a) => sum + (a.costSaved || 0), 0);
    const totalCloudCost = analytics.reduce((sum, a) => sum + (a.cloudCost || 0), 0);
    const totalTokens = analytics.reduce((sum, a) => sum + (a.inputTokens || 0) + (a.outputTokens || 0), 0);
    const avgLatency = totalMessages > 0 
      ? analytics.reduce((sum, a) => sum + (a.latencyMs || 0), 0) / totalMessages 
      : 0;

    // Group data by time period for charts
    const groupBy = getGroupByFormat(range);
    const costByPeriod: Record<string, { date: string; cost: number; saved: number; messages: number }> = {};
    
    analytics.forEach((a) => {
      let key: string;
      const date = new Date(a.createdAt);
      
      if (groupBy === 'hour') {
        key = date.toISOString().slice(0, 13) + ':00';
      } else if (groupBy === 'day') {
        key = date.toISOString().slice(0, 10);
      } else {
        key = date.toISOString().slice(0, 7);
      }
      
      if (!costByPeriod[key]) {
        costByPeriod[key] = { date: key, cost: 0, saved: 0, messages: 0 };
      }
      costByPeriod[key].cost += a.actualCost || 0;
      costByPeriod[key].saved += a.costSaved || 0;
      costByPeriod[key].messages += 1;
    });

    // Model usage statistics
    const modelStats: Record<string, { count: number; cost: number; saved: number; tokens: number }> = {};
    analytics.forEach((a) => {
      const model = a.model || 'unknown';
      if (!modelStats[model]) {
        modelStats[model] = { count: 0, cost: 0, saved: 0, tokens: 0 };
      }
      modelStats[model].count += 1;
      modelStats[model].cost += a.actualCost || 0;
      modelStats[model].saved += a.costSaved || 0;
      modelStats[model].tokens += (a.inputTokens || 0) + (a.outputTokens || 0);
    });

    // Provider usage
    const providerStats: Record<string, { count: number; cost: number; isLocal: number }> = {};
    analytics.forEach((a) => {
      const provider = a.modelProvider || 'unknown';
      if (!providerStats[provider]) {
        providerStats[provider] = { count: 0, cost: 0, isLocal: 0 };
      }
      providerStats[provider].count += 1;
      providerStats[provider].cost += a.actualCost || 0;
      if (a.isLocal) providerStats[provider].isLocal += 1;
    });

    // Routing effectiveness
    const localMessages = analytics.filter((a) => a.isLocal).length;
    const cloudMessages = analytics.filter((a) => !a.isLocal).length;
    const piiDetectedCount = analytics.filter((a) => a.piiDetected).length;

    return NextResponse.json({
      summary: {
        totalMessages,
        totalCost: Math.round(totalCost * 10000) / 10000,
        totalSaved: Math.round(totalSaved * 10000) / 10000,
        totalCloudCost: Math.round(totalCloudCost * 10000) / 10000,
        savingsPercent: totalCloudCost > 0 ? Math.round((totalSaved / totalCloudCost) * 100) : 0,
        totalTokens,
        avgLatency: Math.round(avgLatency),
      },
      costOverTime: Object.values(costByPeriod).sort((a, b) => a.date.localeCompare(b.date)),
      modelUsage: Object.entries(modelStats)
        .map(([model, stats]) => ({ model, ...stats }))
        .sort((a, b) => b.count - a.count),
      providerUsage: Object.entries(providerStats)
        .map(([provider, stats]) => ({ provider, ...stats }))
        .sort((a, b) => b.count - a.count),
      routing: {
        localMessages,
        cloudMessages,
        piiDetectedCount,
        localPercent: totalMessages > 0 ? Math.round((localMessages / totalMessages) * 100) : 0,
      },
      range,
      startDate: startDate.toISOString(),
    });
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// Record analytics for a chat message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const session = await getServerSession(authOptions);
    
    const analytics = await prisma.chatAnalytics.create({
      data: {
        userId: session?.user?.id || null,
        sessionId: body.sessionId,
        messageId: body.messageId,
        role: body.role || 'assistant',
        model: body.model,
        modelProvider: body.modelProvider || 'unknown',
        isLocal: body.isLocal || false,
        sensitivityLevel: body.sensitivityLevel,
        piiDetected: body.piiDetected || false,
        inputTokens: body.inputTokens || 0,
        outputTokens: body.outputTokens || 0,
        actualCost: body.actualCost || 0,
        cloudCost: body.cloudCost || 0,
        costSaved: body.costSaved || 0,
        latencyMs: body.latencyMs || 0,
        routingTimeMs: body.routingTimeMs || 0,
        auditId: body.auditId,
      },
    });

    return NextResponse.json({ success: true, id: analytics.id });
  } catch (error) {
    console.error('[Analytics API] Error recording:', error);
    return NextResponse.json(
      { error: 'Failed to record analytics' },
      { status: 500 }
    );
  }
}
