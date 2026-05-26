from django.urls import path

from .views import ShiftListView, TodayShiftView

urlpatterns = [
    path("",       ShiftListView.as_view()),
    path("today/", TodayShiftView.as_view()),
]
