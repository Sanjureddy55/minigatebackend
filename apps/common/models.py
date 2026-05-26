import secrets
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class AccessPass(models.Model):
    class Status(models.TextChoices):
        ACTIVE  = "active",  _("Active")
        USED    = "used",    _("Used")
        EXPIRED = "expired", _("Expired")
        REVOKED = "revoked", _("Revoked")

    class UserRole(models.TextChoices):
        DELIVERY_PARTNER = "delivery-partner", _("Delivery Partner")
        GUEST_USER       = "guest-user",       _("Guest User")

    user         = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.CASCADE,
        related_name="access_passes",
    )
    society      = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="access_passes",
    )
    user_role    = models.CharField(max_length=30, choices=UserRole.choices)
    visitor_name = models.CharField(max_length=200, blank=True, default="")
    visitor_phone = models.CharField(max_length=20, blank=True, default="")
    host_resident_name = models.CharField(max_length=200, blank=True, default="")
    host_flat_number   = models.CharField(max_length=20, blank=True, default="")
    purpose      = models.CharField(max_length=300, blank=True, default="")
    passcode     = models.CharField(max_length=30, unique=True, db_index=True)
    qr_code_value = models.CharField(max_length=100, unique=True, db_index=True)
    valid_from   = models.DateTimeField(default=timezone.now)
    valid_until  = models.DateTimeField()
    status       = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    gate         = models.CharField(max_length=100, blank=True, default="")
    entry_confirmed_at = models.DateTimeField(null=True, blank=True)
    exit_confirmed_at  = models.DateTimeField(null=True, blank=True)
    scanned_by   = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="scanned_passes",
    )
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "common"
        ordering  = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.passcode:
            soc = self.society.name[:2].upper() if self.society_id else "GW"
            self.passcode = f"{soc}-{secrets.randbelow(9000)+1000}-{secrets.randbelow(9000)+1000}"
        if not self.qr_code_value:
            self.qr_code_value = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    @property
    def is_valid_now(self):
        now = timezone.now()
        return self.status == self.Status.ACTIVE and self.valid_from <= now <= self.valid_until

    def __str__(self):
        return f"{self.passcode} | {self.user_role} | {self.status}"


class AccessScanLog(models.Model):
    class ScanResult(models.TextChoices):
        SUCCESS = "success", _("Success")
        FAILED  = "failed",  _("Failed")

    access_pass    = models.ForeignKey(
        AccessPass, on_delete=models.CASCADE, related_name="scan_logs",
        null=True, blank=True
    )
    scanned_by     = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="scan_logs",
    )
    gate           = models.CharField(max_length=100, blank=True, default="")
    scan_result    = models.CharField(max_length=10, choices=ScanResult.choices)
    failure_reason = models.CharField(max_length=300, blank=True, default="")
    raw_qr_value   = models.CharField(max_length=200, blank=True, default="")
    scanned_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "common"
        ordering  = ["-scanned_at"]

    def __str__(self):
        return f"Scan {self.scan_result} at {self.gate} | {self.scanned_at}"
