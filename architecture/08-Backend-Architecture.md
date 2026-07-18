# Backend Architecture

The backend should be organized as a set of FastAPI services with an API gateway in front of them and shared platform infrastructure supporting cross-cutting concerns.

## Service Boundaries

### Gateway

- Single entry point for client traffic.
- Handles routing, auth enforcement, throttling, and request tracing.

### Auth Service

- Login, signup, token issuance, and session-related workflows.

### User Service

- Profile, emergency contacts, preferences, and user-owned settings.

### Emergency Service

- SOS creation, lifecycle management, state transitions, and idempotency.

### Community Service

- Nearby responder discovery, broadcast, acceptance, and tracking.

### Location Service

- Live updates, history, geofencing, and route support.

### Notification Service

- Push, SMS, and fallback notification orchestration.

### Evidence Service

- Upload, encryption handling, metadata, and secure retrieval.

### AI Service

- Chat support, summaries, and risk analysis.

## Backend Design Rules

- Each service should own its domain logic.
- Shared helpers should remain lightweight and generic.
- Services should communicate through events when possible.
- Synchronous calls should be reserved for direct user-facing needs.

## Data Strategy

- Use UUIDs as primary keys.
- Keep service-owned schema boundaries clear.
- Store timestamps for lifecycle tracking.

## Implementation Standards

- Use Pydantic models for all request and response contracts.
- Keep business logic out of routers.
- Add validation, error handling, and tests for each endpoint.

## Scalability Guidance

- Scale emergency, community, and notification workloads independently.
- Offload heavy tasks to background workers.
- Keep the emergency path short and resilient.
