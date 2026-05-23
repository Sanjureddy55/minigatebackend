"""
Monthly Statements URL Configuration (Accountant)
====================================================
Base prefix: /api/accountant/monthly-statements/

  GET    /                         List  (?is_published, ?year, ?page)
  GET    /{id}/                    Statement detail
  POST   /generate/                Generate / re-generate draft
                                   Body: { year, month, opening_balance?, notes? }
  POST   /{id}/publish/            Publish to residents
  POST   /{id}/unpublish/          Retract
  POST   /{id}/upload-proof/       Upload proof files  (multipart, key=files, max 10)
  DELETE /{id}/delete-proof/       Remove proof  ?doc_id=<id>
  GET    /{id}/download-pdf/       Download PDF
  GET    /{id}/export-excel/       Download Excel (.xlsx)
"""

from django.urls import path
from .views import AccountantMonthlyStatementViewSet

vs = AccountantMonthlyStatementViewSet

urlpatterns = [
    path("",                               vs.as_view({"get": "list"}),                name="accountant-stmt-list"),
    path("generate/",                      vs.as_view({"post": "generate"}),           name="accountant-stmt-generate"),
    path("<int:pk>/",                      vs.as_view({"get": "retrieve"}),            name="accountant-stmt-detail"),
    path("<int:pk>/publish/",              vs.as_view({"post": "publish"}),            name="accountant-stmt-publish"),
    path("<int:pk>/unpublish/",            vs.as_view({"post": "unpublish"}),          name="accountant-stmt-unpublish"),
    path("<int:pk>/upload-proof/",         vs.as_view({"post": "upload_proof"}),       name="accountant-stmt-upload-proof"),
    path("<int:pk>/delete-proof/",         vs.as_view({"delete": "delete_proof"}),     name="accountant-stmt-delete-proof"),
    path("<int:pk>/download-pdf/",         vs.as_view({"get": "download_pdf"}),        name="accountant-stmt-download-pdf"),
    path("<int:pk>/export-excel/",         vs.as_view({"get": "export_excel"}),        name="accountant-stmt-export-excel"),
]
