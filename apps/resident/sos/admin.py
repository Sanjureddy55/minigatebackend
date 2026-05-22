from django.contrib import admin

from .models import SOSAlert


@admin.register(SOSAlert)
class SOSAlertAdmin(admin.ModelAdmin):
    list_display    = ["resident", "flat", "society", "alert_type", "status", "triggered_at", "resolved_at"]
    list_filter     = ["alert_type", "status"]
    search_fields   = ["resident__full_name", "message", "location"]
    readonly_fields = ["triggered_at", "resolved_at"]
    ordering        = ["-triggered_at"]
