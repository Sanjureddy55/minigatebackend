from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display    = ["actor_name", "actor_role", "action", "target", "action_type", "created_at"]
    list_filter     = ["action_type", "actor_role"]
    search_fields   = ["actor_name", "action", "target"]
    readonly_fields = [f.name for f in AuditLog._meta.fields]
