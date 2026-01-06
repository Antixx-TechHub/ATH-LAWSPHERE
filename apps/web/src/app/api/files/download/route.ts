/**
 * File Download API Route - Serves files for download
 * Supports multiple storage backends via storage utility
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { downloadFile } from '../../../../lib/storage';

// Force dynamic rendering - this route uses session/headers
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.userId !== session.user.id) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Download file using storage utility
    try {
      // Type assertion for content field (added in migration)
      const fileWithContent = file as typeof file & { content?: Buffer | null };
      const buffer = await downloadFile(file.storageKey, fileWithContent.content);
      
      console.log('[File Download] Serving:', fileId, buffer.length, 'bytes');
      
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': file.mimeType,
          'Content-Disposition': `attachment; filename="${file.filename}"`,
          'Content-Length': buffer.length.toString(),
        },
      });
    } catch (err) {
      console.error('[File Download] Content not available:', fileId, err);
      return NextResponse.json({ error: 'File content not available' }, { status: 404 });
    }
  } catch (error) {
    console.error('[File Download] Error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
