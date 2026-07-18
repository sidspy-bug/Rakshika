"""Notification routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ....core.dependencies import get_notification_service
from ..controllers.notification_controller import NotificationController
from ..schemas.notification import (
    EmailNotificationRequest,
    NotificationRead,
    PushNotificationRequest,
    SmsNotificationRequest,
)
from services.shared.dependencies import get_current_principal
from services.shared.security.authorization import Principal

router = APIRouter(tags=["Notifications"])


@router.post("/notifications/push", response_model=NotificationRead)
async def send_push(
    payload: PushNotificationRequest,
    service=Depends(get_notification_service),
) -> NotificationRead:
    controller = NotificationController(service)
    return await controller.send_push(payload)


@router.post("/notifications/sms", response_model=NotificationRead)
async def send_sms(
    payload: SmsNotificationRequest,
    service=Depends(get_notification_service),
) -> NotificationRead:
    controller = NotificationController(service)
    return await controller.send_sms(payload)


@router.post("/notifications/email", response_model=NotificationRead)
async def send_email(
    payload: EmailNotificationRequest,
    service=Depends(get_notification_service),
) -> NotificationRead:
    controller = NotificationController(service)
    return await controller.send_email(payload)


@router.get("/notifications/history", response_model=list[NotificationRead])
async def get_history(
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_notification_service),
) -> list[NotificationRead]:
    controller = NotificationController(service)
    return await controller.get_history(principal)
