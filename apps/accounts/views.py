import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.platform_admin.create_society.models import Society
from apps.roles_permissions.models import UserProfile
from apps.roles_permissions.serializers import UserProfileSerializer

from .models import City, Country
from .serializers import (
    CitySerializer,
    CountrySerializer,
    EmailPasswordLoginSerializer,
    MobileOTPLoginSerializer,
    OnboardingCreateSerializer,
    SendOTPSerializer,
    SocietyLookupSerializer,
    VerifyOTPSerializer,
)
from .utils import send_otp

logger = logging.getLogger(__name__)


# ── OTP Flow ──────────────────────────────────────────────────────────────────

class SendOTPView(APIView):
    """
    POST /api/accounts/otp/send/
    Body: { "mobile": "+919876543210" }
    Sends OTP (dev: always 123456).
    """

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mobile = serializer.validated_data["mobile"]
        record = send_otp(mobile)
        logger.info("SEND_OTP | mobile=%s", mobile)
        return Response(
            {
                "success": True,
                "message": f"OTP sent to {mobile}. Valid for 10 minutes.",
                # Expose OTP in dev so Postman/frontend can test without SMS
                **({"dev_otp": record.otp_code} if __import__("django").conf.settings.DEBUG else {}),
            },
            status=status.HTTP_200_OK,
        )


class VerifyOTPView(APIView):
    """
    POST /api/accounts/otp/verify/
    Body: { "mobile": "+919876543210", "otp_code": "123456" }
    """

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mobile   = serializer.validated_data["mobile"]
        otp_code = serializer.validated_data["otp_code"]
        ok, reason = verify_otp(mobile, otp_code)
        if not ok:
            return Response({"success": False, "message": reason}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {"success": True, "message": "OTP verified. Proceed to onboarding."},
            status=status.HTTP_200_OK,
        )


# ── Onboarding Lookup Endpoints ───────────────────────────────────────────────

class CountryListView(APIView):
    """GET /api/accounts/onboarding/countries/"""

    def get(self, request):
        qs   = Country.objects.filter(is_active=True).order_by("name")
        data = CountrySerializer(qs, many=True).data
        return Response({"success": True, "count": len(data), "results": data})


class CityListView(APIView):
    """
    GET /api/accounts/onboarding/cities/?country=1
    Filters cities by country FK.
    """

    def get(self, request):
        qs = City.objects.filter(is_active=True).select_related("country")
        country_id = request.query_params.get("country")
        if country_id:
            qs = qs.filter(country_id=country_id)
        data = CitySerializer(qs, many=True).data
        return Response({"success": True, "count": len(data), "results": data})


class SocietyListView(APIView):
    """
    GET /api/accounts/onboarding/societies/?city=Pune
    Filters active societies by city name (case-insensitive).
    """

    def get(self, request):
        qs   = Society.objects.filter(status=Society.Status.ACTIVE)
        city = request.query_params.get("city")
        if city:
            qs = qs.filter(city__iexact=city)
        data = SocietyLookupSerializer(qs, many=True).data
        return Response({"success": True, "count": len(data), "results": data})


# ── Onboarding Create ─────────────────────────────────────────────────────────

class OnboardingCreateView(APIView):
    """
    POST /api/accounts/onboarding/complete/

    Final step: create UserProfile after OTP verified.
    Body:
      mobile, full_name, country_id, city_id, society_id (opt), flat_number (opt)
    """

    def post(self, request):
        serializer = OnboardingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        logger.info("ONBOARDING_COMPLETE | mobile=%s profile_id=%s",
                    serializer.validated_data["mobile"], profile.pk)
        return Response(
            {
                "success": True,
                "message": "Onboarding complete.",
                "data": UserProfileSerializer(profile).data,
            },
            status=status.HTTP_201_CREATED,
        )


# ── Login ─────────────────────────────────────────────────────────────────────

class EmailPasswordLoginView(APIView):
    """
    POST /api/accounts/login/email/
    Body: { "email": "...", "password": "..." }
    Returns user profile + role + module permissions.
    Attach JWT here when auth is wired up (see base.py REST_FRAMEWORK comment).
    """

    def post(self, request):
        serializer = EmailPasswordLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        try:
            profile = UserProfile.objects.select_related("role", "society").prefetch_related(
                "role__module_permissions"
            ).get(user=user)
        except UserProfile.DoesNotExist:
            profile = None

        logger.info("LOGIN_EMAIL | user=%s", user.email)
        return Response(
            {
                "success": True,
                "message": "Login successful.",
                "data": {
                    "user_id":  user.pk,
                    "email":    user.email,
                    "username": user.username,
                    "profile":  UserProfileSerializer(profile).data if profile else None,
                },
            }
        )


class MobileOTPLoginView(APIView):
    """
    POST /api/accounts/login/mobile/
    Body: { "mobile": "...", "otp_code": "123456" }
    OTP is hardcoded to 123456 — no send step required.
    """

    HARDCODED_OTP = "123456"

    def post(self, request):
        serializer = MobileOTPLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mobile   = serializer.validated_data["mobile"]
        otp_code = serializer.validated_data["otp_code"]

        if otp_code != self.HARDCODED_OTP:
            return Response(
                {"success": False, "message": "Incorrect OTP. Use 123456."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            profile = UserProfile.objects.select_related("user", "role", "society").prefetch_related(
                "role__module_permissions"
            ).get(mobile=mobile)
        except UserProfile.DoesNotExist:
            return Response(
                {"success": False, "message": "No account found for this mobile."},
                status=status.HTTP_404_NOT_FOUND,
            )

        logger.info("LOGIN_MOBILE | mobile=%s profile_id=%s", mobile, profile.pk)
        return Response(
            {
                "success": True,
                "message": "Login successful.",
                "data": UserProfileSerializer(profile).data,
            }
        )
