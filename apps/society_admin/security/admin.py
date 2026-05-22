from django.contrib import admin

from .models import Gate, SecurityAlert


@admin.register(Gate)
class GateAdmin(admin.ModelAdmin):
    list_display   = ("name", "society", "status", "updated_at")
    list_filter    = ("status", "society")
    search_fields  = ("name",)


@admin.register(SecurityAlert)
class SecurityAlertAdmin(admin.ModelAdmin):
    list_display   = ("get_alert_type_display", "society", "gate", "status", "triggered_at")
    list_filter    = ("alert_type", "status", "society")
    search_fields  = ("description", "gate")
    readonly_fields = ("triggered_at", "acknowledged_at", "resolved_at")
