"""Persistence helpers for chat sessions, messages, files, and notes."""

from datetime import datetime
from typing import Iterable, Optional
import uuid

from sqlalchemy import Select, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db_models import ChatMessage, ChatSession, Note, NoteHistory, SessionFile


async def ensure_session(session: AsyncSession, session_id: Optional[str], user_id: Optional[str], title: Optional[str] = None) -> str:
    """Return an existing session_id or create a new session row."""
    if session_id:
        existing = await session.get(ChatSession, session_id)
        if existing:
            return session_id

    new_id = session_id or str(uuid.uuid4())
    session.add(
        ChatSession(
            id=new_id,
            user_id=user_id,
            title=title or "New Session",
            created_at=datetime.utcnow(),
        )
    )
    await session.flush()
    return new_id


async def append_message(
    session: AsyncSession,
    session_id: str,
    role: str,
    content: str,
    metadata: Optional[dict] = None,
) -> None:
    """Persist a single chat message and update session metadata."""
    msg = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        meta=metadata,
        created_at=datetime.utcnow(),
    )
    session.add(msg)
    await session.execute(
        update(ChatSession)
        .where(ChatSession.id == session_id)
        .values(
            last_message_at=datetime.utcnow(),
            last_message_preview=content[:500],
            updated_at=datetime.utcnow(),
        )
    )
    await session.flush()


async def list_sessions(session: AsyncSession, user_id: Optional[str]) -> list[dict]:
    stmt: Select = select(ChatSession).order_by(ChatSession.updated_at.desc()).limit(50)
    if user_id:
        stmt = stmt.where(ChatSession.user_id == user_id)
    rows = (await session.execute(stmt)).scalars().all()
    return [
        {
            "id": s.id,
            "title": s.title or "Untitled Session",
            "updated_at": s.updated_at,
            "last_message_preview": s.last_message_preview,
        }
        for s in rows
    ]


async def fetch_context(session: AsyncSession, session_id: str, limit_messages: int = 50) -> dict:
    existing = await session.get(ChatSession, session_id)
    if not existing:
        return {}
    messages_stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit_messages)
    )
    files_stmt = select(SessionFile).where(SessionFile.session_id == session_id).order_by(SessionFile.uploaded_at.desc())
    notes_stmt = select(Note).where(Note.session_id == session_id).order_by(Note.updated_at.desc())

    messages = (await session.execute(messages_stmt)).scalars().all()
    files = (await session.execute(files_stmt)).scalars().all()
    notes = (await session.execute(notes_stmt)).scalars().all()

    return {
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at,
                "metadata": m.meta,
            }
            for m in messages
        ],
        "files": [
            {
                "id": f.id,
                "name": f.name,
                "mime_type": f.mime_type,
                "size": f.size,
                "status": f.status,
                "uploaded_at": f.uploaded_at,
                "is_sensitive": f.is_sensitive,
                "pii_detected": f.pii_detected,
            }
            for f in files
        ],
        "notes": [
            {
                "id": n.id,
                "title": n.title,
                "content": n.content,
                "updated_at": n.updated_at,
            }
            for n in notes
        ],
    }


async def add_file(
    session: AsyncSession,
    session_id: str,
    name: str,
    mime_type: Optional[str],
    size: Optional[int],
    status: str = "ready",
    is_sensitive: Optional[bool] = None,
    pii_detected: Optional[bool] = None,
    file_id: Optional[str] = None,
    raw_content: Optional[bytes] = None,
    extracted_text: Optional[str] = None,
) -> str:
    file_pk = file_id or str(uuid.uuid4())
    session.add(
        SessionFile(
            id=file_pk,
            session_id=session_id,
            name=name,
            mime_type=mime_type,
            size=size,
            status=status,
            is_sensitive=is_sensitive,
            pii_detected=pii_detected,
            uploaded_at=datetime.utcnow(),
            raw_content=raw_content,
            extracted_text=extracted_text,
        )
    )
    await session.flush()
    return file_pk


async def upsert_note(
    session: AsyncSession,
    session_id: str,
    title: str,
    content: str,
    note_id: Optional[str] = None,
) -> str:
    if note_id:
        existing = await session.get(Note, note_id)
        if existing:
            # Save current version to history before updating
            history_entry = NoteHistory(
                note_id=existing.id,
                version=existing.version,
                title=existing.title,
                content=existing.content,
                edited_at=existing.updated_at,
            )
            session.add(history_entry)
            
            # Update the note with new content and increment version
            existing.title = title
            existing.content = content
            existing.version = existing.version + 1
            existing.updated_at = datetime.utcnow()
            await session.flush()
            return note_id

    new_id = str(uuid.uuid4())
    session.add(
        Note(
            id=new_id,
            session_id=session_id,
            title=title,
            content=content,
            version=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
    )
    await session.flush()
    return new_id


async def get_note_history(session: AsyncSession, note_id: str) -> list[dict]:
    """Get all versions of a note from history."""
    note = await session.get(Note, note_id)
    if not note:
        return []
    
    # Get historical versions
    stmt = (
        select(NoteHistory)
        .where(NoteHistory.note_id == note_id)
        .order_by(NoteHistory.version.desc())
    )
    history = (await session.execute(stmt)).scalars().all()
    
    # Include current version at the top
    result = [
        {
            "version": note.version,
            "title": note.title,
            "content": note.content,
            "edited_at": note.updated_at,
            "is_current": True,
        }
    ]
    
    # Add historical versions
    for h in history:
        result.append({
            "version": h.version,
            "title": h.title,
            "content": h.content,
            "edited_at": h.edited_at,
            "is_current": False,
        })
    
    return result


async def restore_note_version(session: AsyncSession, note_id: str, version: int) -> bool:
    """Restore a note to a previous version."""
    note = await session.get(Note, note_id)
    if not note:
        return False
    
    # Find the version in history
    stmt = (
        select(NoteHistory)
        .where(NoteHistory.note_id == note_id)
        .where(NoteHistory.version == version)
    )
    history_entry = (await session.execute(stmt)).scalar_one_or_none()
    
    if not history_entry:
        return False
    
    # Save current state to history first
    current_history = NoteHistory(
        note_id=note.id,
        version=note.version,
        title=note.title,
        content=note.content,
        edited_at=note.updated_at,
    )
    session.add(current_history)
    
    # Restore the old version with a new version number
    note.title = history_entry.title
    note.content = history_entry.content
    note.version = note.version + 1
    note.updated_at = datetime.utcnow()
    
    await session.flush()
    return True


async def delete_note(session: AsyncSession, note_id: str) -> None:
    note = await session.get(Note, note_id)
    if note:
        await session.delete(note)
        await session.flush()


async def delete_file(session: AsyncSession, file_id: str) -> bool:
    """Delete a file record for a session."""
    file = await session.get(SessionFile, file_id)
    if not file:
        return False
    await session.delete(file)
    await session.flush()
    return True


async def get_file(session: AsyncSession, file_id: str) -> Optional[dict]:
    """Get a single file by ID."""
    file = await session.get(SessionFile, file_id)
    if not file:
        return None
    
    return {
        "id": file.id,
        "session_id": file.session_id,
        "name": file.name,
        "mime_type": file.mime_type,
        "size": file.size,
        "status": file.status,
        "uploaded_at": file.uploaded_at,
        "is_sensitive": file.is_sensitive,
        "pii_detected": file.pii_detected,
        "extracted_text": file.extracted_text,
        "raw_content": file.raw_content,
    }
