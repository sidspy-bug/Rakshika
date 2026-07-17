# Rakshika MVP Implementation Summary

## Overview of Changes

To make the Rakshika MVP presentation-ready, the following major updates have been implemented across the microservices. These changes bridge the gap between the SOS trigger and the actual alerts being sent out.

### 1. Emergency Service (Redis Event Fan-Out)
- **What:** The emergency service now publishes JSON events to Redis (`events:emergency:created` and `events:emergency:status_changed`) whenever an SOS is triggered, relayed via mesh, or updated.
- **Why:** This implements the asynchronous fan-out mechanism described in the architecture. It ensures that the SOS trigger is non-blocking while other services instantly react.

### 2. Notification Service (Email Alerts)
- **What:** Added a background Redis event listener (`event_listener.py`) that subscribes to the SOS events.
- **How it works:** When an SOS triggers, it queries the database for emergency contacts marked with `notify_on_sos=True`. It then sends a rich HTML email to these contacts containing a Google Maps link (based on the SOS coordinates) and a link to the live evidence feed. It also sends "all clear" emails when the SOS is resolved or cancelled.
- **Config:** Uses SMTP for email delivery (configurable in environment variables).

### 3. AI Service (OpenRouter Integration)
- **What:** The AI service was previously using a stubbed Gemini API. It has now been completely rewired to use the **OpenRouter API** (specifically the `google/gemini-2.0-flash-001` model).
- **Features:** 
    - `get_safety_advice()`: Provides actionable safety advice using a custom "Rakshika AI" safety assistant persona.
    - `analyze_route_risk()`: Uses AI to assess the risk of a given location and time.
    - `summarize_incident()`: Generates concise, factual incident reports for review.

### 4. Community Service (Nearby Responder Broadcasts)
- **What:** Added a Redis event listener (`event_listener.py`) to subscribe to SOS events.
- **How it works:** When an SOS triggers, it uses the Haversine formula to find active community responders within a configured radius (default 5km) and logs a broadcast record to the database.

### 5. Evidence Service (Real File Storage & Live Feeds)
- **What:** Replaced dummy hashes with real `hashlib.sha256()` hashing. 
- **Storage:** Evidence files are now saved to local disk (`/tmp/rakshika_evidence/{emergency_id}/` for the MVP).
- **Live Feed:** Added `get_live_feed_url()` to generate the URL that is sent to emergency contacts so they can view the evidence securely.

### 6. Environment & Docker Setup
- **`.env.example`**: Created a template file documenting all required environment variables.
- **`docker-compose.yml`**: Updated to inject the necessary variables (`OPENROUTER_API_KEY`, `SMTP_*`, etc.) and ensure the Redis dependency is available to the relevant services.

---

## 🔑 Action Items for Contributor (Next Steps)

For full production functionality, please address the following:

1. **SMTP Credentials:** 
   To enable real email alerts to emergency contacts, add your SMTP details (e.g., Gmail App Password) to the `.env` file (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`).
   
2. **Firebase Push Notifications:** 
   The push notification system is currently stubbed. Please provide the `firebase-credentials.json` file and place it in `services/notification-service/app/`.

3. **Database Migrations:** 
   Ensure you run `alembic upgrade head` to verify all required tables exist before running the services.

4. **SMS Provider (Future):** 
   SMS alerts are currently just being logged. You will need to integrate a provider like Twilio or MSG91 in the `notification_service.py` to send real SMS texts.
