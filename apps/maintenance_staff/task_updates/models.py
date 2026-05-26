from django.db import models
from django.utils.translation import gettext_lazy as _


class TaskUpdate(models.Model):
    task       = models.ForeignKey(
        "maintenance_staff_assigned_tasks.MaintenanceTask",
        on_delete=models.CASCADE,
        related_name="updates",
    )
    update_note = models.TextField()
    status      = models.CharField(max_length=20, blank=True, default="")
    updated_by  = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="task_updates_made",
    )
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "maintenance_staff_task_updates"
        ordering  = ["-created_at"]

    def __str__(self):
        return f"Update for {self.task_id} @ {self.created_at:%Y-%m-%d %H:%M}"
