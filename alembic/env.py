import asyncio
from logging.config import fileConfig
import os
import sys

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Ensure workspace root is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import importlib.abc
import importlib.machinery

class ServiceSourceLoader(importlib.machinery.SourceFileLoader):
    def exec_module(self, module):
        module.__file__ = self.get_filename(module.__name__)
        super().exec_module(module)

class ServiceImportFinder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path, target=None):
        if fullname.startswith("services."):
            parts = fullname.split(".")
            if len(parts) > 1:
                service_name = parts[1]
                hyphenated_name = service_name.replace("_", "-")
                
                base_dir = os.path.dirname(os.path.dirname(__file__))
                services_path = os.path.join(base_dir, "services")
                service_dir = os.path.join(services_path, hyphenated_name)
                
                if os.path.isdir(service_dir):
                    sub_parts = parts[2:]
                    disk_path = os.path.join(service_dir, *sub_parts)
                    
                    init_py = os.path.join(disk_path, "__init__.py")
                    if os.path.isdir(disk_path):
                        is_package = True
                        origin = init_py if os.path.isfile(init_py) else disk_path
                    else:
                        is_package = False
                        origin = disk_path + ".py"
                        if not os.path.isfile(origin):
                            return None
                    
                    spec = importlib.machinery.ModuleSpec(
                        fullname,
                        ServiceSourceLoader(fullname, origin),
                        origin=origin
                    )
                    spec.submodule_search_locations = [disk_path] if is_package else None
                    return spec
        return None

sys.meta_path.insert(0, ServiceImportFinder())

from services.shared.config.settings import get_settings
from services.shared.database.base import Base

# Import all models to register them on Base.metadata
from services.auth_service.app.api.v1.models.auth import Role as AuthRole, User as AuthUser, Device, Session, RefreshToken, AuditLog
from services.user_service.app.api.v1.models.user import UserProfile, EmergencyContact, UserPreference
from services.emergency_service.app.api.v1.models.emergency import Emergency, EmergencyStatusHistory, EmergencyResponse
from services.community_service.app.api.v1.models.community import CommunityMember, EmergencyBroadcast, ResponderAction
from services.location_service.app.api.v1.models.location import LocationUpdate, SafeRoute
from services.notification_service.app.api.v1.models.notification import Notification
from services.evidence_service.app.api.v1.models.evidence import Evidence

config = context.config

# Dynamic override URL from shared environment settings
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database.url or "postgresql+asyncpg://postgres:postgres@localhost:5432/rakshika")

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
