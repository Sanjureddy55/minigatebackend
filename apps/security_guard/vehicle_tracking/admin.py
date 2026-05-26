from django.contrib import admin

from .models import VehicleLog


@admin.register(VehicleLog)
class VehicleLogAdmin(admin.ModelAdmin):
    list_display  = ("vehicle_number", "vehicle_type", "owner_name", "action", "society", "logged_at")
    list_filter   = ("vehicle_type", "action", "society")
    search_fields = ("vehicle_number", "owner_name")
    ordering      = ("-logged_at",)
