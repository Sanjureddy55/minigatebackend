from django.urls import path

from .views import MyHomeView

urlpatterns = [
    path("", MyHomeView.as_view(), name="resident-my-home"),
]
