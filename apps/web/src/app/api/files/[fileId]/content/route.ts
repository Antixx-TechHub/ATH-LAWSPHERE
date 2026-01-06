/**
 * File Content Route - Get file content/metadata by ID
 * Returns file metadata and extracted text from the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { downloadFile } from '../../../../../lib/storage';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params;
    console.log('[File Content API] Fetching file:', fileId);

    // Get file from database
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      console.log('[File Content API] File not found:', fileId);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    console.log('[File Content API] File found, userId:', file.userId);

    // Check authorization:
    // - If user is logged in, they must own the file
    // - If file belongs to "anonymous" user, allow access (public demo mode)
    // - For demo purposes, also allow access if no session (anonymous browsing)
    const session = await getServerSession(authOptions);
    const isLoggedIn = !!session?.user;
    const isOwner = isLoggedIn && file.userId === session.user.id;
    const isAnonymousFile = file.userId === 'anonymous' || !file.userId;
    const allowAnonymousAccess = !isLoggedIn && isAnonymousFile;
    
    console.log('[File Content API] Auth check:', { isLoggedIn, isOwner, isAnonymousFile, allowAnonymousAccess });
    
    // Allow access if: user owns the file, OR file is anonymous and user is browsing anonymously
    if (!isOwner && !isAnonymousFile) {
      console.log('[File Content API] Access denied for file:', fileId);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Try to get content from various sources
    let content = file.extractedText || '';
    
    // If no extracted text, try to read from storage (for text files)
    if (!content && file.mimeType?.startsWith('text/')) {
      try {
        const fileBuffer = await downloadFile(file.storageKey);
        if (fileBuffer) {
          content = fileBuffer.toString('utf-8');
        }
      } catch (err) {
        console.error('Failed to read file content from storage:', err);
      }
    }
    
    // If still no content and we have file content in database
    if (!content && file.content) {
      content = file.content.toString('utf-8');
    }

    // Return file metadata and content
    return NextResponse.json({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      status: file.status,
      content: content,
      extractedText: file.extractedText,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('File content error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file content' },
      { status: 500 }
    );
  }
}
