"""Redis-backed request rate limiting."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException, Request, status
from redis.asyncio import Redis

from .config import GatewaySettings


@dataclass(slots=True)
class RateLimitResult:
    """Resolved rate limit state for a request."""

    allowed: bool
    current_count: int
    limit: int


class RedisRateLimiter:
    """Simple fixed-window rate limiter backed by Redis."""

    def __init__(self, settings: GatewaySettings, redis_client: Redis | None) -> None:
        self._settings = settings
        self._redis = redis_client

    async def enforce(self, request: Request) -> RateLimitResult:
        """Enforce the configured rate limit for the current request."""

        if not self._settings.rate_limit.enabled or self._redis is None:
            return RateLimitResult(allowed=True, current_count=0, limit=self._settings.rate_limit.requests)
        client_ip = request.client.host if request.client is not None else "unknown"
        key = f"{self._settings.rate_limit.redis_key_prefix}:{client_ip}:{request.url.path}"
        current_count = await self._redis.incr(key)
        if current_count == 1:
            await self._redis.expire(key, self._settings.rate_limit.window_seconds)
        if current_count > self._settings.rate_limit.requests:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")
        return RateLimitResult(allowed=True, current_count=current_count, limit=self._settings.rate_limit.requests)
