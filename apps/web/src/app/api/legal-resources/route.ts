/**
 * Legal Resources API
 * Fetch and manage legal resources (case laws, statutes, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';

/**
 * GET /api/legal-resources?query=xxx&type=xxx
 * Search for legal resources
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const type = searchParams.get('type');
    const nodeId = searchParams.get('nodeId');
    const source = searchParams.get('source') || 'all';

    // If nodeId is provided, get resources linked to that node
    if (nodeId) {
      const linkedResources = await prisma.nodeResource.findMany({
        where: { nodeId },
        include: { resource: true },
        orderBy: { relevance: 'desc' }
      });

      return NextResponse.json({
        resources: linkedResources.map(lr => ({
          ...lr.resource,
          relevance: lr.relevance
        }))
      });
    }

    // Search cached resources first
    if (query) {
      const cachedResources = await prisma.legalResource.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { citation: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } }
          ],
          ...(type ? { type: type as any } : {})
        },
        take: 20,
        orderBy: { updatedAt: 'desc' }
      });

      if (cachedResources.length > 0) {
        return NextResponse.json({ 
          resources: cachedResources,
          source: 'cache'
        });
      }

      // Fetch from external sources via AI service
      if (source === 'all' || source === 'indian_kanoon') {
        try {
          const aiResponse = await fetch(
            AI_SERVICE_URL + '/api/legal-resources/search?query=' + encodeURIComponent(query) + '&type=' + (type || '') + '&source=' + source,
            { headers: { 'Content-Type': 'application/json' } }
          );

          if (aiResponse.ok) {
            const externalResources = await aiResponse.json();
            
            // Cache the results
            for (const resource of externalResources.resources || []) {
              try {
                await prisma.legalResource.upsert({
                  where: { citation: resource.citation || resource.id },
                  create: {
                    type: resource.type || 'CASE_LAW',
                    title: resource.title,
                    citation: resource.citation || resource.id,
                    summary: resource.snippet || resource.summary,
                    sourceUrl: resource.url,
                    sourceName: resource.source,
                    jurisdiction: resource.court,
                    year: resource.year
                  },
                  update: {
                    title: resource.title,
                    summary: resource.snippet || resource.summary,
                    sourceUrl: resource.url
                  }
                });
              } catch (e) {
                // Ignore duplicate key errors
              }
            }

            return NextResponse.json(externalResources);
          }
        } catch (e) {
          console.error('[Legal Resources] AI service error:', e);
        }
      }
    }

    // Return empty if no results
    return NextResponse.json({ resources: [], source: 'none' });

  } catch (error) {
    console.error('[Legal Resources] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch legal resources' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/legal-resources
 * Link a resource to a knowledge node
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { nodeId, resourceId, relevance } = body;

    if (!nodeId || !resourceId) {
      return NextResponse.json(
        { error: 'Node ID and Resource ID required' },
        { status: 400 }
      );
    }

    // Create or update the link
    await prisma.nodeResource.upsert({
      where: {
        nodeId_resourceId: { nodeId, resourceId }
      },
      create: {
        nodeId,
        resourceId,
        relevance: relevance || 1.0,
        addedBy: session.user.id
      },
      update: {
        relevance: relevance || 1.0
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Legal Resources] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to link resource' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/legal-resources?nodeId=xxx&resourceId=xxx
 * Unlink a resource from a knowledge node
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    const resourceId = searchParams.get('resourceId');

    if (!nodeId || !resourceId) {
      return NextResponse.json(
        { error: 'Node ID and Resource ID required' },
        { status: 400 }
      );
    }

    await prisma.nodeResource.delete({
      where: {
        nodeId_resourceId: { nodeId, resourceId }
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Legal Resources] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to unlink resource' },
      { status: 500 }
    );
  }
}
