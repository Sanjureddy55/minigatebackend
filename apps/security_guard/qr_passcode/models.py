from django.db import models
from django.utils.translation import gettext_lazy as _


class QRVerifyLog(models.Model):
    """Tracks every QR/passcode verification attempt at the gate."""

    society    = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="qr_verify_logs",
    )
    pass_code  = models.CharField(max_length=500)
    full_name  = models.CharField(max_length=200, blank=True, default="Unknown")
    is_valid   = models.BooleanField(default=False)
    verified_at = models.DateTimeField(auto_now_add=True)
    verified_by = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="qr_verify_logs",
    )

    class Meta:
        app_label = "security_guard_qr_passcode"
        ordering  = ["-verified_at"]
        indexes   = [
            models.Index(fields=["society", "verified_at"], name="qrvlog_soc_time_idx"),
        ]

    def __str__(self):
        return f"{self.pass_code} | {'✓' if self.is_valid else '✗'} | {self.full_name}"
