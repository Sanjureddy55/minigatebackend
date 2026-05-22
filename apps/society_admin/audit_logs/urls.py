from django.urls import path

from .views import SocietyAuditLogExportView, SocietyAuditLogListView

urlpatterns = [
    path("",        SocietyAuditLogListView.as_view(),   name="society-audit-log-list"),
    path("export/", SocietyAuditLogExportView.as_view(), name="society-audit-log-export"),
]
