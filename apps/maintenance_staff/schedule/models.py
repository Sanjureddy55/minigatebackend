from django.db import models
from django.utils.translation import gettext_lazy as _


class MaintenanceSchedule(models.Model):

    class Status(models.TextChoices):
        SCHEDULED  = "scheduled",  _("Scheduled")
        IN_PROGRESS = "in_progress", _("In Progress")
        COMPLETED  = "completed",  _("Completed")
        CANCELLED  = "cancelled",  _("Cancelled")

    society      = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="maintenance_schedules",
    )
    task         = models.ForeignKey(
        "maintenance_staff_assigned_tasks.MaintenanceTask",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="schedules",
    )
    assigned_to  = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="maintenance_schedules",
    )
    title          = models.CharField(max_length=300, blank=True, default="")
    location       = models.CharField(max_length=200, blank=True, default="")
    scheduled_date = models.DateField()
    start_time     = models.TimeField()
    end_time       = models.TimeField()
    status         = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    notes          = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "maintenance_staff_schedule"
        ordering  = ["scheduled_date", "start_time"]
        indexes   = [
            models.Index(fields=["society", "scheduled_date"], name="msched_soc_date_idx"),
            models.Index(fields=["assigned_to"],               name="msched_assign_idx"),
        ]

    def __str__(self):
        return f"{self.title or 'Schedule'} on {self.scheduled_date} [{self.status}]"
