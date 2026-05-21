"""
URL configuration for apps.accounts.

Mount point (config/urls.py):
    path("api/accounts/", include("apps.accounts.urls"))

┌─────────────────────────────────────────────────────────────────────────────┐
│  METHOD   PATH                              DESCRIPTION                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST     otp/send/                         Send OTP to mobile              │
│  POST     otp/verify/                       Verify OTP                      │
│  GET      onboarding/countries/             List countries                  │
│  GET      onboarding/cities/?country=<id>   List cities (filtered)          │
│  GET      onboarding/societies/?city=<name> List active societies           │
│  POST     onboarding/complete/              Create user after OTP verify     │
│  POST     login/email/                      Login via email + password       │
│  POST     login/mobile/                     Login via mobile + OTP           │
└─────────────────────────────────────────────────────────────────────────────┘
"""

from django.urls import path

from .views import (
    CityListView,
    CountryListView,
    EmailPasswordLoginView,
    MobileOTPLoginView,
    OnboardingCreateView,
    SendOTPView,
    SocietyListView,
    VerifyOTPView,
)

app_name = "accounts"

urlpatterns = [
    # OTP
    path("otp/send/",             SendOTPView.as_view(),          name="otp-send"),
    path("otp/verify/",           VerifyOTPView.as_view(),        name="otp-verify"),
    # Onboarding lookups
    path("onboarding/countries/", CountryListView.as_view(),      name="onboarding-countries"),
    path("onboarding/cities/",    CityListView.as_view(),         name="onboarding-cities"),
    path("onboarding/societies/", SocietyListView.as_view(),      name="onboarding-societies"),
    path("onboarding/complete/",  OnboardingCreateView.as_view(), name="onboarding-complete"),
    # Login
    path("login/email/",          EmailPasswordLoginView.as_view(), name="login-email"),
    path("login/mobile/",         MobileOTPLoginView.as_view(),     name="login-mobile"),
]
