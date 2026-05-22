from django.contrib import admin

from .models import Complaint


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display  = ["title", "category", "priority", "status", "resident", "flat", "created_at"]
    list_filter   = ["category", "status", "priority"]
    search_fields = ["title", "description"]
    readonly_fields = ["resolved_at"]
