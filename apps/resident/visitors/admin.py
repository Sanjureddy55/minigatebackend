from django.contrib import admin

from .models import GuestPass


@admin.register(GuestPass)
class GuestPassAdmin(admin.ModelAdmin):
    list_display    = ["full_name", "mobile", "visit_type", "visit_date", "pass_validity", "status", "flat"]
    list_filter     = ["visit_type", "status", "pass_validity"]
    search_fields   = ["full_name", "mobile", "vehicle_number", "qr_code"]
    readonly_fields = ["qr_code", "valid_until"]
