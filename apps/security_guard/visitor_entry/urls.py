from django.urls import path

from .views import GateLogView, RegisterVisitorView, VisitorSearchView

urlpatterns = [
    path("",          RegisterVisitorView.as_view()),
    path("gate-log/", GateLogView.as_view()),
    path("search/",   VisitorSearchView.as_view()),
]
