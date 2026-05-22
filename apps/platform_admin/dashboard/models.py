from django.db import models
from django.utils.translation import gettext_lazy as _


class SupportTicket(models.Model):

    class Status(models.TextChoices):
        OPEN        = "open",        _("Open")
        IN_PROGRESS = "in_progress", _("In Progress")
        RESOLVED    = "resolved",    _("Resolved")
        CLOSED      = "closed",      _("Closed")

    class Category(models.TextChoices):
        TECHNICAL       = "technical",       _("Technical")
        BILLING         = "billing",         _("Billing")
        FEATURE_REQUEST = "feature_request", _("Feature Request")
        ACCOUNT         = "account",         _("Account")
        OTHER           = "other",           _("Other")

    society     = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="support_tickets",
    )
    raised_by   = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="raised_tickets",
    )
    title       = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    category    = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    status      = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "platform_admin_dashboard"
        ordering  = ["-created_at"]
        indexes   = [
            models.Index(fields=["society"], name="ticket_society_idx"),
            models.Index(fields=["status"],  name="ticket_status_idx"),
        ]

    def __str__(self):
        return f"[{self.get_status_display()}] {self.title}"


class PlatformPayment(models.Model):

    class PaymentType(models.TextChoices):
        SUBSCRIPTION = "subscription", _("Subscription")
        SETUP_FEE    = "setup_fee",    _("Setup Fee")
        ADDON        = "addon",        _("Addon")

    class Status(models.TextChoices):
        PAID    = "paid",    _("Paid")
        PENDING = "pending", _("Pending")
        FAILED  = "failed",  _("Failed")

    society      = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="platform_payments",
    )
    paid_by      = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="platform_payments",
    )
    payment_type = models.CharField(max_length=20, choices=PaymentType.choices)
    amount       = models.DecimalField(max_digits=10, decimal_places=2)
    status       = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    payment_date = models.DateField()
    description  = models.TextField(blank=True, default="")
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "platform_admin_dashboard"
        ordering  = ["-payment_date"]
        indexes   = [
            models.Index(fields=["society"],      name="platpay_society_idx"),
            models.Index(fields=["payment_date"], name="platpay_date_idx"),
            models.Index(fields=["status"],       name="platpay_status_idx"),
        ]

    def __str__(self):
        return f"{self.society} | {self.get_payment_type_display()} | ₹{self.amount}"
