from django.db import models
from django.utils.translation import gettext_lazy as _


class EmergencyAlert(models.Model):
    class AlertType(models.TextChoices):
        SOS      = "sos",      _("SOS / General Emergency")
        FIRE     = "fire",     _("Fire")
        MEDICAL  = "medical",  _("Medical Emergency")
        INTRUDER = "intruder", _("Intruder / Unauthorized Entry")
        THEFT    = "theft",    _("Theft / Vandalism")
        OTHER    = "other",    _("Other")

    class Status(models.TextChoices):
        ACTIVE       = "active",       _("Active")
        ACKNOWLEDGED = "acknowledged", _("Acknowledged")
        RESOLVED     = "resolved",     _("Resolved")

    society          = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="emergency_alerts",
    )
    alert_type       = models.CharField(max_length=20, choices=AlertType.choices, default=AlertType.OTHER)
    description      = models.TextField(blank=True, default="")
    location         = models.CharField(max_length=200, blank=True, default="")
    raised_by        = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="alerts_raised",
    )
    resolved_by      = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="alerts_resolved",
    )
    status           = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    resolution_notes = models.TextField(blank=True, default="")
    raised_at        = models.DateTimeField(auto_now_add=True)
    resolved_at      = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = "security_guard_emergency_alerts"
        ordering  = ["-raised_at"]
        indexes   = [
            models.Index(fields=["society"],    name="emgalert_society_idx"),
            models.Index(fields=["status"],     name="emgalert_status_idx"),
            models.Index(fields=["alert_type"], name="emgalert_type_idx"),
            models.Index(fields=["raised_at"],  name="emgalert_raised_idx"),
        ]

    def __str__(self):
        return f"{self.get_alert_type_display()} [{self.status}] @ {self.raised_at:%Y-%m-%d %H:%M}"
