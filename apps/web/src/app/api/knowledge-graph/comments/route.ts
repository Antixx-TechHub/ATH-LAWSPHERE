/**
 * Knowledge Graph Comments API
 * Allows users to comment on graph nodes and edges
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

// GET - Get comments for a graph or specific node
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId');
    const nodeId = searchParams.get('nodeId');
    const edgeId = searchParams.get('edgeId');
    
    if (!graphId) {
      return NextResponse.json({ error: 'graphId required' }, { status: 400 });
    }
    
    // Verify access (owner or shared with)
    const hasAccess = await checkGraphAccess(graphId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const where: any = { graphId };
    if (nodeId) where.nodeId = nodeId;
    if (edgeId) where.edgeId = edgeId;
    
    const comments = await prisma.graphComment.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        },
        replies: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({
      success: true,
      comments: comments.filter(c => !c.parentId), // Only top-level comments
      total: comments.length
    });
    
  } catch (error) {
    console.error('Comments GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get comments' },
      { status: 500 }
    );
  }
}

// POST - Add a new comment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { graphId, nodeId, edgeId, content, parentId } = body;
    
    if (!graphId || !content) {
      return NextResponse.json(
        { error: 'graphId and content required' },
        { status: 400 }
      );
    }
    
    // Verify access
    const access = await checkGraphAccess(graphId, session.user.id);
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Check if user can comment (VIEW access can't comment, only COMMENT/EDIT)
    if (access === 'VIEW') {
      return NextResponse.json(
        { error: 'You do not have permission to comment' },
        { status: 403 }
      );
    }
    
    const comment = await prisma.graphComment.create({
      data: {
        graphId,
        nodeId: nodeId || null,
        edgeId: edgeId || null,
        content,
        userId: session.user.id,
        parentId: parentId || null
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      comment
    });
    
  } catch (error) {
    console.error('Comments POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}

// PATCH - Update a comment
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { commentId, content, resolved } = body;
    
    if (!commentId) {
      return NextResponse.json({ error: 'commentId required' }, { status: 400 });
    }
    
    // Get the comment
    const comment = await prisma.graphComment.findUnique({
      where: { id: commentId },
      include: { graph: true }
    });
    
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    // Only comment author or graph owner can update
    const isAuthor = comment.userId === session.user.id;
    const isOwner = comment.graph.userId === session.user.id;
    
    if (!isAuthor && !isOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    
    const updateData: any = {};
    if (content !== undefined && isAuthor) {
      updateData.content = content;
    }
    if (resolved !== undefined) {
      updateData.resolved = resolved;
      updateData.resolvedAt = resolved ? new Date() : null;
      updateData.resolvedBy = resolved ? session.user.id : null;
    }
    
    const updated = await prisma.graphComment.update({
      where: { id: commentId },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      comment: updated
    });
    
  } catch (error) {
    console.error('Comments PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a comment
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    
    if (!commentId) {
      return NextResponse.json({ error: 'commentId required' }, { status: 400 });
    }
    
    // Get the comment
    const comment = await prisma.graphComment.findUnique({
      where: { id: commentId },
      include: { graph: true }
    });
    
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    // Only comment author or graph owner can delete
    const isAuthor = comment.userId === session.user.id;
    const isOwner = comment.graph.userId === session.user.id;
    
    if (!isAuthor && !isOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    
    // Delete replies first
    await prisma.graphComment.deleteMany({
      where: { parentId: commentId }
    });
    
    // Delete comment
    await prisma.graphComment.delete({
      where: { id: commentId }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Comment deleted'
    });
    
  } catch (error) {
    console.error('Comments DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}

// Helper to check graph access
async function checkGraphAccess(
  graphId: string, 
  userId: string
): Promise<string | null> {
  // Check if owner
  const graph = await prisma.knowledgeGraph.findFirst({
    where: {
      id: graphId,
      userId
    }
  });
  
  if (graph) return 'EDIT'; // Owner has full access
  
  // Check if shared
  const share = await prisma.graphShare.findFirst({
    where: {
      graphId,
      sharedWithId: userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    }
  });
  
  if (share) return share.access;
  
  return null;
}
