"""Emergency routers package."""

from .emergencies import router as emergencies_router
from .health import router as health_router

__all__ = ["emergencies_router", "health_router"]
