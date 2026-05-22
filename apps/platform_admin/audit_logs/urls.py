from django.urls import path

from .views import AuditLogExportView, AuditLogListView

urlpatterns = [
    path("",        AuditLogListView.as_view(),   name="audit-log-list"),
    path("export/", AuditLogExportView.as_view(), name="audit-log-export"),
]
