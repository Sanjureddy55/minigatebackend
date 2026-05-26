from django.urls import path
from .views import TaskUpdateListCreateView

urlpatterns = [
    path("", TaskUpdateListCreateView.as_view()),
]
