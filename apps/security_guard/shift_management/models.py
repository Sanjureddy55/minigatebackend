from django.db import models
from django.utils.translation import gettext_lazy as _


class GuardShift(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", _("Scheduled")
        ACTIVE    = "active",    _("Active / On Duty")
        COMPLETED = "completed", _("Completed")
        ABSENT    = "absent",    _("Absent")

    society       = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="guard_shifts",
    )
    guard         = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.CASCADE,
        related_name="guard_shifts",
    )
    shift_date    = models.DateField()
    start_time    = models.TimeField()
    end_time      = models.TimeField()
    gate_assigned = models.CharField(max_length=100, blank=True, default="Main Gate")
    status        = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    notes         = models.TextField(blank=True, default="")
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "security_guard_shift_management"
        ordering  = ["-shift_date", "start_time"]
        indexes   = [
            models.Index(fields=["society", "shift_date"], name="shift_soc_date_idx"),
            models.Index(fields=["guard"],                 name="shift_guard_idx"),
            models.Index(fields=["status"],                name="shift_status_idx"),
        ]

    def __str__(self):
        return f"{self.guard} | {self.shift_date} {self.start_time}–{self.end_time} [{self.status}]"
