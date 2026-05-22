from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class MaintenanceDue(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        PAID    = "paid",    _("Paid")
        OVERDUE = "overdue", _("Overdue")

    flat        = models.ForeignKey(
        "society_admin_flats.Flat",
        on_delete=models.CASCADE,
        related_name="maintenance_dues",
    )
    society     = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="maintenance_dues",
    )
    month       = models.DateField(help_text="First day of the billing month.")
    amount      = models.DecimalField(max_digits=10, decimal_places=2)
    status      = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    due_date    = models.DateField()
    paid_at     = models.DateTimeField(null=True, blank=True)
    description = models.CharField(max_length=255, blank=True, default="")
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label       = "resident_payments"
        ordering        = ["-month"]
        unique_together = [("flat", "month")]
        indexes         = [
            models.Index(fields=["flat"],    name="mdue_flat_idx"),
            models.Index(fields=["society"], name="mdue_society_idx"),
            models.Index(fields=["status"],  name="mdue_status_idx"),
        ]

    def __str__(self):
        return f"{self.flat} — {self.month.strftime('%b %Y')} [{self.get_status_display()}]"


class ResidentPayment(models.Model):
    class PaymentType(models.TextChoices):
        MAINTENANCE = "maintenance", _("Maintenance")
        FUNDRAISER  = "fundraiser",  _("Fundraiser Contribution")
        PENALTY     = "penalty",     _("Penalty")
        OTHER       = "other",       _("Other")

    class PaymentMethod(models.TextChoices):
        CASH          = "cash",          _("Cash")
        UPI           = "upi",           _("UPI")
        BANK_TRANSFER = "bank_transfer", _("Bank Transfer")
        CHEQUE        = "cheque",        _("Cheque")

    flat            = models.ForeignKey(
        "society_admin_flats.Flat",
        on_delete=models.CASCADE,
        related_name="payments",
    )
    resident        = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.CASCADE,
        related_name="payments",
    )
    society         = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="resident_payments",
    )
    maintenance_due = models.ForeignKey(
        MaintenanceDue,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="payments",
    )
    notice          = models.ForeignKey(
        "society_admin_notice_board.Notice",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="contributions",
        help_text="Populated for fundraiser contributions.",
    )
    payment_type    = models.CharField(max_length=20, choices=PaymentType.choices)
    payment_method  = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.UPI)
    amount          = models.DecimalField(max_digits=12, decimal_places=2)
    description     = models.CharField(max_length=255, blank=True, default="")
    payment_date    = models.DateField(default=timezone.localdate)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "resident_payments"
        ordering  = ["-created_at"]
        indexes   = [
            models.Index(fields=["flat"],         name="rpay_flat_idx"),
            models.Index(fields=["society"],      name="rpay_society_idx"),
            models.Index(fields=["payment_type"], name="rpay_type_idx"),
        ]

    def __str__(self):
        return f"{self.flat} — {self.get_payment_type_display()} Rs.{self.amount}"
