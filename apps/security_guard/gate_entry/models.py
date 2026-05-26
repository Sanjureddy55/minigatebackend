from django.db import models
from django.utils.translation import gettext_lazy as _


class GateEntry(models.Model):
    class EntryType(models.TextChoices):
        VISITOR  = "visitor",  _("Visitor")
        DELIVERY = "delivery", _("Delivery")
        VEHICLE  = "vehicle",  _("Vehicle Only")
        STAFF    = "staff",    _("Staff")
        RESIDENT = "resident", _("Resident")
        OTHER    = "other",    _("Other")

    class Direction(models.TextChoices):
        IN  = "in",  _("Entry")
        OUT = "out", _("Exit")

    society        = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="gate_entries",
    )
    visitor_name   = models.CharField(max_length=200)
    mobile         = models.CharField(max_length=20, blank=True, default="")
    vehicle_number = models.CharField(max_length=20, blank=True, default="")
    entry_type     = models.CharField(max_length=20, choices=EntryType.choices, default=EntryType.VISITOR)
    direction      = models.CharField(max_length=5, choices=Direction.choices, default=Direction.IN)
    flat_number    = models.CharField(max_length=50, blank=True, default="", help_text="Destination / host flat")
    gate           = models.CharField(max_length=100, blank=True, default="", help_text="Gate where entry was processed, e.g. Gate 1 (Main)")
    purpose        = models.TextField(blank=True, default="")
    photo_url      = models.CharField(max_length=500, blank=True, default="")
    processed_by   = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="gate_entries_processed",
    )
    logged_at      = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "security_guard_gate_entry"
        ordering  = ["-logged_at"]
        indexes   = [
            models.Index(fields=["society"],    name="gentry_society_idx"),
            models.Index(fields=["entry_type"], name="gentry_type_idx"),
            models.Index(fields=["direction"],  name="gentry_dir_idx"),
            models.Index(fields=["logged_at"],  name="gentry_logged_idx"),
        ]

    def __str__(self):
        return f"{self.visitor_name} [{self.direction}] @ {self.logged_at:%Y-%m-%d %H:%M}"
