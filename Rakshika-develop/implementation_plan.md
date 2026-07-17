# Perfecting the SOS Workflow & Integrating Mesh Network

The goal of this phase is to make the SOS flow "perfect" by implementing the asynchronous fan-out mechanism described in the architecture. Currently, SOS triggers only save to the database. We will use **Redis Pub/Sub** (which is already in the tech stack) to instantly notify other microservices. 

Additionally, we need to fully integrate the new Bluetooth Mesh networking features you just pulled from the `develop` branch!

## User Review Required

> [!IMPORTANT]
> The architectural design specifies that the SOS service should not block while notifying other services. We will implement **Redis Pub/Sub** for this. The `emergency-service` will publish an event (`emergency.sos.triggered`), and the other services will listen. 

## Open Questions

> [!WARNING]
> Please provide your feedback on these decisions before we begin:
> 1. **Firebase Notifications**: The `notification-service` requires a `firebase-credentials.json` file. Should I stub the actual sending of the FCM push notification for now, or will you upload the real credentials file?
> 2. **Community Responders Search**: To find nearby responders, should I implement a simple Python-based Haversine distance calculation, or do you want to add the PostGIS extension to our PostgreSQL database for advanced geospatial queries? (Haversine is easier to set up, PostGIS scales better).
> 3. **AI Service**: Should we wire up the AI Service to this SOS event right now, or focus strictly on the life-saving real-time alerts (Community Responders and Push Notifications) first?

---

## Proposed Changes

### Emergency Service (The Publisher)

Update the business logic to broadcast when an SOS happens (both direct and via Mesh relay).

#### [MODIFY] [emergency_service.py](file:///Users/ritesh/Documents/Rakshika/Rakshika/services/emergency-service/app/api/v1/services/emergency_service.py)
- Inject a Redis client into `EmergencyService`.
- In `trigger_sos`, after saving to the DB, publish a JSON payload to the Redis channel `events:emergency:created`.
- Do the same in the newly added `relay_upload` (Mesh network SOS trigger).
- In `update_status` (cancel/resolve), publish to `events:emergency:status_changed`.

### Notification Service (The Consumer)

Build the listener that sends out push notifications and SMS fallbacks.

#### [MODIFY] [main.py](file:///Users/ritesh/Documents/Rakshika/Rakshika/services/notification-service/app/main.py)
- Create a background task that subscribes to the Redis `events:emergency:created` channel.
- Implement a worker function that receives the event and triggers FCM push notifications to the victim's emergency contacts.

### Community Service (The Consumer)

Build the listener that alerts nearby users.

#### [MODIFY] [main.py](file:///Users/ritesh/Documents/Rakshika/Rakshika/services/community-service/app/main.py)
- Create a background task subscribing to `events:emergency:created`.
- Implement logic to query the database for users within a 2km radius of the SOS coordinates.
- Publish a sub-event to alert those specific responders.

### Project Documentation

#### [MODIFY] [PROJECT_UNDERSTANDING.md](file:///Users/ritesh/Documents/Rakshika/Rakshika/PROJECT_UNDERSTANDING.md)
- Update the project knowledge document to document the massive Mesh Networking (`mobile/src/mesh`) feature that was just pulled from `develop`.

---

## Verification Plan

### Automated Tests
- Run `pytest` (once installed in the environment) to ensure the emergency service unit tests pass and that mock Redis calls are made correctly.

### Manual Verification
- We will start the `emergency-service` and `notification-service` using Docker Compose (or direct Python execution).
- We will trigger an SOS via an API request (simulating the app or a Mesh relay) and verify the logs of the `notification-service` to confirm it instantly caught the Redis event.
