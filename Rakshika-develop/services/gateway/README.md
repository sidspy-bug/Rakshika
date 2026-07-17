# Gateway Service

Rakshika API Gateway provides the versioned edge entrypoint for authenticated
microservice traffic.

## Responsibilities

- Validate JWTs for protected routes
- Forward requests to downstream services without business logic
- Apply request logging, trace propagation, and security headers
- Enforce request rate limits backed by Redis when configured
- Expose health and OpenAPI aggregation metadata endpoints

## Run

Start from the repository root so the `services` namespace package is importable:

```bash
uvicorn services.gateway.app.main:app --reload
```

## Environment Variables

- `APP_ENV`
- `GATEWAY__AUTH_SERVICE__BASE_URL`
- `GATEWAY__USER_SERVICE__BASE_URL`
- `GATEWAY__REQUEST_TIMEOUT_SECONDS`
- `GATEWAY__RATE_LIMIT__REQUESTS`
- `GATEWAY__RATE_LIMIT__WINDOW_SECONDS`
- `JWT__SECRET_KEY`
- `REDIS__URL`

