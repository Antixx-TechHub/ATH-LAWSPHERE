/**
 * Knowledge Graph API Routes
 * Handles building, retrieving, and managing knowledge graphs for sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface ExtractedNode {
  type: string;
  label: string;
  description?: string;
  properties?: Record<string, unknown>;
}

interface ExtractedEdge {
  source_label: string;
  target_label: string;
  relation: string;
  label?: string;
}

/**
 * GET /api/knowledge-graph?sessionId=xxx
 * Get the knowledge graph for a session
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
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Verify user owns this session
    const chatSession = await prisma.chatSession.findFirst({
      where: { id: sessionId, createdById: session.user.id }
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get existing knowledge graph
    const graph = await prisma.knowledgeGraph.findUnique({
      where: { sessionId }
    });

    if (!graph) {
      return NextResponse.json({
        sessionId,
        status: 'NOT_BUILT',
        nodes: [],
        edges: [],
        summary: null,
        nodeCount: 0,
        edgeCount: 0
      });
    }

    // Get nodes and edges
    const nodes = await prisma.knowledgeNode.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' }
    });

    const edges = await prisma.knowledgeEdge.findMany({
      where: {
        source: { sessionId }
      },
      include: {
        source: { select: { label: true } },
        target: { select: { label: true } }
      }
    });

    return NextResponse.json({
      sessionId,
      status: graph.status,
      summary: graph.summary,
      lastBuiltAt: graph.lastBuiltAt,
      nodeCount: graph.nodeCount,
      edgeCount: graph.edgeCount,
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
        description: n.description,
        properties: n.properties,
        position: n.position
      })),
      edges: edges.map(e => ({
        id: e.id,
        sourceId: e.sourceId,
        targetId: e.targetId,
        sourceLabel: e.source.label,
        targetLabel: e.target.label,
        relation: e.relation,
        label: e.label
      }))
    });

  } catch (error) {
    console.error('[Knowledge Graph] GET error:', error);
    return NextResponse.json({ error: 'Failed to get knowledge graph' }, { status: 500 });
  }
}

/**
 * POST /api/knowledge-graph
 * Build a knowledge graph for a session
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Verify user owns this session
    const chatSession = await prisma.chatSession.findFirst({
      where: { id: sessionId, createdById: session.user.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { content: true, type: true }
        },
        notes: {
          select: { title: true, content: true }
        },
        files: {
          where: { status: 'READY' },
          select: { filename: true, originalName: true, extractedText: true }
        }
      }
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Create or update graph status to BUILDING
    await prisma.knowledgeGraph.upsert({
      where: { sessionId },
      create: {
        sessionId,
        status: 'BUILDING',
        name: chatSession.name
      },
      update: {
        status: 'BUILDING'
      }
    });

    // Prepare data for AI service
    const messages = chatSession.messages.map(m => ({
      content: m.content,
      role: m.type === 'USER' ? 'user' : 'assistant'
    }));

    const notes = chatSession.notes.map(n => ({
      title: n.title,
      content: n.content
    }));

    const files = chatSession.files.map(f => ({
      filename: f.filename,
      originalName: f.originalName,
      extractedText: f.extractedText
    }));

    // Call AI service to build graph
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/knowledge-graph/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        messages,
        notes,
        files
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[Knowledge Graph] AI service error:', errorText);
      
      await prisma.knowledgeGraph.update({
        where: { sessionId },
        data: { status: 'ERROR' }
      });
      
      return NextResponse.json({ error: 'AI service failed to build graph' }, { status: 500 });
    }

    const graphData = await aiResponse.json();

    // Delete existing nodes and edges for this session
    await prisma.knowledgeNode.deleteMany({ where: { sessionId } });

    // Create a map to store node labels to IDs
    const nodeIdMap = new Map<string, string>();

    // Create nodes
    const createdNodes = [];
    for (const node of graphData.nodes as ExtractedNode[]) {
      const created = await prisma.knowledgeNode.create({
        data: {
          sessionId,
          type: node.type as any,
          label: node.label,
          description: node.description || null,
          properties: node.properties || null
        }
      });
      nodeIdMap.set(node.label, created.id);
      createdNodes.push(created);
    }

    // Create edges
    const createdEdges = [];
    for (const edge of graphData.edges as ExtractedEdge[]) {
      const sourceId = nodeIdMap.get(edge.source_label);
      const targetId = nodeIdMap.get(edge.target_label);
      
      if (sourceId && targetId) {
        const created = await prisma.knowledgeEdge.create({
          data: {
            sourceId,
            targetId,
            relation: edge.relation,
            label: edge.label || edge.relation.replace(/_/g, ' ')
          }
        });
        createdEdges.push(created);
      }
    }

    // Update graph status to READY
    await prisma.knowledgeGraph.update({
      where: { sessionId },
      data: {
        status: 'READY',
        summary: graphData.summary,
        nodeCount: createdNodes.length,
        edgeCount: createdEdges.length,
        lastBuiltAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      sessionId,
      summary: graphData.summary,
      nodeCount: createdNodes.length,
      edgeCount: createdEdges.length
    });

  } catch (error) {
    console.error('[Knowledge Graph] POST error:', error);
    return NextResponse.json({ error: 'Failed to build knowledge graph' }, { status: 500 });
  }
}

/**
 * DELETE /api/knowledge-graph?sessionId=xxx
 * Delete a knowledge graph for a session
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Verify user owns this session
    const chatSession = await prisma.chatSession.findFirst({
      where: { id: sessionId, createdById: session.user.id }
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Delete nodes (edges will cascade delete)
    await prisma.knowledgeNode.deleteMany({ where: { sessionId } });

    // Delete graph record
    await prisma.knowledgeGraph.deleteMany({ where: { sessionId } });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Knowledge Graph] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete knowledge graph' }, { status: 500 });
  }
}

/**
 * PATCH /api/knowledge-graph
 * Update node positions (for saving graph layout)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, nodes } = body;

    if (!sessionId || !nodes) {
      return NextResponse.json({ error: 'Session ID and nodes required' }, { status: 400 });
    }

    // Verify user owns this session
    const chatSession = await prisma.chatSession.findFirst({
      where: { id: sessionId, createdById: session.user.id }
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update node positions
    for (const node of nodes) {
      if (node.id && node.position) {
        await prisma.knowledgeNode.update({
          where: { id: node.id },
          data: { position: node.position }
        });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Knowledge Graph] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update knowledge graph' }, { status: 500 });
  }
}
