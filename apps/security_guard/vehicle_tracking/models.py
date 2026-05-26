from django.db import models
from django.utils.translation import gettext_lazy as _


class VehicleLog(models.Model):
    class VehicleType(models.TextChoices):
        CAR        = "car",        _("Car")
        MOTORCYCLE = "motorcycle", _("Motorcycle")
        TRUCK      = "truck",      _("Truck")
        AUTO       = "auto",       _("Auto Rickshaw")
        BICYCLE    = "bicycle",    _("Bicycle")
        OTHER      = "other",      _("Other")

    class Action(models.TextChoices):
        IN  = "in",  _("Entry")
        OUT = "out", _("Exit")

    society        = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="vehicle_logs",
    )
    vehicle_number = models.CharField(max_length=20)
    vehicle_type   = models.CharField(max_length=20, choices=VehicleType.choices, default=VehicleType.CAR)
    owner_name     = models.CharField(max_length=200, blank=True, default="")
    flat           = models.ForeignKey(
        "society_admin_flats.Flat",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="vehicle_logs",
    )
    action         = models.CharField(max_length=5, choices=Action.choices, default=Action.IN)
    notes          = models.TextField(blank=True, default="")
    logged_by      = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="vehicle_logs_processed",
    )
    logged_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "security_guard_vehicle_tracking"
        ordering  = ["-logged_at"]
        indexes   = [
            models.Index(fields=["society"],        name="vlog_society_idx"),
            models.Index(fields=["vehicle_number"], name="vlog_number_idx"),
            models.Index(fields=["action"],         name="vlog_action_idx"),
            models.Index(fields=["logged_at"],      name="vlog_logged_idx"),
        ]

    def __str__(self):
        return f"{self.vehicle_number} [{self.action}] @ {self.logged_at:%Y-%m-%d %H:%M}"
