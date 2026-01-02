/**
 * File Content Route - Get file content/metadata by ID
 * Returns file metadata and extracted text from the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // For text files, try to read content from local storage
    let content = file.extractedText || '';
    
    if (!content && USE_LOCAL_STORAGE && file.mimeType === 'text/plain') {
      try {
        const relativePath = file.storageKey.replace('uploads/', '');
        const localPath = path.join(LOCAL_STORAGE_DIR, relativePath);
        content = await fs.readFile(localPath, 'utf-8');
      } catch (err) {
        console.error('Failed to read file content:', err);
      }
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
