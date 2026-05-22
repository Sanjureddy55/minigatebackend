"""
Resident — Notices (read-only view of society_admin_notice_board)
Mount: /api/resident/notices/

┌──────────────────────────────────────────────────────────────────────────────┐
│ METHOD(S)    PATH                             DESCRIPTION                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ GET          notices/                         List active notices            │
│ GET          notices/{id}/                    Notice detail                  │
│ POST         notices/{id}/mark-read/          Mark notice as read            │
│ POST         notices/{id}/contribute/         Fundraiser contribution        │
└──────────────────────────────────────────────────────────────────────────────┘
"""
from django.urls import path

from .views import (
    ResidentFundraiserContributeView,
    ResidentNoticeDetailView,
    ResidentNoticeListView,
    ResidentNoticeMarkReadView,
)

urlpatterns = [
    path("",                          ResidentNoticeListView.as_view(),           name="resident-notice-list"),
    path("<int:pk>/",                 ResidentNoticeDetailView.as_view(),         name="resident-notice-detail"),
    path("<int:pk>/mark-read/",       ResidentNoticeMarkReadView.as_view(),       name="resident-notice-mark-read"),
    path("<int:pk>/contribute/",      ResidentFundraiserContributeView.as_view(), name="resident-fundraiser-contribute"),
]
