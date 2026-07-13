"""Notification service business logic."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from ....core.config import NotificationServiceSettings
from ..models.notification import Notification
from ..repositories.notification_repository import NotificationRepository
from ..schemas.notification import EmailNotificationRequest, PushNotificationRequest, SmsNotificationRequest


@dataclass(slots=True)
class NotificationServiceDependencies:
    """Aggregated dependencies for the notification service."""

    session: AsyncSession
    settings: NotificationServiceSettings


class NotificationService:
    """Implement FCM push, SMS broadcast, and notifications history."""

    def __init__(self, dependencies: NotificationServiceDependencies) -> None:
        self._dependencies = dependencies
        self._repository = NotificationRepository(dependencies.session)
        self._settings = dependencies.settings

    async def send_push(self, request: PushNotificationRequest) -> Notification:
        """Send push notification using firebase-admin SDK."""
        import firebase_admin
        from firebase_admin import credentials, messaging

        status = "sent"
        if self._settings.firebase_credentials_path:
            try:
                if not firebase_admin._apps:
                    cred = credentials.Certificate(self._settings.firebase_credentials_path)
                    firebase_admin.initialize_app(cred)

                # Fetch target token from request data (usually loaded from User Service device registry)
                token = request.data.get("token") if request.data else None
                if token:
                    # Clean up data payload to ensure all values are strings
                    clean_data = {}
                    if request.data:
                        for k, v in request.data.items():
                            if k != "token":
                                clean_data[k] = str(v)

                    message = messaging.Message(
                        notification=messaging.Notification(
                            title=request.title,
                            body=request.body,
                        ),
                        data=clean_data if clean_data else None,
                        token=token,
                    )
                    messaging.send(message)
                    status = "sent"
                else:
                    status = "failed_no_token"
            except Exception as e:
                status = f"failed_error: {str(e)[:100]}"
        else:
            # Mock success if Firebase credentials are not provided (development mode fallback)
            status = "sent_mock"

        notif = await self._repository.log_notification(
            user_id=request.user_id,
            notification_type="push",
            title=request.title,
            body=request.body,
            status=status,
            data=request.data,
        )
        await self._repository.commit()
        return notif

    async def send_sms(self, request: SmsNotificationRequest) -> Notification:
        """Send SMS (Twilio/msg91 stub)."""

        # SMS REST dispatch here
        notif = await self._repository.log_notification(
            user_id=UUID("00000000-0000-0000-0000-000000000000"),  # System or target user UUID if lookup done
            notification_type="sms",
            title="SMS Dispatch",
            body=request.message,
            status="sent",
        )
        await self._repository.commit()
        return notif

    async def send_email(self, request: EmailNotificationRequest) -> Notification:
        """Send email (SMTP stub)."""

        notif = await self._repository.log_notification(
            user_id=UUID("00000000-0000-0000-0000-000000000000"),
            notification_type="email",
            title=request.subject,
            body=request.body,
            status="sent",
        )
        await self._repository.commit()
        return notif

    async def get_history(self, user_id: UUID) -> list[Notification]:
        """Return notification history logs for a user."""

        return await self._repository.list_notifications(user_id)
