# Community Workflow

The community workflow is the defining feature of Rakshika. It connects a live emergency to nearby verified responders who can provide immediate human assistance.

## Workflow Goals

- Identify eligible nearby responders.
- Notify responders quickly.
- Allow responders to accept or decline.
- Track responder status during the emergency.

## Sequence

1. The emergency service publishes an active SOS event.
2. The community service identifies nearby responders in the allowed radius.
3. The notification layer alerts those responders.
4. A responder opens the alert and accepts or declines.
5. If accepted, the responder receives navigation and incident context.
6. The response status is tracked until resolution.

## Matching Rules

- Use proximity as the first filter.
- Prefer verified and eligible responders.
- Exclude users who should not receive the event.

## Safety Considerations

- Do not expose more location detail than necessary.
- Rate-limit broadcasts to avoid abuse.
- Keep responder actions auditable.

## Status Model

- Pending
- Broadcasted
- Accepted
- In Progress
- Resolved
- Declined or Expired

## Product Implication

This workflow should shape responder screens, notification behavior, ranking logic, and operational monitoring.
