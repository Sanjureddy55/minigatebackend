from django.contrib import admin

from .models import ApprovalRequest


@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display  = ["title", "category", "priority", "stage", "status", "society", "created_at"]
    list_filter   = ["status", "stage", "priority", "category", "society"]
    search_fields = ["title", "description", "requester__user__email"]
    ordering      = ["-created_at"]
    readonly_fields = ["reviewed_at", "created_at", "updated_at"]
