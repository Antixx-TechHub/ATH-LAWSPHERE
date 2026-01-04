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
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { downloadFile } from '@/lib/storage';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = params;

    // Get file metadata from database
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check ownership
    if (file.userId !== session.user.id) {
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
