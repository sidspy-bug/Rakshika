# Database Architecture

Rakshika should use PostgreSQL as the primary relational store, with data ownership aligned to service boundaries wherever practical.

## Database Principles

- Use UUIDs as primary keys.
- Include created and updated timestamps on important records.
- Use soft delete where historical traceability matters.
- Keep sensitive data access tightly controlled.

## Ownership Model

- Auth-related records belong to the auth service.
- User profile and contact data belong to the user service.
- Emergency lifecycle data belongs to the emergency service.
- Community response records belong to the community service.
- Evidence metadata and references belong to the evidence service.

## Data Design Rules

- Normalize data where it improves correctness and maintainability.
- Avoid duplicating source-of-truth fields across services.
- Use indexes for lookup-heavy fields such as user IDs, emergency IDs, status, and timestamps.
- Store immutable event history where traceability is important.

## Sensitive Data Handling

- Encrypt or protect evidence-related data.
- Treat location history as sensitive.
- Separate operational records from highly sensitive content where possible.

## Query and Performance Considerations

- Favor indexed lookups for emergency-critical paths.
- Use pagination for history and list endpoints.
- Avoid expensive joins across service boundaries.

## Growth Strategy

- Start with one well-structured PostgreSQL deployment.
- Preserve clear schema ownership so future service splitting stays manageable.
- Use Redis for caching and short-lived state rather than overloading the primary database.
