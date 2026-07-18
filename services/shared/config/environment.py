"""Environment loading helpers."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class EnvironmentSnapshot:
    """Snapshot of environment metadata."""

    name: str
    loaded_from: str | None


def load_env_file(path: str | Path, *, override: bool = False) -> dict[str, str]:
    """Load a .env-style file into process environment variables.

    The parser is intentionally small and dependency-free so it can be reused by
    every service without introducing a second environment-loading framework.
    """

    env_path = Path(path)
    if not env_path.exists():
        return {}

    loaded: dict[str, str] = {}
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line.removeprefix("export ").strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if override or key not in os.environ:
            os.environ[key] = value
        loaded[key] = value
    return loaded


def load_environment(default_name: str = "development", env_file: str | Path | None = None) -> EnvironmentSnapshot:
    """Resolve the current runtime environment and optionally load an env file."""

    loaded_from: str | None = None
    if env_file is not None:
        load_env_file(env_file)
        loaded_from = str(env_file)
    return EnvironmentSnapshot(name=os.getenv("APP_ENV", default_name), loaded_from=loaded_from)
