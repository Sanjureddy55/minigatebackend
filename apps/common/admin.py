from django.contrib import admin
from .models import AccessPass, AccessScanLog


@admin.register(AccessPass)
class AccessPassAdmin(admin.ModelAdmin):
    list_display  = ["passcode", "user_role", "visitor_name", "society", "status", "valid_from", "valid_until", "created_at"]
    list_filter   = ["status", "user_role"]
    search_fields = ["passcode", "visitor_name", "visitor_phone"]
    readonly_fields = ["passcode", "qr_code_value", "created_at", "updated_at"]


@admin.register(AccessScanLog)
class AccessScanLogAdmin(admin.ModelAdmin):
    list_display  = ["id", "scan_result", "gate", "scanned_by", "scanned_at"]
    list_filter   = ["scan_result"]
    search_fields = ["raw_qr_value", "gate"]
    readonly_fields = ["scanned_at"]
