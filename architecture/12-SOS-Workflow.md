# SOS Workflow

The SOS workflow is the most critical flow in Rakshika. It must be fast, resilient, and designed to continue even when non-critical downstream services are unavailable.

## Workflow Goals

- Capture the emergency instantly.
- Avoid duplicate SOS creation.
- Notify the right services without blocking the user.
- Preserve evidence and location context.

## Sequence

1. The user triggers SOS.
2. The mobile app submits the event to the emergency service.
3. The emergency service validates the request and creates the emergency record.
4. The emergency service publishes an event to the message backbone.
5. Notification, community, location, evidence, and AI services react asynchronously.
6. The user sees confirmation and live status updates.

## Important Behaviors

- The SOS action should be idempotent.
- The emergency record should be durable before fan-out begins.
- Fan-out failures should not cancel the emergency itself.

## Data Captured

- User identity
- Timestamp
- Initial location
- Trigger source
- Emergency status
- Optional evidence metadata

## Failure Handling

- If push notifications fail, fallback channels should be attempted where possible.
- If a non-critical service is down, the emergency must still remain active.
- The system should preserve enough context for later recovery and review.

## Product Implication

This workflow should drive endpoint design, event schemas, mobile UI states, and background processing rules.
