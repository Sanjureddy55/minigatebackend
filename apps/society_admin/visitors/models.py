import logging

from django.db import models
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


class Visitor(models.Model):
    """
    Every person who enters or requests entry into a society gate.

    Lifecycle:  pending → approved/rejected → inside → exited
    """

    class Status(models.TextChoices):
        PENDING  = "pending",  _("Pending Approval")
        APPROVED = "approved", _("Approved")
        INSIDE   = "inside",   _("Inside")
        EXITED   = "exited",   _("Exited")
        REJECTED = "rejected", _("Rejected")

    class VisitType(models.TextChoices):
        GUEST    = "guest",    _("Guest")
        DELIVERY = "delivery", _("Delivery")
        CAB      = "cab",      _("Cab / Taxi")
        SERVICE  = "service",  _("Service / Maintenance")
        OTHER    = "other",    _("Other")

    # ── Visitor Identity ──────────────────────────────────────────────────────
    full_name      = models.CharField(max_length=200)
    mobile         = models.CharField(max_length=20)
    vehicle_number = models.CharField(max_length=20, blank=True, default="")
    photo_url      = models.CharField(
        max_length=500, blank=True, default="",
        help_text="URL or path to visitor photo (uploaded by frontend).",
    )

    # ── Visit Details ─────────────────────────────────────────────────────────
    visit_type = models.CharField(max_length=20, choices=VisitType.choices, default=VisitType.GUEST)
    purpose    = models.TextField(blank=True, default="")
    host_name  = models.CharField(max_length=200, blank=True, default="", help_text="Resident being visited.")

    # ── Links ─────────────────────────────────────────────────────────────────
    society = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="visitors",
    )
    flat = models.ForeignKey(
        "society_admin_flats.Flat",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="visitors",
    )

    # ── Status & Timestamps ───────────────────────────────────────────────────
    status          = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    checked_in_at   = models.DateTimeField(null=True, blank=True)
    checked_out_at  = models.DateTimeField(null=True, blank=True)

    # ── Approval Tracking ─────────────────────────────────────────────────────
    approved_by     = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="approved_visitors",
    )
    rejected_reason = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "society_admin_visitors"
        ordering  = ["-created_at"]
        indexes   = [
            models.Index(fields=["society"],    name="visitor_society_idx"),
            models.Index(fields=["status"],     name="visitor_status_idx"),
            models.Index(fields=["visit_type"], name="visitor_type_idx"),
            models.Index(fields=["created_at"], name="visitor_created_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.full_name} ({self.visit_type}) → {self.status}"
