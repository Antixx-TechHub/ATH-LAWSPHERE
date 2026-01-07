"""
Database configuration and session management for async SQLAlchemy.
Adds a resilient fallback to SQLite when Postgres is unavailable.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
import os
import structlog

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.exc import OperationalError

from app.config import settings


logger = structlog.get_logger()


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""


def _normalize_url(url: str) -> str:
    """Ensure async driver is used for Postgres; pass-through otherwise."""
    if url.startswith("postgresql://") or url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://").replace(
            "postgresql://", "postgresql+asyncpg://"
        )
    return url


def _create_engine(url: str):
    normalized = _normalize_url(url)
    # Use connection pooling settings suitable for Railway
    return create_async_engine(
        normalized, 
        echo=False, 
        future=True,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,  # Verify connections before use
        pool_recycle=300,  # Recycle connections every 5 minutes
    )


# Engine/session initialized during app startup in init_db()
engine = None
SessionLocal = None


async def init_db() -> None:
    """Initialize database; fallback to SQLite if Postgres is down."""
    from app import db_models  # noqa: F401  Ensure models are imported

    global engine, SessionLocal

    try:
        # Initialize primary engine from env
        engine = _create_engine(settings.DATABASE_URL)
        SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
        async with engine.begin() as conn:
            try:
                await conn.run_sync(Base.metadata.create_all)
            except OperationalError as oe:
                # Ignore "already exists" races when multiple processes initialize
                if "already exists" not in str(oe).lower():
                    raise
        logger.info("database_init_complete", url=_normalize_url(settings.DATABASE_URL))
    except Exception as e:
        logger.error("database_init_failed", error=str(e), url=_normalize_url(settings.DATABASE_URL))
        # Fallback to local SQLite for development
        sqlite_path = os.path.join(os.getcwd(), "lawsphere.db")
        fallback_url = f"sqlite+aiosqlite:///{sqlite_path}"
        logger.warning("database_fallback_sqlite", url=fallback_url)
        engine = _create_engine(fallback_url)
        SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
        async with engine.begin() as conn:
            try:
                await conn.run_sync(Base.metadata.create_all)
            except OperationalError as oe:
                if "already exists" not in str(oe).lower():
                    raise
        logger.info("sqlite_init_complete", path=sqlite_path)


@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide an async database session as a context manager."""
    session: AsyncSession = SessionLocal()
    try:
        yield session
    finally:
        await session.close()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for database session injection."""
    session: AsyncSession = SessionLocal()
    try:
        yield session
    finally:
        await session.close()




async def get_optional_db() -> AsyncGenerator[Optional[AsyncSession], None]:
    """
    FastAPI dependency that provides a database session or None if unavailable.
    Use this for endpoints that should work even without a database.
    """
    global SessionLocal
    if SessionLocal is None:
        yield None
        return

    session: Optional[AsyncSession] = None
    try:
        session = SessionLocal()
        yield session
    except Exception as e:
        logger.warning("database_session_failed", error=str(e))
        yield None
    finally:
        if session is not None:
            try:
                await session.close()
            except Exception:
                pass
