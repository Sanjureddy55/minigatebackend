from django.db import models
from django.utils.translation import gettext_lazy as _


class Complaint(models.Model):

    @property
    def complaint_number(self) -> str:
        """Human-readable ID: CMP-0042"""
        return f"CMP-{self.pk:04d}" if self.pk else "CMP-????"

    class Category(models.TextChoices):
        MAINTENANCE = "maintenance", _("Maintenance")
        SECURITY    = "security",    _("Security")
        NOISE       = "noise",       _("Noise")
        PARKING     = "parking",     _("Parking")
        CLEANLINESS = "cleanliness", _("Cleanliness")
        AMENITIES   = "amenities",   _("Amenities")
        OTHER       = "other",       _("Other")

    class Status(models.TextChoices):
        OPEN        = "open",        _("Open")
        IN_PROGRESS = "in_progress", _("In Progress")
        RESOLVED    = "resolved",    _("Resolved")
        CLOSED      = "closed",      _("Closed")

    class Priority(models.TextChoices):
        LOW    = "low",    _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH   = "high",   _("High")
        URGENT = "urgent", _("Urgent")

    resident         = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.CASCADE,
        related_name="complaints",
    )
    flat             = models.ForeignKey(
        "society_admin_flats.Flat",
        on_delete=models.CASCADE,
        related_name="complaints",
    )
    society          = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="resident_complaints",
    )
    title            = models.CharField(max_length=255)
    description      = models.TextField()
    category         = models.CharField(max_length=20, choices=Category.choices)
    priority         = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    status           = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    photo_url        = models.CharField(max_length=500, blank=True, default="")
    assigned_to      = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="assigned_complaints",
    )
    resolution_notes = models.TextField(blank=True, default="")
    resolved_at      = models.DateTimeField(null=True, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "resident_complaints"
        ordering  = ["-created_at"]
        indexes   = [
            models.Index(fields=["society"],  name="complaint_society_idx"),
            models.Index(fields=["status"],   name="complaint_status_idx"),
            models.Index(fields=["category"], name="complaint_category_idx"),
            models.Index(fields=["resident"], name="complaint_resident_idx"),
        ]

    def __str__(self):
        return f"[{self.get_status_display()}] {self.title}"
