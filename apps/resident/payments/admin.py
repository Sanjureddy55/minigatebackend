from django.contrib import admin

from .models import MaintenanceDue, ResidentPayment


@admin.register(MaintenanceDue)
class MaintenanceDueAdmin(admin.ModelAdmin):
    list_display  = ["flat", "month", "amount", "status", "due_date", "paid_at"]
    list_filter   = ["status"]
    search_fields = ["flat__flat_number", "description"]


@admin.register(ResidentPayment)
class ResidentPaymentAdmin(admin.ModelAdmin):
    list_display  = ["flat", "resident", "payment_type", "amount", "payment_method", "payment_date"]
    list_filter   = ["payment_type", "payment_method"]
    search_fields = ["description", "flat__flat_number"]
