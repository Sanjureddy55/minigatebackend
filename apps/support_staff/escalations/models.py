from django.db import models
from django.utils.translation import gettext_lazy as _


class Escalation(models.Model):

    class Status(models.TextChoices):
        OPEN     = "open",     _("Open")
        REVIEWED = "reviewed", _("Reviewed")
        RESOLVED = "resolved", _("Resolved")
        REJECTED = "rejected", _("Rejected")

    class EscalateTo(models.TextChoices):
        SOCIETY_ADMIN  = "society-admin",  _("Society Admin")
        SUPER_ADMIN    = "super-admin",    _("Super Admin / Platform Admin")

    ticket       = models.ForeignKey(
        "support_staff_assigned_tickets.SupportTicket",
        on_delete=models.CASCADE,
        related_name="escalations",
    )
    society      = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="escalations",
    )
    escalated_to_role = models.CharField(
        max_length=30, choices=EscalateTo.choices, default=EscalateTo.SOCIETY_ADMIN
    )
    reason       = models.TextField()
    status       = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    escalated_by = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="escalations_raised",
    )
    reviewed_by  = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="escalations_reviewed",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "support_staff_escalations"
        ordering  = ["-created_at"]
        indexes   = [
            models.Index(fields=["society"], name="escalation_society_idx"),
            models.Index(fields=["status"],  name="escalation_status_idx"),
        ]

    def __str__(self):
        return f"Escalation [{self.status}] for {self.ticket_id}"
