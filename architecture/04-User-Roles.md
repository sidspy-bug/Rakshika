# User Roles

Rakshika uses role-based access control so each participant only sees the actions and data required for their responsibility.

## Primary Roles

### 1. End User

The end user is the person protected by the platform.

Capabilities:

- Register and manage a personal profile.
- Trigger SOS and emergency shortcuts.
- Share live location during an emergency.
- Record and review evidence.
- Use AI guidance and incident support tools.
- View emergency history and safety preferences.

### 2. Community Responder

The community responder is a verified nearby user willing to provide immediate help.

Capabilities:

- Receive emergency broadcasts.
- View approximate emergency location.
- Accept or decline a response.
- Navigate toward the incident.
- Update response status.

### 3. Administrator

The administrator oversees platform health, moderation, and operational safety.

Capabilities:

- Monitor active and historical emergencies.
- Review suspicious or abusive activity.
- Manage users, responders, and platform rules.
- Inspect analytics and operational metrics.

## Role Boundaries

- End users must not access administrative controls.
- Responders should only access emergency data relevant to a live response.
- Admin access must be protected with stricter authorization and audit logging.

## Permission Model

- Read permissions should be separated from write permissions.
- Sensitive fields such as evidence, location history, and emergency logs should be protected.
- Role changes should be controlled and auditable.

## Authentication Relationship

Authentication identifies the user. Authorization determines what the user can do. A valid login does not automatically grant access to all data or actions.

## Product Implication

This role model should be reflected consistently in the mobile UI, API guards, service logic, and database access policies.
