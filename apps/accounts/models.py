import logging
from django.utils import timezone
from django.db import models
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)

OTP_EXPIRY_MINUTES = 10
OTP_MAX_ATTEMPTS   = 5


class Country(models.Model):
    name       = models.CharField(max_length=100, unique=True)
    code       = models.CharField(max_length=3, unique=True, help_text="ISO 3166-1 alpha-2/3")
    phone_code = models.CharField(max_length=10, help_text="e.g. +91")
    is_active  = models.BooleanField(default=True)

    class Meta:
        app_label  = "accounts"
        ordering   = ["name"]
        verbose_name_plural = "Countries"

    def __str__(self) -> str:
        return f"{self.name} ({self.phone_code})"


class City(models.Model):
    country   = models.ForeignKey(Country, on_delete=models.CASCADE, related_name="cities")
    name      = models.CharField(max_length=100)
    state     = models.CharField(max_length=100, blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label       = "accounts"
        ordering        = ["name"]
        unique_together = [("country", "name")]

    def __str__(self) -> str:
        return f"{self.name}, {self.country.name}"


class OTPRecord(models.Model):
    """
    One row per OTP request. Expired and used records are kept for audit.

    Dev behaviour: OTP is always '123456'. In production, swap the
    generation logic in accounts.utils.generate_otp() for a real
    random 6-digit code and integrate an SMS gateway.
    """

    mobile      = models.CharField(max_length=20, db_index=True)
    otp_code    = models.CharField(max_length=10)
    is_verified = models.BooleanField(default=False)
    attempts    = models.PositiveSmallIntegerField(
        default=0,
        help_text="Number of failed verification attempts for this OTP.",
    )
    expires_at  = models.DateTimeField()
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "accounts"
        ordering  = ["-created_at"]

    def __str__(self) -> str:
        return f"OTP({self.mobile}) {'✓' if self.is_verified else '✗'}"

    @property
    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    @property
    def is_exhausted(self) -> bool:
        return self.attempts >= OTP_MAX_ATTEMPTS
