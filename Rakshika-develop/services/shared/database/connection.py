"""Async SQLAlchemy connection helpers."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from ..config.settings import DatabaseSettings


def create_async_engine_from_settings(settings: DatabaseSettings) -> AsyncEngine:
    """Create an async SQLAlchemy engine from database settings."""

    return create_async_engine(
        settings.url,
        echo=settings.echo,
        pool_size=settings.pool_size,
        max_overflow=settings.max_overflow,
        pool_recycle=settings.pool_recycle_seconds,
        pool_pre_ping=True,
        future=True,
    )


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    """Create an async session factory for the supplied engine."""

    return async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False, autocommit=False)


@dataclass(slots=True)
class DatabaseManager:
    """Coordinates an async database engine and session factory."""

    engine: AsyncEngine
    session_factory: async_sessionmaker[AsyncSession] = field(repr=False)

    @classmethod
    def from_settings(cls, settings: DatabaseSettings) -> "DatabaseManager":
        """Build a manager from settings."""

        engine = create_async_engine_from_settings(settings)
        return cls(engine=engine, session_factory=create_session_factory(engine))

    @asynccontextmanager
    async def session(self) -> AsyncIterator[AsyncSession]:
        """Yield a database session and guarantee cleanup."""

        async with self.session_factory() as session:
            yield session

    async def dispose(self) -> None:
        """Dispose the underlying engine."""

        await self.engine.dispose()
