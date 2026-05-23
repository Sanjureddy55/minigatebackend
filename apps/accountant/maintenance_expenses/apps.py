from django.apps import AppConfig


class MaintenanceExpensesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name               = "apps.accountant.maintenance_expenses"
    label              = "accountant_maintenance_expenses"
