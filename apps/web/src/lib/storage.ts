/**
 * File Storage Utility
 * 
 * Supports multiple storage backends with automatic fallback:
 * 1. S3/R2 (Cloudflare R2, AWS S3, MinIO) - Best for production
 * 2. PostgreSQL (bytea column) - Works on Railway without extra config
 * 3. Local filesystem - Development only (ephemeral on Railway)
 * 
 * Configuration via environment variables:
 * - S3_ENDPOINT: S3-compatible endpoint (e.g., https://xxx.r2.cloudflarestorage.com)
 * - S3_ACCESS_KEY: Access key ID
 * - S3_SECRET_KEY: Secret access key
 * - S3_BUCKET: Bucket name
 * - S3_REGION: Region (default: auto)
 * - STORAGE_MODE: 's3' | 'database' | 'local' (auto-detected if not set)
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';
import path from 'path';

// Storage mode detection
type StorageMode = 's3' | 'database' | 'local';

// Check if S3 endpoint is a real remote endpoint (not localhost/dev)
function isValidS3Endpoint(endpoint: string | undefined): boolean {
  if (!endpoint) return false;
  // Ignore localhost endpoints - those are for local MinIO dev
  if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
    return false;
  }
  return true;
}

function getStorageMode(): StorageMode {
  // Explicit mode from env
  const explicit = process.env.STORAGE_MODE as StorageMode;
  if (explicit && ['s3', 'database', 'local'].includes(explicit)) {
    return explicit;
  }
  
  // Auto-detect: S3 if configured with a real remote endpoint
  const s3Endpoint = process.env.S3_ENDPOINT;
  if (isValidS3Endpoint(s3Endpoint) && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY) {
    return 's3';
  }
  
  // Default to database storage (works everywhere, including Railway)
  return 'database';
}

export const STORAGE_MODE = getStorageMode();
const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'uploads');

// S3 Client (lazy initialization)
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
      forcePathStyle: true, // Required for MinIO and some S3-compatible services
    });
  }
  return s3Client;
}

const BUCKET_NAME = process.env.S3_BUCKET || 'lawsphere-files';

// Helper to ensure directory exists
async function ensureDir(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

export interface StorageResult {
  mode: StorageMode;
  key: string;
  content?: Buffer; // Only for database mode
}

/**
 * Upload file to storage
 * Returns the storage key and content (for database mode)
 */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<StorageResult> {
  console.log(`[Storage] Uploading to ${STORAGE_MODE}: ${key} (${buffer.length} bytes)`);

  switch (STORAGE_MODE) {
    case 's3': {
      const client = getS3Client();
      await client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }));
      return { mode: 's3', key };
    }

    case 'database': {
      // Return buffer to be stored in PostgreSQL
      return { mode: 'database', key, content: buffer };
    }

    case 'local': {
      const localPath = path.join(LOCAL_STORAGE_DIR, key);
      await ensureDir(path.dirname(localPath));
      await fs.writeFile(localPath, buffer);
      return { mode: 'local', key };
    }

    default:
      throw new Error(`Unknown storage mode: ${STORAGE_MODE}`);
  }
}

/**
 * Download file from storage
 * For database mode, content must be passed from the database query
 */
export async function downloadFile(
  key: string,
  dbContent?: Buffer | null
): Promise<Buffer> {
  console.log(`[Storage] Downloading from ${STORAGE_MODE}: ${key}`);

  switch (STORAGE_MODE) {
    case 's3': {
      const client = getS3Client();
      const response = await client.send(new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      }));
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }

    case 'database': {
      if (dbContent) {
        return Buffer.from(dbContent);
      }
      // Fallback to local if no database content
      console.log('[Storage] No database content, trying local fallback');
      return downloadFromLocal(key);
    }

    case 'local': {
      return downloadFromLocal(key);
    }

    default:
      throw new Error(`Unknown storage mode: ${STORAGE_MODE}`);
  }
}

async function downloadFromLocal(key: string): Promise<Buffer> {
  // Handle keys that may or may not have 'uploads/' prefix
  const cleanKey = key.replace(/^uploads\//, '');
  const localPath = path.join(LOCAL_STORAGE_DIR, cleanKey);
  return fs.readFile(localPath);
}

/**
 * Delete file from storage
 */
export async function deleteFile(
  key: string
): Promise<void> {
  console.log(`[Storage] Deleting from ${STORAGE_MODE}: ${key}`);

  switch (STORAGE_MODE) {
    case 's3': {
      const client = getS3Client();
      await client.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      }));
      break;
    }

    case 'database': {
      // Content is deleted when the database record is deleted
      // Also try to clean up any local fallback
      try {
        await deleteFromLocal(key);
      } catch {
        // Ignore local delete errors
      }
      break;
    }

    case 'local': {
      await deleteFromLocal(key);
      break;
    }
  }
}

async function deleteFromLocal(key: string): Promise<void> {
  const cleanKey = key.replace(/^uploads\//, '');
  const localPath = path.join(LOCAL_STORAGE_DIR, cleanKey);
  await fs.unlink(localPath);
}

/**
 * Get storage info for logging/debugging
 */
export function getStorageInfo(): { mode: StorageMode; details: string } {
  switch (STORAGE_MODE) {
    case 's3':
      return {
        mode: 's3',
        details: `S3 endpoint: ${process.env.S3_ENDPOINT}, bucket: ${BUCKET_NAME}`
      };
    case 'database':
      return {
        mode: 'database',
        details: 'Files stored in PostgreSQL (content column)'
      };
    case 'local':
      return {
        mode: 'local',
        details: `Local directory: ${LOCAL_STORAGE_DIR}`
      };
  }
}
