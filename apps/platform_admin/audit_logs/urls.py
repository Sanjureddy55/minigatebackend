from django.urls import path

from .views import AuditLogExportView, AuditLogListView, AuditLogSummaryView

urlpatterns = [
    path("",         AuditLogListView.as_view(),   name="audit-log-list"),
    path("summary/", AuditLogSummaryView.as_view(), name="audit-log-summary"),
    path("export/",  AuditLogExportView.as_view(), name="audit-log-export"),
]
