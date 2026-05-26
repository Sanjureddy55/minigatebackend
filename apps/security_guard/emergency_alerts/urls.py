from django.urls import path

from .views import EmergencyAlertViewSet

alert_list        = EmergencyAlertViewSet.as_view({"get": "list",    "post": "create"})
alert_detail      = EmergencyAlertViewSet.as_view({"get": "retrieve"})
alert_acknowledge = EmergencyAlertViewSet.as_view({"post": "acknowledge"})
alert_resolve     = EmergencyAlertViewSet.as_view({"post": "resolve"})
alert_stats       = EmergencyAlertViewSet.as_view({"get": "stats"})
alert_ack_all     = EmergencyAlertViewSet.as_view({"post": "acknowledge_all"})

urlpatterns = [
    path("",                       alert_list),
    path("stats/",                 alert_stats),
    path("acknowledge-all/",       alert_ack_all),
    path("<int:pk>/",              alert_detail),
    path("<int:pk>/acknowledge/",  alert_acknowledge),
    path("<int:pk>/resolve/",      alert_resolve),
]
