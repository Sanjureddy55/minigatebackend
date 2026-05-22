from django.contrib import admin

from .models import Notice, NoticeRead


@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display   = ["title", "category", "audience", "status", "society", "event_date", "created_at"]
    list_filter    = ["category", "audience", "status", "society"]
    search_fields  = ["title", "description"]
    ordering       = ["-created_at"]
    readonly_fields = ["raised_amount", "created_at", "updated_at"]
    fieldsets = (
        (None, {"fields": ("title", "description", "category", "status")}),
        ("Targeting", {"fields": ("society", "building", "audience")}),
        ("Schedule", {"fields": ("event_date",)}),
        ("Fundraiser", {"fields": ("contribution_per_flat", "target_amount", "raised_amount"), "classes": ("collapse",)}),
        ("Meta", {"fields": ("created_by", "created_at", "updated_at")}),
    )


@admin.register(NoticeRead)
class NoticeReadAdmin(admin.ModelAdmin):
    list_display  = ["notice", "resident", "read_at"]
    list_filter   = ["notice__category"]
    search_fields = ["notice__title", "resident__user__email"]
    ordering      = ["-read_at"]
