"""Notification controller layer."""

from __future__ import annotations

from ..schemas.notification import (
    EmailNotificationRequest,
    NotificationRead,
    PushNotificationRequest,
    SmsNotificationRequest,
)
from ..services.notification_service import NotificationService
from services.shared.security.authorization import Principal


class NotificationController:
    """Coordinate HTTP actions to the Notification Service."""

    def __init__(self, service: NotificationService) -> None:
        self._service = service

    async def send_push(self, payload: PushNotificationRequest) -> NotificationRead:
        notif = await self._service.send_push(payload)
        return NotificationRead.model_validate(notif)

    async def send_sms(self, payload: SmsNotificationRequest) -> NotificationRead:
        notif = await self._service.send_sms(payload)
        return NotificationRead.model_validate(notif)

    async def send_email(self, payload: EmailNotificationRequest) -> NotificationRead:
        notif = await self._service.send_email(payload)
        return NotificationRead.model_validate(notif)

    async def get_history(self, principal: Principal) -> list[NotificationRead]:
        history = await self._service.get_history(principal.user_id)
        return [NotificationRead.model_validate(n) for n in history]
