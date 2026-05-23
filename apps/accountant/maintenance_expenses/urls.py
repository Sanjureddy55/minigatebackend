"""
Maintenance Expenses URL Configuration
========================================
Base prefix: /api/accountant/maintenance-expenses/

  GET    /                  List    (?category, ?is_published, ?search, ?year, ?month, ?ordering)
  POST   /                  Create  (title, category, amount, vendor_name, payment_mode,
                                     invoice_number, building_area, proof_url,
                                     expense_date, is_published, notes)
  GET    /summary/          Category breakdown + totals
  GET    /{id}/             Retrieve
  PATCH  /{id}/             Partial update
  DELETE /{id}/             Delete
  POST   /{id}/publish/     Publish to residents  (is_published → True)
  POST   /{id}/unpublish/   Move to Draft         (is_published → False)
  GET    /{id}/proof/       Download proof document
"""

from django.urls import path
from .views import MaintenanceExpensesViewSet

exp_list    = MaintenanceExpensesViewSet.as_view({"get": "list",     "post": "create"})
exp_detail  = MaintenanceExpensesViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"})
exp_summary = MaintenanceExpensesViewSet.as_view({"get": "summary"})
exp_pub     = MaintenanceExpensesViewSet.as_view({"post": "publish"})
exp_unpub   = MaintenanceExpensesViewSet.as_view({"post": "unpublish"})
exp_proof   = MaintenanceExpensesViewSet.as_view({"get": "proof"})

urlpatterns = [
    path("",                    exp_list,    name="accountant-mexp-list"),
    path("summary/",            exp_summary, name="accountant-mexp-summary"),
    path("<int:pk>/",           exp_detail,  name="accountant-mexp-detail"),
    path("<int:pk>/publish/",   exp_pub,     name="accountant-mexp-publish"),
    path("<int:pk>/unpublish/", exp_unpub,   name="accountant-mexp-unpublish"),
    path("<int:pk>/proof/",     exp_proof,   name="accountant-mexp-proof"),
]
