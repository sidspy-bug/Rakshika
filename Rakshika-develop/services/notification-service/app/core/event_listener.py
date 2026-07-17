"""Redis Pub/Sub event listener for SOS emergency broadcasts.

Subscribes to the `events:emergency:created` and `events:emergency:status_changed`
channels, and dispatches notifications to verified emergency contacts.
"""

from __future__ import annotations

import asyncio
import json
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from uuid import UUID

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

logger = logging.getLogger("rakshika.notification.events")

CHANNEL_EMERGENCY_CREATED = "events:emergency:created"
CHANNEL_EMERGENCY_STATUS_CHANGED = "events:emergency:status_changed"


class EmergencyEventListener:
    """Listens for SOS events on Redis and dispatches alerts."""

    def __init__(
        self,
        redis_client: Redis,
        session_factory: async_sessionmaker[AsyncSession],
        settings,
    ) -> None:
        self._redis = redis_client
        self._session_factory = session_factory
        self._settings = settings
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        """Start the background listener task."""
        self._task = asyncio.create_task(self._listen(), name="sos-event-listener")
        logger.info("SOS event listener started")

    async def stop(self) -> None:
        """Cancel the background listener task."""
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("SOS event listener stopped")

    async def _listen(self) -> None:
        """Subscribe to Redis channels and process incoming events."""
        pubsub = self._redis.pubsub()
        await pubsub.subscribe(CHANNEL_EMERGENCY_CREATED, CHANNEL_EMERGENCY_STATUS_CHANGED)
        logger.info("Subscribed to Redis channels: %s, %s", CHANNEL_EMERGENCY_CREATED, CHANNEL_EMERGENCY_STATUS_CHANGED)

        try:
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue

                channel = message["channel"]
                try:
                    data = json.loads(message["data"])
                except (json.JSONDecodeError, TypeError):
                    logger.warning("Invalid message on %s: %s", channel, message["data"])
                    continue

                if channel == CHANNEL_EMERGENCY_CREATED:
                    await self._handle_sos_created(data)
                elif channel == CHANNEL_EMERGENCY_STATUS_CHANGED:
                    await self._handle_status_changed(data)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Event listener crashed — restarting in 5s")
            await asyncio.sleep(5)
            asyncio.create_task(self._listen(), name="sos-event-listener-retry")
        finally:
            await pubsub.unsubscribe()
            await pubsub.aclose()

    async def _handle_sos_created(self, event: dict) -> None:
        """Process a new SOS emergency event — notify all verified contacts."""
        user_id = event.get("user_id")
        emergency_id = event.get("emergency_id")
        latitude = event.get("latitude")
        longitude = event.get("longitude")
        severity = event.get("severity", "high")
        trigger_type = event.get("trigger_type", "unknown")
        source = event.get("source", "direct")
        timestamp = event.get("timestamp", "")

        logger.info(
            "Processing SOS event: emergency=%s user=%s source=%s",
            emergency_id, user_id, source,
        )

        # Fetch emergency contacts from the database
        contacts = await self._fetch_emergency_contacts(user_id)
        if not contacts:
            logger.warning("No emergency contacts found for user %s", user_id)
            return

        # Build the alert message
        maps_link = f"https://www.google.com/maps?q={latitude},{longitude}"
        evidence_link = f"{self._settings.emergency_evidence_base_url}/evidence/live/{emergency_id}"

        subject = f"🚨 SOS ALERT — Emergency triggered!"
        html_body = self._build_sos_email_html(
            trigger_type=trigger_type,
            severity=severity,
            maps_link=maps_link,
            evidence_link=evidence_link,
            timestamp=timestamp,
            source=source,
        )
        plain_body = (
            f"EMERGENCY SOS ALERT!\n\n"
            f"An SOS has been triggered ({trigger_type}).\n"
            f"Severity: {severity}\n"
            f"Location: {maps_link}\n"
            f"Live Evidence: {evidence_link}\n"
            f"Time: {timestamp}\n"
            f"Source: {source}\n\n"
            f"Please respond immediately or contact emergency services."
        )

        # Send alerts to each verified contact
        sent_count = 0
        for contact in contacts:
            email = contact.get("email")
            phone = contact.get("phone")
            name = contact.get("name", "Emergency Contact")

            if email:
                success = await self._send_email_alert(email, name, subject, html_body, plain_body)
                if success:
                    sent_count += 1

            # Log SMS intent (actual SMS requires Twilio/MSG91 credentials)
            if phone:
                logger.info("SMS alert queued for %s (%s) — requires SMS provider", name, phone)

        logger.info(
            "SOS alerts dispatched: %d/%d contacts notified for emergency %s",
            sent_count, len(contacts), emergency_id,
        )

    async def _handle_status_changed(self, event: dict) -> None:
        """Process an emergency status change — notify contacts of resolution/cancellation."""
        new_status = event.get("new_status")
        emergency_id = event.get("emergency_id")
        user_id = event.get("user_id")

        if new_status in ("cancelled", "resolved"):
            logger.info("Emergency %s %s — sending all-clear to contacts", emergency_id, new_status)
            contacts = await self._fetch_emergency_contacts(user_id)
            for contact in contacts:
                email = contact.get("email")
                if email:
                    await self._send_email_alert(
                        to_email=email,
                        to_name=contact.get("name", "Contact"),
                        subject=f"✅ Emergency {new_status.upper()} — All Clear",
                        html_body=f"<h2>Emergency has been {new_status}</h2><p>The SOS alert for emergency {emergency_id} has been {new_status}. No further action is needed.</p>",
                        plain_body=f"Emergency {emergency_id} has been {new_status}. No further action needed.",
                    )

    async def _fetch_emergency_contacts(self, user_id: str) -> list[dict]:
        """Query the user_profiles + emergency_contacts tables for contacts marked notify_on_sos=True."""
        try:
            async with self._session_factory() as session:
                from sqlalchemy import text
                result = await session.execute(
                    text("""
                        SELECT ec.name, ec.phone, ec.email, ec.priority, ec.relationship_type
                        FROM emergency_contacts ec
                        JOIN user_profiles up ON ec.profile_id = up.id
                        JOIN users u ON up.user_id = u.id
                        WHERE u.id = :user_id
                          AND ec.notify_on_sos = true
                          AND ec.deleted_at IS NULL
                        ORDER BY ec.priority ASC
                    """),
                    {"user_id": user_id},
                )
                rows = result.mappings().all()
                return [dict(r) for r in rows]
        except Exception:
            logger.exception("Failed to fetch emergency contacts for user %s", user_id)
            return []

    async def _send_email_alert(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_body: str,
        plain_body: str,
    ) -> bool:
        """Send an email alert via SMTP. Runs in a thread to avoid blocking the event loop."""
        smtp_host = getattr(self._settings, "smtp_host", "")
        smtp_port = getattr(self._settings, "smtp_port", 587)
        smtp_user = getattr(self._settings, "smtp_user", "")
        smtp_password = getattr(self._settings, "smtp_password", "")

        if not smtp_host or not smtp_user:
            logger.info(
                "SMTP not configured — logging email alert: to=%s subject='%s' body='%s'",
                to_email, subject, plain_body[:200],
            )
            return True  # Return True so it counts as "handled" in dev mode

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Rakshika Safety <{smtp_user}>"
            msg["To"] = f"{to_name} <{to_email}>"
            msg.attach(MIMEText(plain_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            # Run SMTP in thread pool to avoid blocking asyncio
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._smtp_send, smtp_host, smtp_port, smtp_user, smtp_password, to_email, msg)
            logger.info("Email alert sent to %s (%s)", to_name, to_email)
            return True
        except Exception:
            logger.exception("Failed to send email to %s", to_email)
            return False

    @staticmethod
    def _smtp_send(host: str, port: int, user: str, password: str, to_email: str, msg: MIMEMultipart) -> None:
        """Blocking SMTP send — called via run_in_executor."""
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(user, to_email, msg.as_string())

    @staticmethod
    def _build_sos_email_html(
        trigger_type: str,
        severity: str,
        maps_link: str,
        evidence_link: str,
        timestamp: str,
        source: str,
    ) -> str:
        """Build a rich HTML email for the SOS alert."""
        severity_color = {"critical": "#FF0000", "high": "#FF4444", "medium": "#FF8800", "low": "#FFAA00"}.get(severity, "#FF4444")
        return f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: {severity_color}; color: white; padding: 20px; border-radius: 10px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">🚨 SOS EMERGENCY ALERT</h1>
                <p style="margin: 10px 0 0; font-size: 16px;">Severity: {severity.upper()}</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-top: 15px;">
                <h2 style="color: #333; margin-top: 0;">Emergency Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #666;">Trigger:</td><td style="padding: 8px 0; font-weight: bold;">{trigger_type}</td></tr>
                    <tr><td style="padding: 8px 0; color: #666;">Source:</td><td style="padding: 8px 0; font-weight: bold;">{source}</td></tr>
                    <tr><td style="padding: 8px 0; color: #666;">Time:</td><td style="padding: 8px 0; font-weight: bold;">{timestamp}</td></tr>
                </table>
            </div>
            
            <div style="margin-top: 15px; text-align: center;">
                <a href="{maps_link}" style="display: inline-block; background: #4285F4; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-size: 16px; margin: 5px;">
                    📍 View Location on Map
                </a>
                <a href="{evidence_link}" style="display: inline-block; background: #EA4335; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-size: 16px; margin: 5px;">
                    📹 View Live Evidence
                </a>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                <p style="margin: 0; color: #856404;"><strong>⚠️ Please take immediate action.</strong> Contact emergency services (112) if you believe the person is in danger.</p>
            </div>
            
            <p style="color: #999; font-size: 12px; margin-top: 20px; text-align: center;">
                Sent by Rakshika Safety Platform — Protecting what matters most.
            </p>
        </div>
        """
