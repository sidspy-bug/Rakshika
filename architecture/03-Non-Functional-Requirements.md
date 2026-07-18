# Non-Functional Requirements

Rakshika must meet strict non-functional standards because the product handles emergency situations where speed, reliability, and trust directly affect user safety.

## Performance

- SOS actions should feel immediate to the user.
- Read-heavy screens should use caching and pagination.
- Background processing should not block the core emergency flow.

## Availability and Reliability

- Critical emergency workflows must continue even if optional services fail.
- Non-critical features should degrade gracefully.
- The platform should tolerate retries and duplicate requests safely.

## Scalability

- The architecture must support growth from MVP to large-scale usage.
- Services should scale independently based on demand.
- Async work should be offloaded from request/response paths.

## Security

- Sensitive data must be protected with encryption in transit and at rest.
- Every request should be validated and authorized.
- Secrets must never be stored in the client or committed to source control.

## Observability

- The system should support logs, metrics, and audit trails.
- Emergency actions must be traceable end to end.
- Failures should be diagnosable without exposing private user data.

## Usability

- Emergency actions should require minimal user interaction.
- The UI must be accessible and easy to understand under stress.
- Navigation should remain simple and predictable.

## Maintainability

- Code should remain modular and reusable.
- Shared concerns should live in shared packages or services.
- Business rules must not be duplicated across layers.

## Offline and Degraded Modes

- The system should support partial offline operation where feasible.
- Communication should fall back to alternative channels when primary delivery is unavailable.
- Core state should remain consistent during recovery.

## Quality Bar

- The implementation should be production-oriented, not demo-oriented.
- Every feature should include validation, error handling, and test coverage.
- Design decisions should favor long-term evolution and safe change.
