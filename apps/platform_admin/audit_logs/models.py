from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditLog(models.Model):
    class ActionType(models.TextChoices):
        CREATE  = "create",  _("Create")
        UPDATE  = "update",  _("Update")
        DELETE  = "delete",  _("Delete")
        APPROVE = "approve", _("Approve")
        SUSPEND = "suspend", _("Suspend")
        ACTIVATE = "activate", _("Activate")
        INVITE  = "invite",  _("Invite")
        SYSTEM  = "system",  _("System")

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="audit_logs",
    )
    actor_role = models.CharField(max_length=100, default="Super Admin")
    actor_name = models.CharField(max_length=255, default="System")

    action      = models.CharField(max_length=255)          # "created society"
    action_type = models.CharField(
        max_length=20,
        choices=ActionType.choices,
        default=ActionType.SYSTEM,
        db_index=True,
    )

    target    = models.CharField(max_length=500)            # "Greenwood Heights"
    target_type = models.CharField(max_length=100, blank=True)  # "society", "plan", …
    target_id   = models.CharField(max_length=100, blank=True)

    metadata  = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        app_label = "platform_admin_audit_logs"
        ordering  = ["-created_at"]
        verbose_name      = "Audit Log"
        verbose_name_plural = "Audit Logs"
        indexes = [
            models.Index(fields=["action_type"]),
            models.Index(fields=["actor"]),
        ]

    def __str__(self):
        return f"{self.actor_name} | {self.action} | {self.target}"
