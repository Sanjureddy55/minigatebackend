"""
Export Reports URL Configuration
===================================
Base prefix: /api/accountant/export-reports/

  GET  /payments/          CSV of all payments       (?month, ?year, ?building, ?flat)
  GET  /payments/pdf/      PDF of all payments
  GET  /payments/tally/    TallyPrime XML vouchers
  GET  /dues/              CSV of all dues           (?month, ?year, ?status, ?building, ?flat)
  GET  /dues/pdf/          PDF of all dues
  GET  /expenses/          CSV of maintenance expenses  (?month, ?year, ?is_published)
  GET  /expenses/pdf/      PDF of maintenance expenses
  GET  /statements/        CSV of monthly statements    (?year, ?is_published)
  GET  /statements/pdf/    PDF of monthly statements
"""

from django.urls import path
from .views import (
    ExportDuesPDFView,
    ExportDuesView,
    ExportExpensesPDFView,
    ExportExpensesView,
    ExportPaymentsPDFView,
    ExportPaymentsTallyView,
    ExportPaymentsView,
    ExportStatementsPDFView,
    ExportStatementsView,
)

urlpatterns = [
    path("payments/",        ExportPaymentsView.as_view(),       name="accountant-export-payments"),
    path("payments/pdf/",    ExportPaymentsPDFView.as_view(),    name="accountant-export-payments-pdf"),
    path("payments/tally/",  ExportPaymentsTallyView.as_view(),  name="accountant-export-payments-tally"),
    path("dues/",            ExportDuesView.as_view(),           name="accountant-export-dues"),
    path("dues/pdf/",        ExportDuesPDFView.as_view(),        name="accountant-export-dues-pdf"),
    path("expenses/",        ExportExpensesView.as_view(),       name="accountant-export-expenses"),
    path("expenses/pdf/",    ExportExpensesPDFView.as_view(),    name="accountant-export-expenses-pdf"),
    path("statements/",      ExportStatementsView.as_view(),     name="accountant-export-statements"),
    path("statements/pdf/",  ExportStatementsPDFView.as_view(),  name="accountant-export-statements-pdf"),
]
