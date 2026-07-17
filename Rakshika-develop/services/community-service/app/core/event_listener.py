"""Redis Pub/Sub event listener for community responder broadcasts.

Subscribes to the `events:emergency:created` channel and triggers
the community service's broadcast logic to alert nearby responders.
"""

from __future__ import annotations

import asyncio
import json
import logging
from uuid import UUID

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

logger = logging.getLogger("rakshika.community.events")

CHANNEL_EMERGENCY_CREATED = "events:emergency:created"


class CommunityEventListener:
    """Listens for SOS events and broadcasts to nearby community responders."""

    def __init__(
        self,
        redis_client: Redis,
        session_factory: async_sessionmaker[AsyncSession],
        settings,
    ) -> None:
        self._redis = redis_client
        self._session_factory = session_factory
        self._settings = settings
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        """Start the background listener task."""
        self._task = asyncio.create_task(self._listen(), name="community-event-listener")
        logger.info("Community event listener started")

    async def stop(self) -> None:
        """Cancel the background listener task."""
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Community event listener stopped")

    async def _listen(self) -> None:
        """Subscribe to Redis channel and process SOS events."""
        pubsub = self._redis.pubsub()
        await pubsub.subscribe(CHANNEL_EMERGENCY_CREATED)
        logger.info("Subscribed to Redis channel: %s", CHANNEL_EMERGENCY_CREATED)

        try:
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue

                try:
                    data = json.loads(message["data"])
                except (json.JSONDecodeError, TypeError):
                    logger.warning("Invalid message: %s", message["data"])
                    continue

                await self._handle_sos_created(data)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Community event listener crashed — restarting in 5s")
            await asyncio.sleep(5)
            asyncio.create_task(self._listen(), name="community-event-listener-retry")
        finally:
            await pubsub.unsubscribe()
            await pubsub.aclose()

    async def _handle_sos_created(self, event: dict) -> None:
        """Find nearby responders and log a broadcast record."""
        import math

        emergency_id = event.get("emergency_id")
        latitude = event.get("latitude")
        longitude = event.get("longitude")
        severity = event.get("severity", "high")

        if latitude is None or longitude is None:
            logger.warning("SOS event missing coordinates: %s", emergency_id)
            return

        logger.info(
            "Processing SOS for nearby responders: emergency=%s lat=%s lng=%s",
            emergency_id, latitude, longitude,
        )

        default_radius = getattr(
            getattr(self._settings, "community", None),
            "default_radius_km",
            5.0,
        )

        # Find responders who have shared their location within the radius
        try:
            async with self._session_factory() as session:
                from sqlalchemy import text
                # Query community_members (responders who registered their location)
                result = await session.execute(
                    text("""
                        SELECT cm.user_id, cm.latitude, cm.longitude, cm.display_name
                        FROM community_members cm
                        WHERE cm.is_active = true
                          AND cm.deleted_at IS NULL
                    """),
                )
                rows = result.mappings().all()

                # Haversine filter
                nearby = []
                for row in rows:
                    dist = self._haversine(
                        float(latitude), float(longitude),
                        float(row["latitude"]), float(row["longitude"]),
                    )
                    if dist <= default_radius:
                        nearby.append({
                            "user_id": str(row["user_id"]),
                            "display_name": row.get("display_name", "Responder"),
                            "distance_km": round(dist, 2),
                        })

                logger.info(
                    "Found %d nearby responders within %.1f km for emergency %s",
                    len(nearby), default_radius, emergency_id,
                )

                # Log the broadcast (for audit trail)
                await session.execute(
                    text("""
                        INSERT INTO emergency_broadcasts (emergency_id, radius_km, recipients_count, created_at)
                        VALUES (:eid, :radius, :count, NOW())
                    """),
                    {"eid": emergency_id, "radius": default_radius, "count": len(nearby)},
                )
                await session.commit()

        except Exception:
            logger.exception("Failed to broadcast to community for emergency %s", emergency_id)

    @staticmethod
    def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Return distance between two coordinates in kilometers."""
        import math
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
