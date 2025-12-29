"""Session management endpoints for chat history, files, and notes."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.services import session_store

router = APIRouter()


class SessionCreateRequest(BaseModel):
    title: Optional[str] = None
    user_id: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    title: str
    updated_at: datetime
    last_message_preview: Optional[str] = None


class ContextResponse(BaseModel):
    messages: list[dict]
    files: list[dict]
    notes: list[dict]


class NoteUpsertRequest(BaseModel):
    title: str = Field(..., min_length=1)
    content: str = Field("", max_length=20000)
    note_id: Optional[str] = None


@router.post("/", response_model=SessionResponse)
async def create_session(payload: SessionCreateRequest, db: AsyncSession = Depends(get_db)):
    session_id = await session_store.ensure_session(db, None, payload.user_id, payload.title)
    await db.commit()
    return SessionResponse(
        id=session_id,
        title=payload.title or "New Session",
        updated_at=datetime.utcnow(),
        last_message_preview=None,
    )


@router.get("/", response_model=list[SessionResponse])
async def list_sessions(user_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    sessions = await session_store.list_sessions(db, user_id)
    return [
        SessionResponse(
            id=s["id"],
            title=s["title"],
            updated_at=s["updated_at"],
            last_message_preview=s.get("last_message_preview"),
        )
        for s in sessions
    ]


@router.get("/{session_id}/context", response_model=ContextResponse)
async def get_context(session_id: str, db: AsyncSession = Depends(get_db)):
    ctx = await session_store.fetch_context(db, session_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="Session not found")
    return ContextResponse(**ctx)


@router.get("/{session_id}/files")
async def get_files(session_id: str, db: AsyncSession = Depends(get_db)):
    ctx = await session_store.fetch_context(db, session_id)
    return {"files": ctx["files"]}


@router.get("/{session_id}/notes")
async def get_notes(session_id: str, db: AsyncSession = Depends(get_db)):
    ctx = await session_store.fetch_context(db, session_id)
    return {"notes": ctx["notes"]}


@router.post("/{session_id}/notes")
async def upsert_note(session_id: str, payload: NoteUpsertRequest, db: AsyncSession = Depends(get_db)):
    note_id = await session_store.upsert_note(
        db,
        session_id=session_id,
        title=payload.title,
        content=payload.content,
        note_id=payload.note_id,
    )
    await db.commit()
    return {"note_id": note_id}


@router.get("/notes/{note_id}/history")
async def get_note_history(note_id: str, db: AsyncSession = Depends(get_db)):
    """Get version history of a note."""
    history = await session_store.get_note_history(db, note_id)
    return {"note_id": note_id, "history": history}


@router.post("/notes/{note_id}/restore/{version}")
async def restore_note_version(note_id: str, version: int, db: AsyncSession = Depends(get_db)):
    """Restore a note to a previous version."""
    success = await session_store.restore_note_version(db, note_id, version)
    if not success:
        raise HTTPException(status_code=404, detail="Version not found")
    await db.commit()
    return {"status": "restored", "version": version}


@router.delete("/notes/{note_id}")
async def delete_note(note_id: str, db: AsyncSession = Depends(get_db)):
    await session_store.delete_note(db, note_id)
    await db.commit()
    return {"status": "deleted"}
