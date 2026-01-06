/**
 * File Upload API
 * Handles file uploads with multiple storage backends:
 * - S3/R2 for production with object storage
 * - PostgreSQL for Railway (persists across deploys)
 * - Local filesystem for development
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile, getStorageInfo } from '../../../lib/storage';

const prisma = new PrismaClient();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Log storage mode on startup
console.log('[File Upload API] Storage:', getStorageInfo());

// Specific allowed MIME types
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/rtf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/tiff',
  'image/bmp',
  'image/svg+xml',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
];

// Check if file type is allowed (also accept generic image/*, text/*, audio/*, video/*)
function isAllowedType(mimeType: string): boolean {
  if (ALLOWED_TYPES.includes(mimeType)) return true;
  // Allow any image, text, audio, or video type
  if (mimeType.startsWith('image/')) return true;
  if (mimeType.startsWith('text/')) return true;
  if (mimeType.startsWith('audio/')) return true;
  if (mimeType.startsWith('video/')) return true;
  return false;
}

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

    console.log('[File Upload API] File:', file.name, 'Type:', file.type, 'Session:', sessionId, 'User:', userId);

    // Validate file type
    if (!isAllowedType(file.type)) {
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
    const storageKey = `${uploaderId}/${fileId}.${fileExtension}`;

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to storage (S3, database, or local based on configuration)
    const storageResult = await uploadFile(buffer, storageKey, file.type);
    console.log('[File Upload API] Storage result:', storageResult.mode, storageKey);

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
    // For database storage mode, include content; otherwise just metadata
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
        // Only store content in DB if using database storage mode
        // Type assertion needed until Prisma client is regenerated after migration
        ...(storageResult.content ? { content: storageResult.content } : {}),
        userId: user.id,
        sessionId: validSessionId
      } as any
    });

    console.log('[File Upload API] Created file record:', fileRecord.id, 'Mode:', storageResult.mode);

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
