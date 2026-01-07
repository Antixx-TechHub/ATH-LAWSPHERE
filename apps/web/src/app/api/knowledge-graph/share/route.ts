/**
 * Knowledge Graph Sharing API
 * Allows users to share graphs with team members
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { randomBytes } from 'crypto';

// Generate unique share token
function generateShareToken(): string {
  return randomBytes(16).toString('hex');
}

// GET - List shares for a graph or get shared graphs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId');
    const view = searchParams.get('view'); // 'owned' | 'shared-with-me'
    
    if (graphId) {
      // Get shares for specific graph (only owner can see)
      const graph = await prisma.knowledgeGraph.findFirst({
        where: {
          id: graphId,
          userId: session.user.id
        }
      });
      
      if (!graph) {
        return NextResponse.json({ error: 'Graph not found' }, { status: 404 });
      }
      
      const shares = await prisma.graphShare.findMany({
        where: { graphId },
        include: {
          sharedWith: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return NextResponse.json({
        success: true,
        shares: shares.map(s => ({
          id: s.id,
          access: s.access,
          sharedWith: s.sharedWith,
          token: s.token,
          expiresAt: s.expiresAt,
          createdAt: s.createdAt
        }))
      });
    }
    
    if (view === 'shared-with-me') {
      // Get graphs shared with this user
      const shares = await prisma.graphShare.findMany({
        where: {
          sharedWithId: session.user.id,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          graph: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              user: {
                select: { name: true, email: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return NextResponse.json({
        success: true,
        sharedGraphs: shares.map(s => ({
          shareId: s.id,
          access: s.access,
          graph: s.graph,
          sharedAt: s.createdAt
        }))
      });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    
  } catch (error) {
    console.error('Share GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get shares' },
      { status: 500 }
    );
  }
}

// POST - Create a new share
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { graphId, email, access = 'VIEW', expiresInDays } = body;
    
    if (!graphId) {
      return NextResponse.json({ error: 'graphId required' }, { status: 400 });
    }
    
    // Verify ownership
    const graph = await prisma.knowledgeGraph.findFirst({
      where: {
        id: graphId,
        userId: session.user.id
      }
    });
    
    if (!graph) {
      return NextResponse.json({ error: 'Graph not found' }, { status: 404 });
    }
    
    // Find user to share with
    let sharedWithUser = null;
    if (email) {
      sharedWithUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (!sharedWithUser) {
        return NextResponse.json(
          { error: 'User not found. They must have an account first.' },
          { status: 404 }
        );
      }
      
      if (sharedWithUser.id === session.user.id) {
        return NextResponse.json(
          { error: 'Cannot share with yourself' },
          { status: 400 }
        );
      }
      
      // Check if already shared
      const existing = await prisma.graphShare.findFirst({
        where: {
          graphId,
          sharedWithId: sharedWithUser.id
        }
      });
      
      if (existing) {
        // Update existing share
        const updated = await prisma.graphShare.update({
          where: { id: existing.id },
          data: {
            access,
            expiresAt: expiresInDays 
              ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
              : null
          }
        });
        
        return NextResponse.json({
          success: true,
          share: updated,
          message: 'Share updated'
        });
      }
    }
    
    // Create share
    const share = await prisma.graphShare.create({
      data: {
        graphId,
        sharedById: session.user.id,
        sharedWithId: sharedWithUser?.id || null,
        access,
        token: generateShareToken(),
        expiresAt: expiresInDays 
          ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
          : null
      }
    });
    
    // Generate share link
    const shareLink = `${process.env.NEXTAUTH_URL || 'https://ath-lawsphere.antixxtechhub.in'}/knowledge-graph/shared/${share.token}`;
    
    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        access: share.access,
        token: share.token,
        expiresAt: share.expiresAt,
        shareLink
      },
      message: email 
        ? `Shared with ${email}` 
        : 'Share link created'
    });
    
  } catch (error) {
    console.error('Share POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create share' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a share
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');
    
    if (!shareId) {
      return NextResponse.json({ error: 'shareId required' }, { status: 400 });
    }
    
    // Verify ownership (only owner can delete share)
    const share = await prisma.graphShare.findFirst({
      where: { id: shareId },
      include: { graph: true }
    });
    
    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }
    
    if (share.graph.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    
    await prisma.graphShare.delete({
      where: { id: shareId }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Share removed'
    });
    
  } catch (error) {
    console.error('Share DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete share' },
      { status: 500 }
    );
  }
}
