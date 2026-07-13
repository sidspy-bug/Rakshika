# API Architecture

Rakshika should use versioned REST APIs with a shared contract style so mobile and backend teams can work independently without constant integration ambiguity.

## API Principles

- Use clear resource-based endpoints.
- Keep naming consistent across services.
- Validate every request.
- Return predictable error shapes.
- Require authentication where data is sensitive.

## Versioning

- Use explicit version prefixes such as `/api/v1`.
- Avoid breaking changes inside a stable version.
- Introduce a new version only when contract changes are unavoidable.

## Contract Standards

- Define request and response schemas with strong typing.
- Include field validation and error messages.
- Keep success and failure responses consistent across endpoints.

## Security Expectations

- Enforce JWT authentication where needed.
- Apply RBAC on privileged operations.
- Limit access to sensitive emergency, evidence, and location data.

## Endpoint Design

- Use nouns for resources.
- Use HTTP methods according to intent.
- Support pagination for lists.
- Include idempotency where duplicate requests can cause harm.

## Error Handling

- Return actionable error codes.
- Avoid leaking internal implementation details.
- Distinguish validation failures from authorization failures and server failures.

## Documentation

- Every service endpoint should be documented.
- Request examples and response examples should be maintained.
- Authentication requirements should be explicit in the spec.
