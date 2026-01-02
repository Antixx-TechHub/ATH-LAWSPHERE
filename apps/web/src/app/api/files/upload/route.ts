/**
 * File Upload API
 * Handles file uploads to local storage or S3, stores metadata in PostgreSQL
 * Works for both local development and production (Railway)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Check if we should use local storage (for development or when S3 not configured)
const USE_LOCAL_STORAGE = process.env.USE_LOCAL_STORAGE === 'true' || !process.env.S3_ENDPOINT;

// Local storage directory
const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'uploads');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  console.log('[File Upload API] Processing upload request');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sessionId = formData.get('session_id') as string | null;
    const userId = formData.get('user_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[File Upload API] File:', file.name, 'Session:', sessionId, 'User:', userId);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      console.log('[File Upload API] Invalid type:', file.type);
      return NextResponse.json(
        { error: `File type not allowed: ${file.type}` },
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
    const uploaderId = userId || 'anonymous';
    const storageKey = `uploads/${uploaderId}/${fileId}.${fileExtension}`;

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to storage
    if (USE_LOCAL_STORAGE) {
      // Use local filesystem storage
      const localDir = path.join(LOCAL_STORAGE_DIR, uploaderId);
      await ensureDir(localDir);
      const filePath = path.join(localDir, `${fileId}.${fileExtension}`);
      await fs.writeFile(filePath, buffer);
      console.log('[File Upload API] File saved locally:', filePath);
    } else {
      // TODO: Implement S3 upload for production with S3
      // For Railway without S3, use local storage (ephemeral)
      const localDir = path.join(LOCAL_STORAGE_DIR, uploaderId);
      await ensureDir(localDir);
      const filePath = path.join(localDir, `${fileId}.${fileExtension}`);
      await fs.writeFile(filePath, buffer);
      console.log('[File Upload API] File saved to ephemeral storage:', filePath);
    }

    // Ensure user exists (create anonymous user if needed)
    let user = await prisma.user.findUnique({ where: { id: uploaderId } });
    if (!user) {
      user = await prisma.user.findUnique({ 
        where: { email: `${uploaderId}@lawsphere.local` } 
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: uploaderId,
            email: `${uploaderId}@lawsphere.local`,
            name: uploaderId === 'anonymous' ? 'Anonymous User' : uploaderId,
            passwordHash: 'no-password'
          }
        });
        console.log('[File Upload API] Created user:', user.id);
      }
    }

    // Validate session exists if provided (skip for "local-*" sessions)
    let validSessionId: string | null = null;
    if (sessionId && !sessionId.startsWith('local-')) {
      const session = await prisma.chatSession.findUnique({ 
        where: { id: sessionId } 
      });
      if (session) {
        validSessionId = session.id;
      } else {
        console.log('[File Upload API] Session not found:', sessionId);
      }
    }

    // Extract text for text files
    let extractedText: string | null = null;
    if (file.type === 'text/plain') {
      extractedText = buffer.toString('utf-8');
    }

    // Create file record in PostgreSQL
    const fileRecord = await prisma.file.create({
      data: {
        id: fileId,
        filename: file.name,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: `/api/files/${fileId}/raw`,
        storageKey: storageKey,
        status: 'READY',
        extractedText: extractedText,
        userId: user.id,
        sessionId: validSessionId
      }
    });

    console.log('[File Upload API] Created file record:', fileRecord.id);

    // Trigger AI service for text extraction (async, non-blocking)
    if (file.type !== 'text/plain') {
      fetch(`${AI_SERVICE_URL}/api/files/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: fileId,
          file_path: storageKey,
          file_type: file.type,
          user_id: uploaderId,
        }),
      }).catch(err => {
        console.error('[File Upload API] Failed to trigger processing:', err);
      });
    }

    return NextResponse.json({
      file_id: fileId,
      id: fileId,
      filename: file.name,
      original_name: file.name,
      content_type: file.type,
      size: file.size,
      status: 'READY',
      session_id: validSessionId,
      user_id: user.id
    });

  } catch (error) {
    console.error('[File Upload API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: String(error) },
      { status: 500 }
    );
  }
}
