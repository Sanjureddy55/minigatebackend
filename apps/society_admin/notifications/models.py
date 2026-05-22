import logging

from django.db import models
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


class Notification(models.Model):
    """
    In-app notification bell entry.
    Created automatically when a Notice is published, or manually
    for system/admin messages. Each row targets one recipient.
    """

    class NotifType(models.TextChoices):
        NOTICE      = "notice",      _("Notice")
        EVENT       = "event",       _("Event")
        FUNDRAISER  = "fundraiser",  _("Fundraiser")
        MAINTENANCE = "maintenance", _("Maintenance Alert")
        SYSTEM      = "system",      _("System Message")
        PAYMENT     = "payment",     _("Payment Reminder")

    title      = models.CharField(max_length=255)
    body       = models.TextField(blank=True, default="")
    notif_type = models.CharField(max_length=20, choices=NotifType.choices, default=NotifType.SYSTEM)

    # ── Target recipient ──────────────────────────────────────────────────────
    recipient  = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    society    = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True, blank=True,
    )

    # ── Optional link back to a Notice ───────────────────────────────────────
    notice     = models.ForeignKey(
        "society_admin_notice_board.Notice",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="notifications",
    )

    is_read    = models.BooleanField(default=False)
    read_at    = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "society_admin_notifications"
        ordering  = ["-created_at"]
        indexes   = [
            models.Index(fields=["recipient"],  name="notif_recipient_idx"),
            models.Index(fields=["is_read"],    name="notif_read_idx"),
            models.Index(fields=["notif_type"], name="notif_type_idx"),
        ]

    def __str__(self) -> str:
        return f"[{self.notif_type}] {self.title} → {self.recipient}"
