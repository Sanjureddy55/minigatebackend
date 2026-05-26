from django.contrib import admin

from .models import EmergencyAlert


@admin.register(EmergencyAlert)
class EmergencyAlertAdmin(admin.ModelAdmin):
    list_display  = ("alert_type", "status", "location", "raised_by", "society", "raised_at")
    list_filter   = ("alert_type", "status", "society")
    search_fields = ("description", "location")
    ordering      = ("-raised_at",)
