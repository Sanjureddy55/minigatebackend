from django.db import models
from django.utils.translation import gettext_lazy as _


class SupportTicket(models.Model):

    class Priority(models.TextChoices):
        HIGH   = "high",   _("High")
        MEDIUM = "medium", _("Medium")
        LOW    = "low",    _("Low")

    class Status(models.TextChoices):
        OPEN        = "open",        _("Open")
        IN_PROGRESS = "in_progress", _("In Progress")
        RESOLVED    = "resolved",    _("Resolved")
        CLOSED      = "closed",      _("Closed")

    class Category(models.TextChoices):
        UTILITIES   = "utilities",   _("Utilities")
        LIFT        = "lift",        _("Lift")
        DISPUTE     = "dispute",     _("Dispute")
        PARKING     = "parking",     _("Parking")
        INTERNET    = "internet",    _("Internet")
        HOUSEKEEPING= "housekeeping",_("Housekeeping")
        ELECTRICAL  = "electrical",  _("Electrical")
        PLUMBING    = "plumbing",    _("Plumbing")
        APP_ISSUE   = "app_issue",   _("App Issue")
        GENERAL     = "general",     _("General")
        OTHER       = "other",       _("Other")

    ticket_id    = models.CharField(max_length=20, unique=True, blank=True)
    society      = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="staff_support_tickets",
    )

    subject      = models.CharField(max_length=300)
    description  = models.TextField(blank=True, default="")
    category     = models.CharField(max_length=30, choices=Category.choices, default=Category.GENERAL)
    priority     = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    status       = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    # Resident info
    resident_name  = models.CharField(max_length=200, blank=True, default="")
    flat_number    = models.CharField(max_length=50, blank=True, default="")
    resident_phone = models.CharField(max_length=20, blank=True, default="")
    resident       = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="support_tickets_raised",
    )

    # Staff
    assigned_to = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="support_tickets_assigned",
    )
    created_by  = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="support_tickets_created",
    )

    # Timestamps
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    # Resolution
    resolution_notes = models.TextField(blank=True, default="")
    feedback         = models.TextField(blank=True, default="")
    rating           = models.PositiveSmallIntegerField(null=True, blank=True)
    time_taken       = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        app_label = "support_staff_assigned_tickets"
        ordering  = ["-created_at"]
        indexes   = [
            models.Index(fields=["society"],     name="sticket_society_idx"),
            models.Index(fields=["status"],      name="sticket_status_idx"),
            models.Index(fields=["assigned_to"], name="sticket_assign_idx"),
            models.Index(fields=["priority"],    name="sticket_priority_idx"),
        ]

    def save(self, *args, **kwargs):
        if not self.ticket_id:
            last = SupportTicket.objects.order_by("-id").first()
            next_num = (last.pk + 1) if last else 1
            self.ticket_id = f"TKT-{next_num:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ticket_id} | {self.subject} [{self.status}]"
