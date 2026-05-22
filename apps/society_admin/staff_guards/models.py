from django.db import models
from django.utils.translation import gettext_lazy as _


class StaffMember(models.Model):

    class Role(models.TextChoices):
        SECURITY_GUARD = "security_guard", _("Security Guard")
        HOUSEKEEPING   = "housekeeping",   _("Housekeeping")
        MAINTENANCE    = "maintenance",    _("Maintenance")
        GARDENER       = "gardener",       _("Gardener")
        RECEPTIONIST   = "receptionist",  _("Receptionist")
        ELECTRICIAN    = "electrician",    _("Electrician")
        PLUMBER        = "plumber",        _("Plumber")
        OTHER          = "other",          _("Other")

    class Shift(models.TextChoices):
        MORNING = "morning",  _("Morning (06:00 – 14:00)")
        DAY     = "day",      _("Day (10:00 – 18:00)")
        EVENING = "evening",  _("Evening (14:00 – 22:00)")
        NIGHT   = "night",    _("Night (22:00 – 06:00)")

    class Status(models.TextChoices):
        ACTIVE   = "active",   _("Active")
        INACTIVE = "inactive", _("Inactive")
        ON_LEAVE = "on_leave", _("On Leave")

    society      = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="staff_members",
    )
    full_name    = models.CharField(max_length=200)
    phone        = models.CharField(max_length=20)
    email        = models.EmailField(blank=True, default="")
    role         = models.CharField(max_length=20, choices=Role.choices)
    shift        = models.CharField(max_length=10, choices=Shift.choices, default=Shift.DAY)
    status       = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    gate_assigned = models.CharField(max_length=100, blank=True, default="",
                                     help_text="Gate name / number (for guards).")
    joined_date  = models.DateField(null=True, blank=True)
    notes        = models.TextField(blank=True, default="")
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "society_admin_staff_guards"
        ordering  = ["role", "full_name"]
        indexes   = [
            models.Index(fields=["society"], name="staff_society_idx"),
            models.Index(fields=["role"],    name="staff_role_idx"),
            models.Index(fields=["status"],  name="staff_status_idx"),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.get_role_display()}) — {self.get_status_display()}"
