"""Shared foundation package for Rakshika microservices.

This package centralizes infrastructure-agnostic primitives that every service
imports for consistency: settings, database, Redis, logging, middleware,
security, exceptions, schemas, constants, and utilities.
"""

from __future__ import annotations

__all__ = ["__version__"]

__version__ = "0.1.0"
