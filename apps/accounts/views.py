import logging

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from apps.platform_admin.create_society.models import Society
from apps.roles_permissions.models import UserProfile
from apps.roles_permissions.serializers import UserProfileSerializer
from apps.society_admin.buildings.models import Building
from apps.society_admin.flats.models import Flat

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
    get_tokens_for_user,
)
from .utils import send_otp, verify_otp

logger = logging.getLogger(__name__)


# ── OTP Flow ──────────────────────────────────────────────────────────────────

class SendOTPView(APIView):
    """
    POST /api/accounts/otp/send/
    Body: { "mobile": "+919876543210" }
    Sends OTP (dev: always 123456).
    """

    permission_classes = [AllowAny]

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
                **({"dev_otp": record.otp_code} if settings.DEBUG else {}),
            },
            status=status.HTTP_200_OK,
        )


class VerifyOTPView(APIView):
    """
    POST /api/accounts/otp/verify/
    Body: { "mobile": "+919876543210", "otp_code": "123456" }
    """

    permission_classes = [AllowAny]
    HARDCODED_OTP = "123456"

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mobile   = serializer.validated_data["mobile"]
        otp_code = serializer.validated_data["otp_code"]

        ok, message = verify_otp(mobile, otp_code)
        if not ok:
            return Response(
                {"success": False, "message": message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info("VERIFY_OTP | mobile=%s | success", mobile)
        return Response(
            {"success": True, "message": "OTP verified. Proceed to onboarding."},
            status=status.HTTP_200_OK,
        )


# ── Onboarding Lookup Endpoints ───────────────────────────────────────────────

class CountryListView(APIView):
    """GET /api/accounts/onboarding/countries/"""

    permission_classes = [AllowAny]

    def get(self, request):
        qs   = Country.objects.filter(is_active=True).order_by("name")
        data = CountrySerializer(qs, many=True).data
        return Response({"success": True, "count": len(data), "results": data})


class CityListView(APIView):
    """GET /api/accounts/onboarding/cities/?country=<id>"""

    permission_classes = [AllowAny]

    def get(self, request):
        qs = City.objects.filter(is_active=True).select_related("country")
        country_id = request.query_params.get("country")
        if country_id:
            qs = qs.filter(country_id=country_id)
        data = CitySerializer(qs, many=True).data
        return Response({"success": True, "count": len(data), "results": data})


class SocietyListView(APIView):
    """GET /api/accounts/onboarding/societies/?city=<id>"""

    permission_classes = [AllowAny]

    def get(self, request):
        qs     = Society.objects.filter(status=Society.Status.ACTIVE).select_related("city")
        city   = request.query_params.get("city")
        city_name = request.query_params.get("city_name")
        if city:
            qs = qs.filter(city_id=city)
        if city_name:
            qs = qs.filter(city__name__icontains=city_name)
        data = SocietyLookupSerializer(qs, many=True).data
        return Response({"success": True, "count": len(data), "results": data})


class BuildingListView(APIView):
    """GET /api/accounts/onboarding/buildings/?society=<id>"""

    permission_classes = [AllowAny]

    def get(self, request):
        society_id = request.query_params.get("society")
        qs = Building.objects.select_related("society").order_by("name")
        if society_id:
            qs = qs.filter(society_id=society_id)
        data = [{"id": str(b.pk), "name": b.name, "society": b.society_id} for b in qs]
        return Response({"success": True, "count": len(data), "results": data})


class FlatListView(APIView):
    """GET /api/accounts/onboarding/flats/?building=<uuid>&society=<id>"""

    permission_classes = [AllowAny]

    def get(self, request):
        building_id = request.query_params.get("building")
        society_id  = request.query_params.get("society")
        qs = Flat.objects.select_related("building").order_by("flat_number")
        if building_id:
            qs = qs.filter(building_id=building_id)
        if society_id:
            qs = qs.filter(building__society_id=society_id)
        data = [
            {"id": str(f.pk), "flat_number": f.flat_number, "building": str(f.building_id)}
            for f in qs
        ]
        return Response({"success": True, "count": len(data), "results": data})


# ── Onboarding Create & Status ────────────────────────────────────────────────

class OnboardingCreateView(APIView):
    """
    POST /api/accounts/onboarding/complete/
    Creates UserProfile with status=PENDING (awaiting Society Admin approval).
    Returns JWT tokens immediately so the resident can poll their approval status.
    Body: mobile, full_name, country_id, city_id, society_id (opt), flat_number (opt)
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OnboardingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        tokens  = get_tokens_for_user(profile.user)
        logger.info(
            "ONBOARDING_COMPLETE | mobile=%s profile_id=%s status=%s",
            serializer.validated_data["mobile"], profile.pk, profile.status,
        )
        return Response(
            {
                "success": True,
                "message": "Registration submitted. Awaiting Society Admin approval." if profile.status == UserProfile.Status.PENDING else "Account already exists.",
                "tokens":  tokens,
                "data":    UserProfileSerializer(profile).data,
            },
            status=status.HTTP_201_CREATED,
        )


class OnboardingStatusView(APIView):
    """
    GET /api/accounts/onboarding/approval-status/?mobile=<mobile>
    Polled by the app to show the "Approval Pending" screen.
    No auth required — resident may not have a valid token yet.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        mobile = request.query_params.get("mobile")
        if not mobile:
            return Response({"success": False, "message": "mobile query param required."}, status=400)

        try:
            profile = UserProfile.objects.select_related("society", "role").get(mobile=mobile)
        except UserProfile.DoesNotExist:
            return Response({"success": False, "message": "No account found for this mobile."}, status=404)

        steps = [
            {
                "key":    "submitted",
                "label":  "Application submitted to society",
                "detail": f"We've sent your request to your society admin on {profile.created_at.strftime('%d %b %Y, %I:%M %p')}",
                "done":   True,
            },
            {
                "key":    "reminding",
                "label":  "We're reminding",
                "detail": "We send reminders every 24 Hours",
                "done":   profile.status in (UserProfile.Status.ACTIVE, UserProfile.Status.INACTIVE),
            },
            {
                "key":    "verified",
                "label":  "Verification by Society Admin",
                "detail": "Most approvals happen within 72 hours.",
                "done":   profile.status == UserProfile.Status.ACTIVE,
            },
        ]

        return Response({
            "success": True,
            "data": {
                "status":         profile.status,
                "status_display": profile.get_status_display(),
                "is_approved":    profile.status == UserProfile.Status.ACTIVE,
                "is_rejected":    profile.status == UserProfile.Status.INACTIVE,
                "society_name":   profile.society.name if profile.society else None,
                "flat_number":    profile.flat_number,
                "steps":          steps,
            },
        })


# ── Authenticated: Current User ───────────────────────────────────────────────

class MeView(APIView):
    """
    GET  /api/accounts/me/         — current user's profile
    PATCH /api/accounts/me/update/ — update name / flat_number
    Requires: Authorization: Bearer <access_token>
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = UserProfile.objects.select_related("user", "role", "society").prefetch_related(
                "role__module_permissions"
            ).get(user=request.user)
        except UserProfile.DoesNotExist:
            return Response({"success": False, "message": "Profile not found."}, status=404)

        logger.info("ME_GET | user=%s profile_id=%s", request.user.pk, profile.pk)
        return Response({"success": True, "data": UserProfileSerializer(profile).data})


class ResidentMyHomeView(APIView):
    """
    GET /api/accounts/my-home/?mobile=<mobile>
    Returns flat + building + society details for the resident's home screen.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        mobile = request.query_params.get("mobile")
        if not mobile:
            return Response({"success": False, "message": "mobile query param required."}, status=400)

        try:
            profile = UserProfile.objects.select_related("society", "society__city").get(mobile=mobile)
        except UserProfile.DoesNotExist:
            return Response({"success": False, "message": "Profile not found."}, status=404)

        if profile.status != UserProfile.Status.ACTIVE:
            return Response({
                "success": False,
                "message": "Your account is pending approval. You cannot access flat details yet.",
                "status":  profile.status,
            }, status=status.HTTP_403_FORBIDDEN)

        flat_detail = None
        if profile.flat_number:
            flat_qs = Flat.objects.filter(flat_number=profile.flat_number).select_related("building", "building__society")
            if profile.society:
                flat_qs = flat_qs.filter(building__society=profile.society)
            flat_obj = flat_qs.first()
            if flat_obj:
                flat_detail = {
                    "id":           str(flat_obj.pk),
                    "flat_number":  flat_obj.flat_number,
                    "building":     flat_obj.building.name,
                    "society":      flat_obj.building.society.name,
                    "city":         flat_obj.building.society.city.name if flat_obj.building.society.city else None,
                }

        return Response({
            "success": True,
            "data": {
                "full_name":   profile.full_name,
                "mobile":      profile.mobile,
                "flat_number": profile.flat_number,
                "society":     profile.society.name if profile.society else None,
                "flat_detail": flat_detail,
                "role":        profile.role.name if profile.role else None,
                "status":      profile.status,
            },
        })


# ── Login ─────────────────────────────────────────────────────────────────────

class EmailPasswordLoginView(APIView):
    """
    POST /api/accounts/login/email/
    Body: { "email": "...", "password": "..." }
    Returns: profile + JWT tokens (access + refresh).
    """

    permission_classes = [AllowAny]

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

        tokens = get_tokens_for_user(user)
        logger.info("LOGIN_EMAIL | user=%s role=%s", user.email, getattr(profile.role, "slug", "—") if profile else "—")
        return Response({
            "success": True,
            "message": "Login successful.",
            "tokens":  tokens,
            "data": {
                "user_id":  user.pk,
                "email":    user.email,
                "username": user.username,
                "profile":  UserProfileSerializer(profile).data if profile else None,
            },
        })


class MobileOTPLoginView(APIView):
    """
    POST /api/accounts/login/mobile/
    Body: { "mobile": "9000000001", "otp_code": "123456" }

    OTP is always 123456 (hardcoded for development).
    Returns JWT tokens + full profile + role-based home_route + features.
    """

    permission_classes = [AllowAny]
    HARDCODED_OTP = "123456"

    # Maps role slug → frontend home screen route name
    _ROLE_HOME = {
        "super-admin":    "platform_admin_dashboard",
        "society-admin":  "society_admin_dashboard",
        "resident":       "resident_dashboard",
        "security-guard": "security_guard_dashboard",
        "accountant":     "accountant_dashboard",
        "maintenance-staff": "maintenance_staff_dashboard",
        "maintenance":       "maintenance_staff_dashboard",
        "support-staff":     "support_staff_dashboard",
        "delivery-partner":  "delivery_partner_dashboard",
        "delivery":          "delivery_partner_dashboard",  # legacy
        "guest-user":        "guest_user_dashboard",
        "guest":             "guest_user_dashboard",        # legacy
    }

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
            profile = (
                UserProfile.objects
                .select_related("user", "role", "society", "society__city")
                .prefetch_related("role__module_permissions")
                .get(mobile=mobile)
            )
        except UserProfile.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "No account found for this mobile number. Please register first.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Block inactive / pending accounts
        if profile.status == UserProfile.Status.PENDING:
            return Response(
                {
                    "success": False,
                    "message": "Your account is pending approval by the Society Admin. Please wait.",
                    "status":  profile.status,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        if profile.status == UserProfile.Status.INACTIVE:
            return Response(
                {
                    "success": False,
                    "message": "Your account has been deactivated. Contact the Society Admin.",
                    "status":  profile.status,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        tokens = get_tokens_for_user(profile.user)

        # Super Admin fallback: if Django superuser but role not FK-linked yet
        role = profile.role
        if role is None and profile.user.is_superuser:
            from apps.roles_permissions.models import Role as _Role
            role = _Role.objects.filter(slug="super-admin").prefetch_related("module_permissions").first()

        role_slug = role.slug if role else ""
        features  = []
        if role:
            for perm in role.module_permissions.all():
                features.append({
                    "module":      perm.module,
                    "label":       perm.get_module_display(),
                    "can_view":    perm.can_view,
                    "can_create":  perm.can_create,
                    "can_edit":    perm.can_edit,
                    "can_delete":  perm.can_delete,
                })

        home_route = self._ROLE_HOME.get(role_slug, "dashboard")

        # Society info (if assigned)
        society_info = None
        if profile.society:
            society_info = {
                "id":   profile.society_id,
                "name": profile.society.name,
                "city": profile.society.city.name if profile.society.city else None,
                "plan": profile.society.plan,
            }

        logger.info(
            "LOGIN_MOBILE | mobile=%s profile=%s role=%s status=%s",
            mobile, profile.pk, role_slug, profile.status,
        )

        return Response({
            "success":    True,
            "message":    "Login successful.",
            "tokens":     tokens,
            "home_route": home_route,
            "data": {
                "id":          str(profile.pk),
                "full_name":   profile.full_name,
                "mobile":      profile.mobile,
                "email":       profile.user.email,
                "status":      profile.status,
                "flat_number": profile.flat_number,
                "role": {
                    "id":        role.pk if role else None,
                    "name":      role.name if role else None,
                    "slug":      role_slug,
                    "role_type": role.role_type if role else None,
                },
                "society":   society_info,
                "features":  features,
            },
        })


class TokenRefreshAPIView(TokenRefreshView):
    """
    POST /api/accounts/token/refresh/
    Body: { "refresh": "<refresh_token>" }
    Returns: { "access": "<new_access_token>" }
    Standard simplejwt refresh endpoint, exposed at the accounts prefix.
    """
