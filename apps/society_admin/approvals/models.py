import logging

from django.db import models
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


class ApprovalRequest(models.Model):
    """
    Multi-stage approval request raised within a society.

    Progress tracks 0–100% completion. Stage tracks the workflow step.
    Status tracks the final decision (pending / approved / rejected).
    """

    @property
    def approval_number(self) -> str:
        return f"APR-{self.pk:04d}" if self.pk else "APR-????"

    class Status(models.TextChoices):
        PENDING   = "pending",   _("Pending")
        APPROVED  = "approved",  _("Approved")
        REJECTED  = "rejected",  _("Rejected")
        CANCELLED = "cancelled", _("Cancelled")

    class Priority(models.TextChoices):
        LOW    = "low",    _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH   = "high",   _("High")
        URGENT = "urgent", _("Urgent")

    class Category(models.TextChoices):
        VISITOR     = "visitor",     _("Visitor Entry")
        MAINTENANCE = "maintenance", _("Maintenance")
        MOVE_IN     = "move_in",     _("Move In")
        MOVE_OUT    = "move_out",    _("Move Out")
        EVENT       = "event",       _("Society Event")
        OTHER       = "other",       _("Other")

    class Stage(models.TextChoices):
        SUBMITTED    = "submitted",    _("Submitted")
        UNDER_REVIEW = "under_review", _("Under Review")
        APPROVED     = "approved",     _("Approved")
        REJECTED     = "rejected",     _("Rejected")
        COMPLETED    = "completed",    _("Completed")

    # ── Core Fields ───────────────────────────────────────────────────────────
    title       = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    category    = models.CharField(max_length=30, choices=Category.choices, default=Category.OTHER)
    priority    = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    stage       = models.CharField(max_length=30, choices=Stage.choices,    default=Stage.SUBMITTED)
    status      = models.CharField(max_length=20, choices=Status.choices,   default=Status.PENDING)
    progress    = models.PositiveSmallIntegerField(
        default=0, help_text="Completion percentage 0–100."
    )

    # ── Links ─────────────────────────────────────────────────────────────────
    society = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="approval_requests",
    )
    requester = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="submitted_approvals",
    )
    reviewer = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="reviewed_approvals",
    )
    visitor = models.OneToOneField(
        "society_admin_visitors.Visitor",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="approval",
        help_text="Set when this approval was auto-created from a visitor entry.",
    )

    # ── Review Outcome ────────────────────────────────────────────────────────
    reviewer_notes = models.TextField(blank=True, default="")
    reviewed_at    = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "society_admin_approvals"
        ordering  = ["-created_at"]
        indexes   = [
            models.Index(fields=["society"],  name="approval_society_idx"),
            models.Index(fields=["status"],   name="approval_status_idx"),
            models.Index(fields=["priority"], name="approval_priority_idx"),
            models.Index(fields=["stage"],    name="approval_stage_idx"),
        ]

    def __str__(self) -> str:
        return f"[{self.priority.upper()}] {self.title} — {self.status}"
