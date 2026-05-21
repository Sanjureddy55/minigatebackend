from django.contrib import admin

from .models import Society


@admin.register(Society)
class SocietyAdmin(admin.ModelAdmin):
    list_display = [
        "name", "city", "plan", "status",
        "admin_email", "total_flats", "created_at",
    ]
    list_filter = ["plan", "status", "city"]
    search_fields = ["name", "city", "admin_email"]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]
    autocomplete_fields = ["society_admin"]
    fieldsets = (
        ("Society Info", {
            "fields": ("name", "city", "total_flats"),
        }),
        ("Plan & Status", {
            "fields": ("plan", "status"),
        }),
        ("Administration", {
            "fields": ("admin_email", "society_admin"),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )
