"""
Resident — Monthly Statements URL Configuration
==================================================
Base prefix: /api/resident/monthly-statements/

  GET  /                     List published statements for resident's society
                             (?year=2026)
  GET  /{id}/                Statement detail  (published only)
  GET  /{id}/download-pdf/   Download PDF      (published only)
"""

from django.urls import path
from .views import ResidentStatementDetailView, ResidentStatementListView, ResidentStatementPDFView

urlpatterns = [
    path("",                       ResidentStatementListView.as_view(),   name="resident-stmt-list"),
    path("<int:pk>/",              ResidentStatementDetailView.as_view(), name="resident-stmt-detail"),
    path("<int:pk>/download-pdf/", ResidentStatementPDFView.as_view(),    name="resident-stmt-pdf"),
]
