from django.contrib import admin

from .models import ModulePermission, Role, UserProfile


class ModulePermissionInline(admin.TabularInline):
    model  = ModulePermission
    extra  = 0
    fields = ["module", "can_view", "can_create", "can_edit", "can_delete"]


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display   = ["name", "role_type", "is_active", "system_role", "created_at"]
    list_filter    = ["role_type", "is_active", "system_role"]
    search_fields  = ["name", "description"]
    readonly_fields = ["slug", "created_at", "updated_at"]
    inlines        = [ModulePermissionInline]
    fieldsets = [
        (None,          {"fields": ["name", "slug", "role_type", "description"]}),
        ("Status",      {"fields": ["is_active", "system_role"]}),
        ("Timestamps",  {"fields": ["created_at", "updated_at"], "classes": ["collapse"]}),
    ]

    def has_delete_permission(self, request, obj=None):
        if obj and obj.system_role:
            return False
        return super().has_delete_permission(request, obj)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display  = ["full_name", "mobile", "role", "status", "society", "created_at"]
    list_filter   = ["status", "role"]
    search_fields = ["full_name", "mobile", "user__email"]
    readonly_fields = ["created_at", "updated_at", "raw_password"]
    autocomplete_fields = ["role"]
    fieldsets = [
        ("Identity",    {"fields": ["user", "full_name", "mobile"]}),
        ("Role",        {"fields": ["role", "status", "description"]}),
        ("Society",     {"fields": ["society", "flat_number"]}),
        ("Timestamps",  {"fields": ["created_at", "updated_at"], "classes": ["collapse"]}),
    ]
