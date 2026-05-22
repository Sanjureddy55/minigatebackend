from django.db import models
from django.utils.translation import gettext_lazy as _


class Gate(models.Model):

    class Status(models.TextChoices):
        OPEN   = "open",   _("Open")
        CLOSED = "closed", _("Closed")

    society    = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="gates",
    )
    name       = models.CharField(max_length=100, help_text="e.g. Gate 1 (Main), Gate 2 (Service)")
    status     = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "society_admin_security"
        ordering  = ["name"]
        indexes   = [models.Index(fields=["society"], name="gate_society_idx")]

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


class SecurityAlert(models.Model):

    class AlertType(models.TextChoices):
        UNAUTHORIZED_VEHICLE = "unauthorized_vehicle", _("Unauthorized Vehicle")
        TAILGATING           = "tailgating",           _("Tailgating Detected")
        CAMERA_OFFLINE       = "camera_offline",       _("Camera Offline")
        INTRUSION            = "intrusion",            _("Intrusion Attempt")
        EMERGENCY            = "emergency",            _("Emergency")
        OTHER                = "other",                _("Other")

    class Status(models.TextChoices):
        ACTIVE       = "active",       _("Active")
        ACKNOWLEDGED = "acknowledged", _("Acknowledged")
        RESOLVED     = "resolved",     _("Resolved")

    society         = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="security_alerts",
    )
    alert_type      = models.CharField(max_length=30, choices=AlertType.choices)
    description     = models.TextField(blank=True, default="")
    gate            = models.CharField(max_length=100, blank=True, default="",
                                       help_text="Gate where the alert was raised.")
    status          = models.CharField(max_length=15, choices=Status.choices, default=Status.ACTIVE)
    triggered_at    = models.DateTimeField(auto_now_add=True)
    acknowledged_by = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="acknowledged_alerts",
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_at     = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = "society_admin_security"
        ordering  = ["-triggered_at"]
        indexes   = [
            models.Index(fields=["society"],     name="alert_society_idx"),
            models.Index(fields=["status"],      name="alert_status_idx"),
            models.Index(fields=["alert_type"],  name="alert_type_idx"),
        ]

    def __str__(self):
        return f"[{self.get_status_display()}] {self.get_alert_type_display()} — {self.gate or 'Unknown Gate'}"
