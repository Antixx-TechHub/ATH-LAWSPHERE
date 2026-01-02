/**
 * Files API Routes - Next.js API Route Handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';

// Check if we should use local storage (for development)
const USE_LOCAL_STORAGE = process.env.USE_LOCAL_STORAGE === 'true' || !process.env.S3_ENDPOINT;

// Local storage directory (relative to project root)
const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'uploads');

// S3 Client configuration (only used if not using local storage)
const s3Client = USE_LOCAL_STORAGE ? null : new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'lawsphere',
    secretAccessKey: process.env.S3_SECRET_KEY || 'lawsphere_secret',
  },
  forcePathStyle: true, // Required for MinIO
});

const BUCKET_NAME = process.env.S3_BUCKET || 'lawsphere-files';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Helper function to ensure directory exists
async function ensureDir(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const matterId = formData.get('matterId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB' },
        { status: 400 }
      );
    }

    // Generate unique file key
    const fileId = uuidv4();
    const fileExtension = file.name.split('.').pop() || '';
    const s3Key = `uploads/${session.user.id}/${fileId}.${fileExtension}`;

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to storage (S3 or local filesystem)
    if (USE_LOCAL_STORAGE) {
      // Use local filesystem storage
      const localPath = path.join(LOCAL_STORAGE_DIR, session.user.id);
      await ensureDir(localPath);
      const filePath = path.join(localPath, `${fileId}.${fileExtension}`);
      await fs.writeFile(filePath, buffer);
      console.log(`File saved locally: ${filePath}`);
    } else {
      // Use S3 storage
      await s3Client!.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: buffer,
          ContentType: file.type,
          Metadata: {
            originalName: file.name,
            uploadedBy: session.user.id,
          },
        })
      );
    }

    // Create file record in database
    const fileRecord = await prisma.file.create({
      data: {
        id: fileId,
        userId: session.user.id,
        sessionId: matterId || undefined,
        filename: file.name,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: USE_LOCAL_STORAGE ? `/api/files/download?id=${fileId}` : s3Key,
        storageKey: s3Key,
        status: 'READY',  // Set to READY immediately - processing is async
      },
    });

    // Trigger AI service for processing (async, non-blocking)
    // This updates extractedText but status is already READY
    fetch(`${AI_SERVICE_URL}/api/files/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_id: fileId,
        file_path: s3Key,
        file_type: file.type,
        user_id: session.user.id,
      }),
    }).catch(err => {
      console.error('Failed to trigger file processing:', err);
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'FILE_UPLOAD',
        entity: 'File',
        entityId: fileId,
        metadata: {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        },
      },
    });

    return NextResponse.json({
      id: fileId,
      filename: file.name,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      status: 'READY',
      url: USE_LOCAL_STORAGE ? `/api/files/download?id=${fileId}` : s3Key,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    const matterId = searchParams.get('matterId');

    if (fileId) {
      // Get specific file
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file || file.userId !== session.user.id) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      // Generate download URL (signed URL for S3 or local path)
      let downloadUrl: string;
      if (USE_LOCAL_STORAGE) {
        // For local storage, use the API endpoint to serve files
        downloadUrl = `/api/files/download?id=${file.id}`;
      } else {
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: file.storageKey,
        });
        downloadUrl = await getSignedUrl(s3Client!, command, { expiresIn: 3600 });
      }

      return NextResponse.json({
        ...file,
        downloadUrl,
      });
    }

    // List files
    const where: { userId: string; sessionId?: string } = {
      userId: session.user.id,
    };

    if (matterId) {
      where.sessionId = matterId;
    }

    const files = await prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Files GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Delete from database (S3 cleanup can be done async)
    await prisma.file.delete({
      where: { id: fileId },
    });

    // Delete local file if using local storage
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
        metadata: {
          fileName: file.filename,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('File delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
