from django.contrib import admin

from .models import GuardShift


@admin.register(GuardShift)
class GuardShiftAdmin(admin.ModelAdmin):
    list_display  = ("guard", "shift_date", "start_time", "end_time", "gate_assigned", "status", "society")
    list_filter   = ("status", "society", "shift_date")
    search_fields = ("guard__full_name", "gate_assigned")
    ordering      = ("-shift_date", "start_time")
