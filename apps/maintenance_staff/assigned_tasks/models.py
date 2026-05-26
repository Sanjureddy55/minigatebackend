from django.db import models
from django.utils.translation import gettext_lazy as _


class MaintenanceTask(models.Model):

    class Priority(models.TextChoices):
        HIGH   = "high",   _("High")
        MEDIUM = "medium", _("Medium")
        LOW    = "low",    _("Low")

    class Status(models.TextChoices):
        OPEN        = "open",        _("Open")
        IN_PROGRESS = "in_progress", _("In Progress")
        DONE        = "done",        _("Done")
        CLOSED      = "closed",      _("Closed")

    class Category(models.TextChoices):
        PLUMBING    = "plumbing",    _("Plumbing")
        ELECTRICAL  = "electrical",  _("Electrical")
        CIVIL       = "civil",       _("Civil")
        HVAC        = "hvac",        _("HVAC")
        LANDSCAPING = "landscaping", _("Landscaping")
        EQUIPMENT   = "equipment",   _("Equipment")
        MECHANICAL  = "mechanical",  _("Mechanical")
        PEST_CTRL   = "pest_ctrl",   _("Pest Control")
        GENERAL     = "general",     _("General")
        OTHER       = "other",       _("Other")

    task_id  = models.CharField(max_length=20, unique=True, blank=True)
    society  = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="maintenance_tasks",
    )

    title       = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    category    = models.CharField(max_length=30, choices=Category.choices, default=Category.GENERAL)
    location    = models.CharField(max_length=200, blank=True, default="")
    priority    = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    status      = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    assignee   = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="assigned_maintenance_tasks",
    )
    created_by = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="created_maintenance_tasks",
    )

    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)
    started_at       = models.DateTimeField(null=True, blank=True)
    completed_at     = models.DateTimeField(null=True, blank=True)

    resolution_notes = models.TextField(blank=True, default="")
    hours_logged     = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    rating           = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        app_label = "maintenance_staff_assigned_tasks"
        ordering  = ["-created_at"]
        indexes   = [
            models.Index(fields=["society"],  name="mtask_society_idx"),
            models.Index(fields=["status"],   name="mtask_status_idx"),
            models.Index(fields=["assignee"], name="mtask_assignee_idx"),
        ]

    def save(self, *args, **kwargs):
        if not self.task_id:
            last = MaintenanceTask.objects.order_by("-id").first()
            next_num = (last.pk + 1) if last else 1
            self.task_id = f"TSK-{next_num:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.task_id} | {self.title} [{self.status}]"
