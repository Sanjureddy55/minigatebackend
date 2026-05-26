import random
from django.db import models
from django.utils.translation import gettext_lazy as _


class Delivery(models.Model):
    class Status(models.TextChoices):
        PENDING          = "pending",          _("Pending")
        OUT_FOR_DELIVERY = "out_for_delivery", _("Out for Delivery")
        DELIVERED        = "delivered",        _("Delivered")
        FAILED           = "failed",           _("Failed")
        RETURNED         = "returned",         _("Returned")

    delivery_id      = models.CharField(max_length=20, unique=True, db_index=True)
    item_name        = models.CharField(max_length=300)
    vendor_name      = models.CharField(max_length=200, blank=True, default="")
    tracking_number  = models.CharField(max_length=100, blank=True, default="")
    resident_name    = models.CharField(max_length=200)
    resident_phone   = models.CharField(max_length=20, blank=True, default="")
    flat_number      = models.CharField(max_length=20)
    society          = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="deliveries",
    )
    assigned_to      = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="assigned_deliveries",
    )
    status           = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    delivery_note    = models.CharField(max_length=500, blank=True, default="")
    failure_reason   = models.CharField(max_length=500, blank=True, default="")
    time_slot_start  = models.TimeField(null=True, blank=True)
    time_slot_end    = models.TimeField(null=True, blank=True)
    picked_up_at     = models.DateTimeField(null=True, blank=True)
    delivered_at     = models.DateTimeField(null=True, blank=True)
    failed_at        = models.DateTimeField(null=True, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "delivery_partner_delivery_requests"
        ordering  = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.delivery_id:
            self.delivery_id = f"DLV-{random.randint(4000, 9999)}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.delivery_id} | {self.item_name} | {self.status}"
