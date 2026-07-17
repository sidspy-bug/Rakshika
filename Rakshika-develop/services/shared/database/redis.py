"""Redis connection helpers."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field

from redis.asyncio import Redis

from ..config.settings import RedisSettings


@dataclass(slots=True)
class RedisManager:
    """Coordinates the Redis client lifecycle."""

    client: Redis
    close_on_exit: bool = True
    _closed: bool = field(default=False, init=False, repr=False)

    @classmethod
    def from_settings(cls, settings: RedisSettings) -> "RedisManager":
        """Create a manager from settings."""

        client = Redis.from_url(
            settings.url,
            socket_timeout=settings.socket_timeout_seconds,
            health_check_interval=settings.health_check_interval_seconds,
            decode_responses=settings.decode_responses,
        )
        return cls(client=client)

    @asynccontextmanager
    async def connection(self) -> AsyncIterator[Redis]:
        """Yield the Redis client and ensure shutdown when requested."""

        try:
            yield self.client
        finally:
            if self.close_on_exit and not self._closed:
                await self.close()

    async def close(self) -> None:
        """Close the Redis connection."""

        self._closed = True
        await self.client.aclose()
