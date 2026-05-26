from django.db import models
from django.utils.translation import gettext_lazy as _


class MaterialsRequest(models.Model):

    class Status(models.TextChoices):
        REQUESTED = "requested", _("Requested")
        APPROVED  = "approved",  _("Approved")
        REJECTED  = "rejected",  _("Rejected")
        ISSUED    = "issued",    _("Issued")

    task         = models.ForeignKey(
        "maintenance_staff_assigned_tasks.MaintenanceTask",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="materials_requests",
    )
    society      = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="materials_requests",
    )
    material_name = models.CharField(max_length=200)
    quantity      = models.CharField(max_length=50)
    reason        = models.TextField(blank=True, default="")
    status        = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)

    requested_by  = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="materials_requested",
    )
    approved_by   = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="materials_approved",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "maintenance_staff_materials_request"
        ordering  = ["-created_at"]
        indexes   = [
            models.Index(fields=["society"], name="matreq_society_idx"),
            models.Index(fields=["status"],  name="matreq_status_idx"),
        ]

    def __str__(self):
        return f"{self.material_name} x{self.quantity} [{self.status}]"
