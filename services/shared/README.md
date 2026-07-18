# Shared Package

This package provides the common runtime foundation used by every Rakshika
microservice.

## Included Modules

- `config` for environment loading and application settings
- `database` for async SQLAlchemy and Redis connection primitives
- `logging` for structured JSON logs and request context propagation
- `middleware` for correlation IDs, request timing, and security headers
- `security` for JWT handling, password hashing, and RBAC helpers
- `exceptions` for service-agnostic application errors and handlers
- `schemas` for base models, response envelopes, and pagination models
- `constants` for shared header, cookie, and pagination constants
- `dependencies` for reusable FastAPI dependencies
- `utils` for UUID, datetime, validation, and health helpers

## Environment Variables

- `APP_ENV`
- `APP_NAME`
- `API_PREFIX`
- `DATABASE__URL`
- `DATABASE__ECHO`
- `REDIS__URL`
- `JWT__SECRET_KEY`
- `JWT__ALGORITHM`
- `JWT__ACCESS_TOKEN_MINUTES`
- `JWT__REFRESH_TOKEN_DAYS`
- `SECURITY__CORS_ALLOWED_ORIGINS`
- `SECURITY__TRUSTED_HOSTS`
- `LOGGING__LEVEL`
- `LOGGING__JSON_LOGS`

## Usage

Import shared primitives from the package root or individual modules.

# Shared Package

Reusable shared modules for backend services.
