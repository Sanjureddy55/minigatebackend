from django.urls import path

from .views import (
    ComplaintReportView,
    OverviewReportView,
    RevenueReportView,
    SocietyGrowthReportView,
    UserGrowthReportView,
    VisitorReportView,
)

urlpatterns = [
    path("overview/",        OverviewReportView.as_view(),      name="report-overview"),
    path("society-growth/",  SocietyGrowthReportView.as_view(), name="report-society-growth"),
    path("user-growth/",     UserGrowthReportView.as_view(),    name="report-user-growth"),
    path("revenue/",         RevenueReportView.as_view(),       name="report-revenue"),
    path("complaints/",      ComplaintReportView.as_view(),     name="report-complaints"),
    path("visitors/",        VisitorReportView.as_view(),       name="report-visitors"),
]
