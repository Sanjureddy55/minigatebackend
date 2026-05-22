from django.db import models

# Resident Maintenance Transparency has no models of its own.
# It provides a read-only resident view over:
#   - society_admin_maintenance_expenses.MaintenanceExpense (is_published=True)
#   - resident_payments.ResidentPayment (for "My Maintenance Paid")
#   - resident_payments.MaintenanceDue  (collected per society)
