from django.contrib import admin

from .models import StaffMember


@admin.register(StaffMember)
class StaffMemberAdmin(admin.ModelAdmin):
    list_display   = ("full_name", "society", "role", "shift", "status", "gate_assigned", "joined_date")
    list_filter    = ("role", "shift", "status", "society")
    search_fields  = ("full_name", "phone", "email", "gate_assigned")
    readonly_fields = ("created_at", "updated_at")
