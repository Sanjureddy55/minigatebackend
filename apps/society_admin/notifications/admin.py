from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display   = ["title", "notif_type", "recipient", "society", "is_read", "created_at"]
    list_filter    = ["notif_type", "is_read", "society"]
    search_fields  = ["title", "body", "recipient__user__email"]
    ordering       = ["-created_at"]
    readonly_fields = ["read_at", "created_at"]
