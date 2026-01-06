/**
 * File Raw Content Route - Get raw file bytes by ID
 * Returns the actual file content (for images, PDFs, etc.)
 * 
 * Supports multiple storage backends via storage utility:
 * - S3/R2 for production with object storage
 * - Database storage for Railway
 * - Local filesystem for development
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { downloadFile } from '../../../../lib/storage';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params;
    console.log('[File Raw API] Fetching file:', fileId);

    // Get file metadata from database
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      console.log('[File Raw API] File not found:', fileId);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    console.log('[File Raw API] File found, userId:', file.userId);

    // Check authorization:
    // - If user is logged in, they must own the file
    // - If file belongs to "anonymous" user, allow access (public demo mode)
    const session = await getServerSession(authOptions);
    const isLoggedIn = !!session?.user;
    const isOwner = isLoggedIn && file.userId === session.user.id;
    const isAnonymousFile = file.userId === 'anonymous' || !file.userId;
    
    console.log('[File Raw API] Auth check:', { isLoggedIn, isOwner, isAnonymousFile });
    
    // Allow access if: user owns the file, OR file is anonymous
    if (!isOwner && !isAnonymousFile) {
      console.log('[File Raw API] Access denied for file:', fileId);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Download file content using storage utility
    // Passes database content for database storage mode
    try {
      // Type assertion for content field (added in migration)
      const fileWithContent = file as typeof file & { content?: Buffer | null };
      const buffer = await downloadFile(file.storageKey, fileWithContent.content);
      
      console.log('[File Raw] Serving:', fileId, buffer.length, 'bytes');

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': file.mimeType,
          'Content-Disposition': `inline; filename="${file.filename}"`,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (err) {
      console.error('[File Raw] Content not available:', fileId, err);
      return NextResponse.json(
        { error: 'File content not available' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('[File Raw] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    );
  }
}
