from django.urls import path
from .views import ExpenseTrackingViewSet

v = ExpenseTrackingViewSet

urlpatterns = [
    path("",                     v.as_view({"get": "list",     "post": "create"}),         name="accountant-expenses-list"),
    path("summary/",             v.as_view({"get": "summary"}),                            name="accountant-expenses-summary"),
    path("<int:pk>/",            v.as_view({"get": "retrieve", "patch": "partial_update",
                                            "delete": "destroy"}),                         name="accountant-expenses-detail"),
    path("<int:pk>/publish/",    v.as_view({"post": "publish"}),                           name="accountant-expenses-publish"),
    path("<int:pk>/unpublish/",  v.as_view({"post": "unpublish"}),                         name="accountant-expenses-unpublish"),
]
