import random
from datetime import timedelta

from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class DeliveryEntry(models.Model):
    """
    A delivery that arrives at the society gate.

    Lifecycle:
      PENDING → APPROVED (guard lets in after verbal / OTP confirmation)
      PENDING → REJECTED (resident refuses)
      PENDING → AT_GATE  (resident not home, package left at guard post)
      AT_GATE → COLLECTED (resident picks up later)
      AT_GATE → RETURNED  (uncollected, sent back to sender)
    """

    class DeliveryType(models.TextChoices):
        FOOD     = "food",     _("Food / Restaurant")
        PACKAGE  = "package",  _("Package / Parcel")
        COURIER  = "courier",  _("Courier / Express")
        GROCERY  = "grocery",  _("Grocery")
        MEDICINE = "medicine", _("Medicine / Pharmacy")
        FLOWERS  = "flowers",  _("Flowers / Gifts")
        OTHER    = "other",    _("Other")

    class Status(models.TextChoices):
        PENDING   = "pending",   _("Pending")
        APPROVED  = "approved",  _("Approved – Let In")
        REJECTED  = "rejected",  _("Rejected by Resident")
        AT_GATE   = "at_gate",   _("Left at Gate")
        COLLECTED = "collected", _("Collected by Resident")
        RETURNED  = "returned",  _("Returned to Sender")

    # ── Society / Flat ─────────────────────────────────────────────────────────
    society         = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="delivery_entries",
    )
    flat            = models.ForeignKey(
        "society_admin_flats.Flat",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="delivery_entries",
        help_text="Linked flat record (preferred over flat_number_raw).",
    )
    flat_number_raw = models.CharField(
        max_length=50, blank=True, default="",
        help_text="Free-text flat number when flat FK is unknown.",
    )

    class Vendor(models.TextChoices):
        AMAZON      = "amazon",      _("Amazon")
        FLIPKART    = "flipkart",    _("Flipkart")
        SWIGGY      = "swiggy",      _("Swiggy")
        ZOMATO      = "zomato",      _("Zomato")
        BIGBASKET   = "bigbasket",   _("BigBasket")
        BLINKIT     = "blinkit",     _("Blinkit")
        ZEPTO       = "zepto",       _("Zepto")
        MEESHO      = "meesho",      _("Meesho")
        MYNTRA      = "myntra",      _("Myntra")
        DUNZO       = "dunzo",       _("Dunzo")
        DTDC        = "dtdc",        _("DTDC Courier")
        BLUEDART    = "bluedart",    _("Blue Dart")
        DELHIVERY   = "delhivery",   _("Delhivery")
        INDIA_POST  = "india_post",  _("India Post")
        OTHER       = "other",       _("Other")

    # ── Delivery Agent ─────────────────────────────────────────────────────────
    agent_name      = models.CharField(max_length=200)
    agent_mobile    = models.CharField(max_length=20, blank=True, default="")
    company         = models.CharField(
        max_length=100, blank=True, default="",
        help_text="e.g. Amazon, Flipkart, Zomato, Swiggy",
    )
    vendor          = models.CharField(
        max_length=20, choices=Vendor.choices, default=Vendor.OTHER,
        help_text="Vendor / app for dropdown selection",
    )
    tracking_id     = models.CharField(
        max_length=100, blank=True, default="",
        help_text="Tracking number or order ID, e.g. AMZN-9876543",
    )
    recipient_name  = models.CharField(
        max_length=200, blank=True, default="",
        help_text="Resident name — person receiving the delivery",
    )
    delivery_type   = models.CharField(max_length=20, choices=DeliveryType.choices, default=DeliveryType.PACKAGE)
    package_desc    = models.TextField(blank=True, default="", help_text="Brief package description.")
    photo_url       = models.CharField(max_length=500, blank=True, default="")

    # ── Status & Resolution ────────────────────────────────────────────────────
    status           = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    rejection_reason = models.TextField(blank=True, default="")
    notes            = models.TextField(blank=True, default="")

    # ── OTP Verification ───────────────────────────────────────────────────────
    # Resident generates a 6-digit OTP in their app and shares it with the
    # delivery agent. The guard enters it here to approve the delivery.
    otp_code       = models.CharField(max_length=6, blank=True, default="")
    otp_verified   = models.BooleanField(default=False)
    otp_expires_at = models.DateTimeField(null=True, blank=True)

    # ── People ─────────────────────────────────────────────────────────────────
    processed_by = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name="deliveries_processed",
        help_text="Guard who registered the delivery.",
    )
    approved_by  = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name="deliveries_approved",
        help_text="Guard/resident who approved the delivery.",
    )
    collected_by = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name="deliveries_collected",
        help_text="Resident profile who collected the at-gate package.",
    )

    # ── Timestamps ─────────────────────────────────────────────────────────────
    arrived_at   = models.DateTimeField(auto_now_add=True)
    resolved_at  = models.DateTimeField(null=True, blank=True)
    collected_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = "security_guard_delivery_verify"
        ordering  = ["-arrived_at"]
        indexes   = [
            models.Index(fields=["society"],    name="deliv_society_idx"),
            models.Index(fields=["status"],     name="deliv_status_idx"),
            models.Index(fields=["arrived_at"], name="deliv_arrived_idx"),
            models.Index(fields=["flat"],       name="deliv_flat_idx"),
        ]

    # ── OTP helpers ────────────────────────────────────────────────────────────

    def generate_otp(self) -> str:
        """Generate a fresh 6-digit OTP, valid for 15 minutes."""
        self.otp_code       = f"{random.randint(0, 999999):06d}"
        self.otp_expires_at = timezone.now() + timedelta(minutes=15)
        self.otp_verified   = False
        self.save(update_fields=["otp_code", "otp_expires_at", "otp_verified"])
        return self.otp_code

    def verify_otp(self, code: str) -> tuple[bool, str]:
        """Check the code. Returns (is_valid, error_message)."""
        if not self.otp_code:
            return False, "No OTP has been generated for this delivery."
        if self.otp_verified:
            return False, "OTP has already been used."
        if self.otp_expires_at and timezone.now() > self.otp_expires_at:
            return False, "OTP has expired. Please ask the resident to generate a new one."
        if self.otp_code != code.strip():
            return False, "Incorrect OTP. Please check and try again."
        return True, ""

    def __str__(self):
        dest = self.flat.flat_number if self.flat else self.flat_number_raw
        return f"{self.agent_name} [{self.get_delivery_type_display()}] → {dest} [{self.get_status_display()}]"
