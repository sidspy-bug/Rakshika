# System Architecture

Rakshika should follow a modular, service-oriented architecture with an API gateway in front of domain services and an event-driven backbone for emergency fan-out.

## Top-Level Layers

### Presentation Layer

- React Native mobile app
- Future admin dashboard

### API Layer

- API gateway
- Authentication and request routing
- Rate limiting and central policy enforcement

### Domain Services

- Auth service
- User service
- Emergency service
- Community service
- Location service
- Notification service
- Evidence service
- AI service

### Shared Infrastructure

- PostgreSQL
- Redis
- Supabase Storage
- Message broker or event bus
- Monitoring and logging stack

## Architectural Style

- Each service should own a single domain responsibility.
- Services should communicate asynchronously where possible.
- Emergency-critical flows should not depend on optional downstream services.

## Request Flow

1. The mobile app sends a request to the gateway.
2. The gateway validates and routes the request.
3. The owning service performs domain logic and persistence.
4. Related services react through events when needed.
5. The client receives a direct response only for the primary operation.

## Emergency Fan-Out Pattern

When SOS is triggered, the emergency service becomes the source of truth and publishes an event to other services. Notification, community, location, evidence, and AI workflows then react independently.

## Why This Architecture

- It isolates failure domains.
- It supports independent scaling.
- It fits a startup roadmap that can grow into enterprise usage.
- It allows frontend and backend work to proceed in parallel.

## Implementation Constraint

Critical workflows must remain simple, fast, and observable. Optional features such as AI or non-essential enrichments should never block SOS initiation.
