import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _


class GuestPass(models.Model):
    class VisitType(models.TextChoices):
        PERSONAL = "personal", _("Personal Visit")
        DELIVERY = "delivery", _("Delivery")
        CAB      = "cab",      _("Cab / Taxi")
        SERVICE  = "service",  _("Service / Maintenance")
        FAMILY   = "family",   _("Family")

    class PassValidity(models.TextChoices):
        ONE_HOUR          = "1h",  _("1 Hour")
        FOUR_HOURS        = "4h",  _("4 Hours")
        EIGHT_HOURS       = "8h",  _("8 Hours")
        TWENTY_FOUR_HOURS = "24h", _("24 Hours")

    class Status(models.TextChoices):
        ACTIVE    = "active",    _("Active")
        EXPIRED   = "expired",   _("Expired")
        USED      = "used",      _("Used")
        CANCELLED = "cancelled", _("Cancelled")

    flat            = models.ForeignKey(
        "society_admin_flats.Flat",
        on_delete=models.CASCADE,
        related_name="guest_passes",
    )
    created_by      = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="created_passes",
    )
    full_name       = models.CharField(max_length=200)
    mobile          = models.CharField(max_length=20, blank=True, default="")
    visit_type      = models.CharField(max_length=20, choices=VisitType.choices, default=VisitType.PERSONAL)
    visit_date      = models.DateField(null=True, blank=True)
    visit_time      = models.TimeField(null=True, blank=True)
    pass_validity   = models.CharField(max_length=5, choices=PassValidity.choices, default=PassValidity.ONE_HOUR)
    vehicle_number  = models.CharField(max_length=20, blank=True, default="")
    notes_for_guard = models.TextField(blank=True, default="")
    pass_code       = models.CharField(max_length=20, blank=True, default="",
                                       help_text="Human-readable pass code e.g. GW-7821-4403")
    qr_code         = models.CharField(max_length=500, blank=True, default="")
    status          = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    valid_until     = models.DateTimeField(null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "resident_visitors"
        ordering  = ["-created_at"]
        indexes   = [
            models.Index(fields=["flat"],       name="gpass_flat_idx"),
            models.Index(fields=["status"],     name="gpass_status_idx"),
            models.Index(fields=["visit_date"], name="gpass_date_idx"),
        ]

    def __str__(self):
        return f"{self.full_name} → {self.flat} [{self.get_status_display()}]"
