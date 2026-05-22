from django.contrib import admin

from .models import Visitor


@admin.register(Visitor)
class VisitorAdmin(admin.ModelAdmin):
    list_display  = ["full_name", "mobile", "visit_type", "society", "status", "created_at"]
    list_filter   = ["status", "visit_type", "society"]
    search_fields = ["full_name", "mobile", "host_name", "vehicle_number"]
    ordering      = ["-created_at"]
    readonly_fields = ["checked_in_at", "checked_out_at", "created_at", "updated_at"]
