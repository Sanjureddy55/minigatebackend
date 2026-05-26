from django.urls import path

from .views import VehicleLogViewSet

log_list    = VehicleLogViewSet.as_view({"get": "list",    "post": "create"})
log_detail  = VehicleLogViewSet.as_view({"get": "retrieve"})
log_summary = VehicleLogViewSet.as_view({"get": "summary"})

urlpatterns = [
    path("",          log_list),
    path("summary/",  log_summary),
    path("<int:pk>/", log_detail),
]
