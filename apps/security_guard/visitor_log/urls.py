from django.urls import path

from .views import (
    VisitorApproveView,
    VisitorCheckInView,
    VisitorCheckOutView,
    VisitorLogListView,
    VisitorRejectView,
)

urlpatterns = [
    path("",                    VisitorLogListView.as_view()),
    path("<int:pk>/check-in/",  VisitorCheckInView.as_view()),
    path("<int:pk>/check-out/", VisitorCheckOutView.as_view()),
    path("<int:pk>/approve/",   VisitorApproveView.as_view()),
    path("<int:pk>/reject/",    VisitorRejectView.as_view()),
]
