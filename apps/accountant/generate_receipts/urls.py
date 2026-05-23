"""
Generate Receipts URL Configuration
======================================
Base prefix: /api/accountant/generate-receipts/

  GET  /              List receipt-ready payments  (?month, ?flat, ?resident, ?payment_type, ?search)
  GET  /bulk-pdf/     Download all receipts as a single multi-page PDF
  GET  /bulk-csv/     Bulk CSV export of all receipts
  GET  /{id}/         JSON receipt detail
  GET  /{id}/pdf/     Download single formatted PDF receipt
"""

from django.urls import path
from .views import GenerateReceiptsViewSet

rcpt_list     = GenerateReceiptsViewSet.as_view({"get": "list"})
rcpt_detail   = GenerateReceiptsViewSet.as_view({"get": "retrieve"})
rcpt_pdf      = GenerateReceiptsViewSet.as_view({"get": "pdf"})
rcpt_bulk_pdf = GenerateReceiptsViewSet.as_view({"get": "bulk_pdf"})
rcpt_bulk_csv = GenerateReceiptsViewSet.as_view({"get": "bulk_csv"})

urlpatterns = [
    path("",              rcpt_list,     name="accountant-receipts-list"),
    path("bulk-pdf/",     rcpt_bulk_pdf, name="accountant-receipts-bulk-pdf"),
    path("bulk-csv/",     rcpt_bulk_csv, name="accountant-receipts-bulk-csv"),
    path("<int:pk>/",     rcpt_detail,   name="accountant-receipts-detail"),
    path("<int:pk>/pdf/", rcpt_pdf,      name="accountant-receipts-pdf"),
]
