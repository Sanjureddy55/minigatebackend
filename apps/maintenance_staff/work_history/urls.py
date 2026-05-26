from django.urls import path
from .views import WorkHistoryView

urlpatterns = [
    path("", WorkHistoryView.as_view()),
]
