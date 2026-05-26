from django.urls import path

from .views import (
    DeliveryApproveView,
    DeliveryAtGateListView,
    DeliveryAtGateView,
    DeliveryCollectedView,
    DeliveryDetailView,
    DeliveryGenerateOTPView,
    DeliveryListCreateView,
    DeliveryPendingView,
    DeliveryRejectView,
    DeliveryReturnView,
    DeliverySummaryView,
    DeliveryVerifyOTPView,
)

urlpatterns = [
    # ── Collection views ────────────────────────────────────────────────────
    path("",          DeliveryListCreateView.as_view()),
    path("pending/",  DeliveryPendingView.as_view()),
    path("at-gate/",  DeliveryAtGateListView.as_view()),
    path("summary/",  DeliverySummaryView.as_view()),

    # ── Single delivery ──────────────────────────────────────────────────────
    path("<int:pk>/",              DeliveryDetailView.as_view()),
    path("<int:pk>/approve/",      DeliveryApproveView.as_view()),
    path("<int:pk>/generate-otp/", DeliveryGenerateOTPView.as_view()),
    path("<int:pk>/verify-otp/",   DeliveryVerifyOTPView.as_view()),
    path("<int:pk>/reject/",       DeliveryRejectView.as_view()),
    path("<int:pk>/at-gate/",      DeliveryAtGateView.as_view()),
    path("<int:pk>/collected/",    DeliveryCollectedView.as_view()),
    path("<int:pk>/return/",       DeliveryReturnView.as_view()),
]
