from django.contrib import admin

from .models import GateEntry


@admin.register(GateEntry)
class GateEntryAdmin(admin.ModelAdmin):
    list_display  = ("visitor_name", "entry_type", "direction", "flat_number", "society", "logged_at")
    list_filter   = ("entry_type", "direction", "society")
    search_fields = ("visitor_name", "mobile", "vehicle_number", "flat_number")
    ordering      = ("-logged_at",)
