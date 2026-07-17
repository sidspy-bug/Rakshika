"""Notification service async database helpers."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from services.shared.config.settings import DatabaseSettings
from services.shared.database.connection import create_async_engine_from_settings, create_session_factory


@dataclass(slots=True)
class DatabaseBundle:
    """Database engine and session factory for the notification service."""

    engine: AsyncEngine
    session_factory: async_sessionmaker[AsyncSession]

    @classmethod
    def from_settings(cls, settings: DatabaseSettings) -> "DatabaseBundle":
        engine = create_async_engine_from_settings(settings)
        return cls(engine=engine, session_factory=create_session_factory(engine))

    @asynccontextmanager
    async def session(self) -> AsyncIterator[AsyncSession]:
        async with self.session_factory() as session:
            yield session

    async def dispose(self) -> None:
        await self.engine.dispose()
