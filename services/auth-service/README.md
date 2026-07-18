# Auth Service

Production authentication service for Rakshika.

## Endpoints

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/profile`

The service also exposes compatibility aliases for `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, and `GET /me` without changing the documented API contract.

## Run

Start from the repository root so the shared namespace package resolves correctly:

```bash
uvicorn services.auth-service.app.main:app --reload
```

## Environment Variables

- `APP_ENV`
- `DATABASE__URL`
- `REDIS__URL`
- `JWT__SECRET_KEY`
- `JWT__ALGORITHM`
- `JWT__ACCESS_TOKEN_MINUTES`
- `JWT__REFRESH_TOKEN_DAYS`
- `AUTH__DEFAULT_ROLE_NAME`
- `AUTH__REQUIRE_EMAIL_VERIFICATION`
- `AUTH__OTP_LENGTH`
- `AUTH__OTP_TTL_SECONDS`
- `AUTH__MAX_SESSIONS_PER_USER`

