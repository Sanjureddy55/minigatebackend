from django.contrib import admin

from .models import SocietyAuditLog


@admin.register(SocietyAuditLog)
class SocietyAuditLogAdmin(admin.ModelAdmin):
    list_display    = ["society", "actor_role", "actor_name", "action", "target", "action_type", "created_at"]
    list_filter     = ["action_type", "actor_role", "society"]
    search_fields   = ["actor_name", "action", "target"]
    readonly_fields = [f.name for f in SocietyAuditLog._meta.fields]
