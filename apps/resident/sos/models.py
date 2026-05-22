from django.db import models
from django.utils.translation import gettext_lazy as _


class SOSAlert(models.Model):
    class AlertType(models.TextChoices):
        SECURITY = "security", _("Security Threat")
        MEDICAL  = "medical",  _("Medical Emergency")
        FIRE     = "fire",     _("Fire")
        OTHER    = "other",    _("Other Emergency")

    class Status(models.TextChoices):
        ACTIVE   = "active",   _("Active")
        RESOLVED = "resolved", _("Resolved")

    resident        = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.CASCADE,
        related_name="sos_alerts",
    )
    flat            = models.ForeignKey(
        "society_admin_flats.Flat",
        on_delete=models.CASCADE,
        related_name="sos_alerts",
    )
    society         = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="sos_alerts",
    )
    alert_type      = models.CharField(max_length=20, choices=AlertType.choices, default=AlertType.OTHER)
    message         = models.TextField(blank=True, default="")
    location        = models.CharField(max_length=255, blank=True, default="")
    status          = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    triggered_at    = models.DateTimeField(auto_now_add=True)
    resolved_at     = models.DateTimeField(null=True, blank=True)
    resolved_by     = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="resolved_alerts",
    )
    resolution_note = models.TextField(blank=True, default="")

    class Meta:
        app_label = "resident_sos"
        ordering  = ["-triggered_at"]
        indexes   = [
            models.Index(fields=["society"],     name="sos_society_idx"),
            models.Index(fields=["flat"],        name="sos_flat_idx"),
            models.Index(fields=["status"],      name="sos_status_idx"),
            models.Index(fields=["alert_type"],  name="sos_type_idx"),
        ]

    def __str__(self):
        return f"SOS[{self.get_alert_type_display()}] {self.resident} @ {self.flat} [{self.get_status_display()}]"
