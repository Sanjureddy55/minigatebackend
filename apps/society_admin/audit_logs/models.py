from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class SocietyAuditLog(models.Model):
    """
    Immutable action record scoped to a single society.
    Auto-created by log_society_action() whenever a meaningful event
    happens inside the society (approval, visitor check-in, complaint, etc.).
    """

    class ActionType(models.TextChoices):
        APPROVE      = "approve",      _("Approve")
        REJECT       = "reject",       _("Reject")
        CHECK_IN     = "check_in",     _("Check In")
        CHECK_OUT    = "check_out",    _("Check Out")
        COMPLAINT    = "complaint",    _("Complaint")
        RESOLVE      = "resolve",      _("Resolve")
        ASSIGN       = "assign",       _("Assign")
        PUBLISH      = "publish",      _("Publish")
        CREATE       = "create",       _("Create")
        UPDATE       = "update",       _("Update")
        DELETE       = "delete",       _("Delete")
        PAYMENT      = "payment",      _("Payment")
        SYSTEM       = "system",       _("System")

    society = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="society_audit_logs",
        db_index=True,
    )

    # Actor — who performed the action
    actor       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="society_audit_logs",
    )
    actor_role  = models.CharField(max_length=100, default="System")
    actor_name  = models.CharField(max_length=255, default="System")

    # What happened
    action      = models.CharField(max_length=255)           # "approved", "checked in"
    action_type = models.CharField(
        max_length=20, choices=ActionType.choices,
        default=ActionType.SYSTEM, db_index=True,
    )

    # What was acted on
    target      = models.CharField(max_length=500)           # "Tenant onboarding B-101"
    target_type = models.CharField(max_length=100, blank=True)  # "approval", "visitor", "complaint"
    target_id   = models.CharField(max_length=100, blank=True)

    metadata    = models.JSONField(default=dict, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        app_label   = "society_admin_audit_logs"
        ordering    = ["-created_at"]
        verbose_name        = "Society Audit Log"
        verbose_name_plural = "Society Audit Logs"
        indexes = [
            models.Index(fields=["society", "action_type"], name="saudit_soc_type_idx"),
            models.Index(fields=["society", "created_at"],  name="saudit_soc_time_idx"),
        ]

    def __str__(self):
        return f"{self.society.name} | {self.actor_name} | {self.action} | {self.target}"
