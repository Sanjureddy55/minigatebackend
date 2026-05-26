from django.urls import path

from .views import EntryExitExportView, EntryExitLogView, GateEntryViewSet

entry_list    = GateEntryViewSet.as_view({"get": "list",    "post": "create"})
entry_detail  = GateEntryViewSet.as_view({"get": "retrieve"})
entry_summary = GateEntryViewSet.as_view({"get": "summary"})

urlpatterns = [
    path("",               entry_list),
    path("summary/",       entry_summary),
    path("log/",           EntryExitLogView.as_view()),
    path("log/export/",    EntryExitExportView.as_view()),
    path("<int:pk>/",      entry_detail),
]
