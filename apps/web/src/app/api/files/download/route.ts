/**
 * File Download API Route - Serves files from local storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering - this route uses session/headers
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'uploads');

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

    // Construct local file path from the stored storageKey
    // storageKey is like "uploads/userId/fileId.ext"
    const relativePath = file.storageKey.replace('uploads/', '');
    const localPath = path.join(LOCAL_STORAGE_DIR, relativePath);

    try {
      const fileBuffer = await fs.readFile(localPath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': file.mimeType,
          'Content-Disposition': `attachment; filename="${file.filename}"`,
          'Content-Length': file.size.toString(),
        },
      });
    } catch (err) {
      console.error('File read error:', err);
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }
  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
