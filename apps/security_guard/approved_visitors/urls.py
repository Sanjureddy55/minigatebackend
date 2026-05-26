from django.urls import path

from .views import (
    ApprovedVisitorCheckInView,
    ApprovedVisitorExportView,
    ApprovedVisitorKpiView,
    ApprovedVisitorListView,
)

urlpatterns = [
    path("",        ApprovedVisitorListView.as_view()),
    path("stats/",  ApprovedVisitorKpiView.as_view()),
    path("checkin/", ApprovedVisitorCheckInView.as_view()),
    path("export/",  ApprovedVisitorExportView.as_view()),
]
