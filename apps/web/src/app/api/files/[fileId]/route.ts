/**
 * File Operations Route - Get/Delete file by ID
 * Direct database operations instead of proxying to AI service
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';

const USE_LOCAL_STORAGE = process.env.USE_LOCAL_STORAGE === 'true' || !process.env.S3_ENDPOINT;
const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'uploads');

export async function DELETE(
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

    // Delete from database
    await prisma.file.delete({
      where: { id: fileId },
    });

    // Delete from local storage if applicable
    if (USE_LOCAL_STORAGE) {
      try {
        const relativePath = file.storageKey.replace('uploads/', '');
        const localPath = path.join(LOCAL_STORAGE_DIR, relativePath);
        await fs.unlink(localPath);
      } catch (err) {
        console.error('Failed to delete local file:', err);
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'FILE_DELETE',
        entity: 'File',
        entityId: fileId,
        metadata: { fileName: file.filename },
      },
    });

    return NextResponse.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('File delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

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

    // Generate download URL
    const downloadUrl = USE_LOCAL_STORAGE
      ? `/api/files/download?id=${file.id}`
      : file.url;

    return NextResponse.json({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      status: file.status,
      url: file.url,
      downloadUrl,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    });
  } catch (error) {
    console.error('File get error:', error);
    return NextResponse.json(
      { error: 'Failed to get file' },
      { status: 500 }
    );
  }
}
