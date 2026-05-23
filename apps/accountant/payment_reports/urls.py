"""
Payment Reports URL Configuration
====================================
Base prefix: /api/accountant/payment-reports/

  GET  /              Full payment analytics report
                      (?months=12, ?year=YYYY, ?payment_type=, ?payment_method=)
  GET  /download-pdf/ Download analytics report as a formatted PDF
"""

from django.urls import path
from .views import PaymentReportsPDFView, PaymentReportsView

urlpatterns = [
    path("",              PaymentReportsView.as_view(),    name="accountant-payment-reports"),
    path("download-pdf/", PaymentReportsPDFView.as_view(), name="accountant-payment-reports-pdf"),
]
