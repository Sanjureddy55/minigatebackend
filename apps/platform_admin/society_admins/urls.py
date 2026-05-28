from django.urls import path

from .views import (
    SocietyAdminApproveView,
    SocietyAdminDetailView,
    SocietyAdminInviteView,
    SocietyAdminListCreateView,
    SocietyAdminStatsView,
    SocietyAdminSuspendView,
)

urlpatterns = [
    path("",               SocietyAdminListCreateView.as_view(), name="society-admin-list"),
    path("stats/",         SocietyAdminStatsView.as_view(),      name="society-admin-stats"),
    path("invite/",        SocietyAdminInviteView.as_view(),     name="society-admin-invite"),
    path("<int:pk>/",      SocietyAdminDetailView.as_view(),     name="society-admin-detail"),
    path("<int:pk>/approve/", SocietyAdminApproveView.as_view(), name="society-admin-approve"),
    path("<int:pk>/suspend/", SocietyAdminSuspendView.as_view(), name="society-admin-suspend"),
]
