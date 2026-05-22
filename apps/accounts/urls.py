"""
URL configuration for apps.accounts.

Mount point (config/urls.py):
    path("api/accounts/", include("apps.accounts.urls"))

┌─────────────────────────────────────────────────────────────────────────────┐
│  METHOD    PATH                                    DESCRIPTION              │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST      otp/send/                               Send OTP to mobile       │
│  POST      otp/verify/                             Verify OTP               │
│  GET       onboarding/countries/                   List countries           │
│  GET       onboarding/cities/?country=<id>         List cities (filtered)   │
│  GET       onboarding/societies/?city=<id>         List active societies    │
│  GET       onboarding/buildings/?society=<id>      List buildings           │
│  GET       onboarding/flats/?building=<uuid>       List flats               │
│  POST      onboarding/complete/                    Register + submit request│
│  GET       onboarding/approval-status/?mobile=<m>  Approval pending screen  │
│  GET       me/                                     Current user profile     │
│  GET       my-home/?mobile=<mobile>                Flat/building/society    │
│  POST      login/email/                            Email + password login   │
│  POST      login/mobile/                           Mobile OTP login         │
│  POST      token/refresh/                          Refresh access token     │
└─────────────────────────────────────────────────────────────────────────────┘
"""

from django.urls import path

from .views import (
    BuildingListView,
    CityListView,
    CountryListView,
    EmailPasswordLoginView,
    FlatListView,
    MeView,
    MobileOTPLoginView,
    OnboardingCreateView,
    OnboardingStatusView,
    ResidentMyHomeView,
    SendOTPView,
    SocietyListView,
    TokenRefreshAPIView,
    VerifyOTPView,
)

app_name = "accounts"

urlpatterns = [
    # OTP
    path("otp/send/",   SendOTPView.as_view(),   name="otp-send"),
    path("otp/verify/", VerifyOTPView.as_view(), name="otp-verify"),

    # Onboarding — hierarchical lookup chain
    path("onboarding/countries/",       CountryListView.as_view(),      name="onboarding-countries"),
    path("onboarding/cities/",          CityListView.as_view(),         name="onboarding-cities"),
    path("onboarding/societies/",       SocietyListView.as_view(),      name="onboarding-societies"),
    path("onboarding/buildings/",       BuildingListView.as_view(),     name="onboarding-buildings"),
    path("onboarding/flats/",           FlatListView.as_view(),         name="onboarding-flats"),
    path("onboarding/complete/",        OnboardingCreateView.as_view(), name="onboarding-complete"),
    path("onboarding/approval-status/", OnboardingStatusView.as_view(), name="onboarding-status"),

    # Authenticated profile
    path("me/",       MeView.as_view(),            name="me"),
    path("my-home/",  ResidentMyHomeView.as_view(), name="my-home"),

    # Login
    path("login/email/",   EmailPasswordLoginView.as_view(), name="login-email"),
    path("login/mobile/",  MobileOTPLoginView.as_view(),     name="login-mobile"),

    # JWT token management
    path("token/refresh/", TokenRefreshAPIView.as_view(), name="token-refresh"),
]
