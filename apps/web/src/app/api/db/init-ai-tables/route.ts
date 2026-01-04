/**
 * Initialize AI Service database tables
 * This creates the tables that the AI service uses (chat_sessions, chat_messages, etc.)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Create AI service tables using raw SQL
    await prisma.$executeRawUnsafe(`
      -- Create chat_sessions table
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR,
        title VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_message_at TIMESTAMP,
        last_message_preview VARCHAR(500)
      );

      -- Create chat_messages table
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role VARCHAR(32),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        meta JSONB
      );
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

      -- Create session_files table
      CREATE TABLE IF NOT EXISTS session_files (
        id VARCHAR PRIMARY KEY,
        session_id VARCHAR REFERENCES chat_sessions(id) ON DELETE CASCADE,
        name VARCHAR(255),
        mime_type VARCHAR(128),
        size INTEGER,
        status VARCHAR(32) DEFAULT 'ready',
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_sensitive BOOLEAN,
        pii_detected BOOLEAN,
        extracted_text TEXT,
        raw_content BYTEA
      );
      CREATE INDEX IF NOT EXISTS idx_session_files_session_id ON session_files(session_id);

      -- Create notes table
      CREATE TABLE IF NOT EXISTS notes (
        id VARCHAR PRIMARY KEY,
        session_id VARCHAR REFERENCES chat_sessions(id) ON DELETE CASCADE,
        title VARCHAR(255),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        version INTEGER DEFAULT 1,
        UNIQUE(session_id, title)
      );
      CREATE INDEX IF NOT EXISTS idx_notes_session_id ON notes(session_id);

      -- Create note_history table
      CREATE TABLE IF NOT EXISTS note_history (
        id VARCHAR PRIMARY KEY,
        note_id VARCHAR REFERENCES notes(id) ON DELETE CASCADE,
        version INTEGER,
        title VARCHAR(255),
        content TEXT,
        edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_note_history_note_id ON note_history(note_id);
    `);

    return NextResponse.json({
      success: true,
      message: 'AI service tables created successfully',
      tables: ['chat_sessions', 'chat_messages', 'session_files', 'notes', 'note_history']
    });
  } catch (error) {
    console.error('Failed to create AI service tables:', error);
    return NextResponse.json(
      { error: 'Failed to create tables', details: String(error) },
      { status: 500 }
    );
  }
}
