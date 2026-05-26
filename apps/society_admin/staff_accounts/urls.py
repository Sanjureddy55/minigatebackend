from django.urls import path

from .views import StaffAccountViewSet

account_list   = StaffAccountViewSet.as_view({"get": "list",         "post": "create"})
account_detail = StaffAccountViewSet.as_view({"get": "retrieve",     "patch": "partial_update"})
deactivate     = StaffAccountViewSet.as_view({"post": "deactivate"})
reactivate     = StaffAccountViewSet.as_view({"post": "reactivate"})
roles_list     = StaffAccountViewSet.as_view({"get": "roles"})
kpi_view       = StaffAccountViewSet.as_view({"get": "kpi"})

urlpatterns = [
    path("",                     account_list),
    path("roles/",               roles_list),
    path("kpi/",                 kpi_view),
    path("<int:pk>/",            account_detail),
    path("<int:pk>/deactivate/", deactivate),
    path("<int:pk>/reactivate/", reactivate),
]
