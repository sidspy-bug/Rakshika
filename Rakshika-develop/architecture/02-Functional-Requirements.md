# Functional Requirements

Rakshika must provide a complete emergency safety workflow that allows a user to trigger help quickly, notify relevant parties, preserve evidence, and coordinate response through community and platform services.

## Core Functional Areas

### Authentication and Access

- Allow secure signup and login.
- Support JWT-based sessions.
- Enforce role-based access for users, responders, and admins.

### User Management

- Store and update profile information.
- Manage emergency contacts.
- Store safety preferences and trusted settings.

### Emergency Activation

- Trigger SOS from the app.
- Support alternate trigger methods such as power button, shake, voice, and shortcuts where supported.
- Prevent duplicate emergency events from repeated triggers.

### Emergency Coordination

- Broadcast active emergencies to nearby responders.
- Notify emergency contacts and push notification channels.
- Track response status and emergency lifecycle.

### Live Location Tracking

- Capture and update GPS location during emergencies.
- Share live location with responders and authorized viewers.
- Preserve location history for emergency review.

### Evidence Capture

- Record audio, video, and relevant metadata during an emergency.
- Encrypt sensitive evidence before storage.
- Allow later review through a secure evidence vault.

### AI Assistance

- Provide guided safety assistance during emergencies.
- Generate incident summaries.
- Support risk analysis and safe route suggestions.

### Notifications

- Send push notifications for emergencies and status updates.
- Support fallback communication pathways when online delivery is unavailable.

### Community Response

- Identify nearby eligible responders.
- Allow responders to accept or ignore an emergency.
- Track responder engagement until resolution.

### Administration

- Allow admins to monitor incidents.
- Support moderation and user review.
- Provide operational and response analytics.

## Product Constraints

- The SOS flow must require minimal user interaction.
- The system must keep running even if non-critical services fail.
- The application must support future expansion without changing core workflows.

## Scope Boundary

These requirements describe what the product must do. Implementation details, API contracts, and storage design are covered in the later architecture documents.
