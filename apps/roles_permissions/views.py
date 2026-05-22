import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSuperAdmin

from .models import Role, UserProfile
from .serializers import AssignUserSerializer, RoleSerializer, SuperAdminSetupSerializer, UserProfileSerializer

logger = logging.getLogger(__name__)


class RoleViewSet(viewsets.ModelViewSet):
    """
    CRUD for roles + assign-user custom action.

        GET    /roles/                      list
        POST   /roles/                      create
        GET    /roles/{id}/                 retrieve
        PUT    /roles/{id}/                 full update
        PATCH  /roles/{id}/                 partial update
        DELETE /roles/{id}/                 destroy (blocked for system_role)
        POST   /roles/{id}/assign-user/     create User + UserProfile + send email
    """

    serializer_class = RoleSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends  = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["role_type", "is_active"]
    search_fields    = ["name", "description"]
    ordering_fields  = ["name", "role_type", "created_at"]
    ordering         = ["name"]

    def get_queryset(self):
        return Role.objects.prefetch_related("module_permissions").all()

    # ── List ──────────────────────────────────────────────────────────────────

    def list(self, request, *args, **kwargs):
        logger.info("LIST roles | user=%s", request.user)
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        data = self.get_serializer(qs, many=True).data
        return Response({"success": True, "count": qs.count(), "results": data})

    # ── Create ────────────────────────────────────────────────────────────────

    def create(self, request, *args, **kwargs):
        logger.info("CREATE role | user=%s | name='%s'", request.user, request.data.get("name"))
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        return Response(
            {"success": True, "message": "Role created.", "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    # ── Retrieve ──────────────────────────────────────────────────────────────

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        logger.info("RETRIEVE role | id=%s name='%s'", instance.pk, instance.name)
        return Response({"success": True, "data": self.get_serializer(instance).data})

    # ── Update ────────────────────────────────────────────────────────────────

    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop("partial", False)
        instance = self.get_object()
        logger.info("UPDATE role | id=%s | partial=%s", instance.pk, partial)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        label = "partially updated" if partial else "updated"
        return Response({"success": True, "message": f"Role {label}.", "data": serializer.data})

    # ── Destroy ───────────────────────────────────────────────────────────────

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.system_role:
            return Response(
                {"success": False, "message": "System roles cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = instance.name
        logger.warning("DELETE role | user=%s | id=%s name='%s'", request.user, instance.pk, name)
        instance.delete()
        return Response(
            {"success": True, "message": f"Role '{name}' deleted."},
            status=status.HTTP_200_OK,
        )

    # ── Assign User ───────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="assign-user", url_name="assign-user")
    def assign_user(self, request, pk=None):
        """
        POST /roles/{id}/assign-user/

        Body: full_name, email, mobile, status, description, society (opt), flat_number (opt)
        Creates a Django User + UserProfile, generates a random password,
        sends a welcome email with credentials.
        """
        role = self.get_object()
        logger.info(
            "ASSIGN_USER | role=%s | email='%s'",
            role.name, request.data.get("email", "—"),
        )
        data = {**request.data, "role": role.pk}
        serializer = AssignUserSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(
            {
                "success": True,
                "message": "User created and welcome email sent.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class UserProfileViewSet(viewsets.ModelViewSet):
    """
    Read/update user profiles.

        GET    /users/          list
        GET    /users/{id}/     retrieve
        PATCH  /users/{id}/     partial update (role, status, flat, etc.)
        DELETE /users/{id}/     deactivate (soft — sets status=inactive)
    """

    serializer_class   = UserProfileSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ["status", "role"]
    search_fields      = ["full_name", "mobile", "user__email"]
    ordering_fields    = ["full_name", "created_at", "status"]
    ordering           = ["-created_at"]

    def get_queryset(self):
        return UserProfile.objects.select_related("user", "role", "society").prefetch_related(
            "role__module_permissions"
        ).all()

    def list(self, request, *args, **kwargs):
        logger.info("LIST user_profiles | user=%s", request.user)
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        data = self.get_serializer(qs, many=True).data
        return Response({"success": True, "count": qs.count(), "results": data})

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        logger.info("RETRIEVE user_profile | id=%s", instance.pk)
        return Response({"success": True, "data": self.get_serializer(instance).data})

    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        logger.info("UPDATE user_profile | id=%s | partial=%s", instance.pk, partial)
        return Response({"success": True, "data": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.status = UserProfile.Status.INACTIVE
        instance.save(update_fields=["status", "updated_at"])
        logger.warning("DEACTIVATE user_profile | id=%s | by=%s", instance.pk, request.user)
        return Response(
            {"success": True, "message": "User deactivated."},
            status=status.HTTP_200_OK,
        )


# ── Super Admin One-Shot Setup ────────────────────────────────────────────────

class SuperAdminSetupView(APIView):
    """
    POST /api/roles-permissions/setup-super-admin/

    Creates the Super Admin role (with all 17 module permissions) AND one
    Super Admin user in a single atomic call.

    Body:
        full_name  — e.g. "Srujan Reddy"
        email      — Gmail or any valid email (receives login credentials)
        mobile     — e.g. "+919876543210"

    Response includes the generated password (shown once — also sent via email).
    Safe to call only once; returns 400 if email/mobile already exists.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        # Guard: if a Super Admin already exists, block duplicate setup
        if Role.objects.filter(slug="super-admin").exists():
            existing_users = UserProfile.objects.filter(
                role__slug="super-admin", status=UserProfile.Status.ACTIVE
            ).count()
            if existing_users > 0:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "Super Admin is already set up. "
                            "Use POST /roles/{id}/assign-user/ to add more admins."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = SuperAdminSetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        profile  = result["profile"]
        role     = result["role"]

        logger.info(
            "SETUP_SUPER_ADMIN | profile_id=%s email=%s",
            profile.pk, profile.user.email,
        )

        return Response(
            {
                "success": True,
                "message": "Super Admin role and user created. Login credentials sent to email.",
                "data": {
                    "role": {
                        "id":        role.pk,
                        "name":      role.name,
                        "slug":      role.slug,
                        "role_type": role.role_type,
                        "modules":   role.module_permissions.count(),
                    },
                    "user": {
                        "id":        profile.pk,
                        "full_name": profile.full_name,
                        "email":     profile.user.email,
                        "mobile":    profile.mobile,
                        "username":  profile.user.username,
                        "status":    profile.status,
                        "password":  "123456",
                    },
                    "login_hint": {
                        "email_login":  "POST /api/accounts/login/email/  → { email, password: '123456' }",
                        "mobile_login": "POST /api/accounts/login/mobile/ → { mobile, otp_code: '123456' }",
                    },
                },
            },
            status=status.HTTP_201_CREATED,
        )
