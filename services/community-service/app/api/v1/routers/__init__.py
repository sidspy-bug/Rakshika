"""Community routers package."""

from .community import router as community_router
from .health import router as health_router

__all__ = ["community_router", "health_router"]
