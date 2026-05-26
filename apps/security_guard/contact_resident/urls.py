from django.urls import path

from .views import ContactResidentDetailView, ContactResidentListView, ContactResidentStatsView

urlpatterns = [
    path("",                     ContactResidentListView.as_view()),
    path("stats/",               ContactResidentStatsView.as_view()),
    path("<uuid:flat_id>/",      ContactResidentDetailView.as_view()),
]
