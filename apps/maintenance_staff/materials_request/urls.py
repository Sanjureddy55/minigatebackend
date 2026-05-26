from django.urls import path
from .views import MaterialsRequestListCreateView, MaterialsRequestDetailView

urlpatterns = [
    path("",       MaterialsRequestListCreateView.as_view()),
    path("<int:pk>/", MaterialsRequestDetailView.as_view()),
]
