from django.contrib import admin

from .models import PlatformPayment, SupportTicket


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display   = ("title", "society", "category", "status", "raised_by", "created_at")
    list_filter    = ("status", "category")
    search_fields  = ("title", "society__name", "raised_by__full_name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(PlatformPayment)
class PlatformPaymentAdmin(admin.ModelAdmin):
    list_display  = ("society", "payment_type", "amount", "status", "payment_date")
    list_filter   = ("status", "payment_type")
    search_fields = ("society__name",)
    readonly_fields = ("created_at",)
