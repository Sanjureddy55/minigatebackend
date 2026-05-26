from django.contrib import admin

from .models import DeliveryEntry


@admin.register(DeliveryEntry)
class DeliveryEntryAdmin(admin.ModelAdmin):
    list_display   = ("agent_name", "company", "delivery_type", "status", "flat_number_raw", "society", "arrived_at")
    list_filter    = ("delivery_type", "status", "society")
    search_fields  = ("agent_name", "agent_mobile", "company", "flat_number_raw")
    readonly_fields = ("arrived_at", "resolved_at", "collected_at", "otp_expires_at")
    ordering       = ("-arrived_at",)
