from django.apps import AppConfig


class PlatformAdminAuditLogsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.platform_admin.audit_logs'
    label = 'platform_admin_audit_logs'