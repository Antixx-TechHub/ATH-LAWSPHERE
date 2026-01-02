/**
 * File Raw Content Route - Get raw file bytes by ID
 * Returns the actual file content (for images, PDFs, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';

const USE_LOCAL_STORAGE = process.env.USE_LOCAL_STORAGE === 'true' || !process.env.S3_ENDPOINT;
const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'uploads');

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

    // Get file from database
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

    if (USE_LOCAL_STORAGE) {
      // Read from local storage
      try {
        const relativePath = file.storageKey.replace('uploads/', '');
        const localPath = path.join(LOCAL_STORAGE_DIR, relativePath);
        const fileBuffer = await fs.readFile(localPath);

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': file.mimeType,
            'Content-Disposition': `inline; filename="${file.filename}"`,
            'Content-Length': file.size.toString(),
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (err) {
        console.error('File read error:', err);
        return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
      }
    } else {
      // For S3, redirect to signed URL
      // This would need S3 client setup
      return NextResponse.json(
        { error: 'S3 storage not configured' },
        { status: 501 }
      );
    }
  } catch (error) {
    console.error('File raw error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    );
  }
}
