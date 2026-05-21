from django.apps import AppConfig


class MaintenanceStaffScheduleConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.maintenance_staff.schedule'
    label = 'maintenance_staff_schedule'