import logging

from django.db.models import Count, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from apps.common.permissions import IsSuperAdmin

from apps.platform_admin.audit_logs.utils import log_action
from apps.roles_permissions.models import UserProfile

from .serializers import (
    GlobalUserSerializer,
    GlobalUserStatsSerializer,
    InviteUserSerializer,
    UpdateUserSerializer,
)

logger = logging.getLogger(__name__)


class _UserPagination(PageNumberPagination):
    page_size             = 20
    page_size_query_param = "page_size"
    max_page_size         = 100


class GlobalUserViewSet(viewsets.ModelViewSet):
    """
    ┌────────────────────────────────────────────────────────────────────────┐
    │ GET    /                     Paginated user list (NAME/ROLE/SOC/STATUS) │
    │ GET    /stats/               KPI cards: Total | Active | Suspended      │
    │ POST   /invite/              Create any user — no OTP, status=ACTIVE    │
    │ GET    /<id>/                User detail                                 │
    │ PATCH  /<id>/                Update role / society / status              │
    │ POST   /<id>/suspend/        Set status → inactive                       │
    │ POST   /<id>/activate/       Set status → active                         │
    └────────────────────────────────────────────────────────────────────────┘

    Search:   ?search=   (full_name, mobile, user__email, society__name)
    Filter:   ?status=   active | inactive | pending
              ?role=     <role pk>
              ?society=  <society pk>
    Ordering: ?ordering= full_name | created_at | status
    """
    permission_classes = [IsSuperAdmin]

    serializer_class = GlobalUserSerializer
    pagination_class = _UserPagination
    filter_backends  = [SearchFilter, OrderingFilter]
    search_fields    = ["full_name", "mobile", "user__email", "society__name", "role__name"]
    ordering_fields  = ["full_name", "created_at", "status", "role__name"]
    ordering         = ["-created_at"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = (
            UserProfile.objects
            .select_related("user", "role", "society")
            .order_by("-created_at")
        )
        p = self.request.query_params
        if s := p.get("status"):
            qs = qs.filter(status=s)
        if r := p.get("role"):
            qs = qs.filter(role_id=r)
        if soc := p.get("society"):
            qs = qs.filter(society_id=soc)
        return qs

    # ── Stats — 3 KPI cards ───────────────────────────────────────────────────

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """GET /stats/ — Total Users, Active, Suspended KPI cards."""
        agg = UserProfile.objects.aggregate(
            total    = Count("id"),
            active   = Count("id", filter=Q(status=UserProfile.Status.ACTIVE)),
            inactive = Count("id", filter=Q(status=UserProfile.Status.INACTIVE)),
            pending  = Count("id", filter=Q(status=UserProfile.Status.PENDING)),
        )
        data = {
            "total_users": agg["total"],
            "active":      agg["active"],
            "suspended":   agg["inactive"],
            "pending":     agg["pending"],
        }
        return Response({"success": True, "data": GlobalUserStatsSerializer(data).data})

    # ── Invite / Create user (no OTP) ─────────────────────────────────────────

    @action(detail=False, methods=["post"])
    def invite(self, request):
        """
        POST /invite/

        Create any user (resident, society admin, guard, etc.) directly.
        No OTP verification needed — platform admin has trust.
        Returns the generated password once (store it — never shown again).
        """
        ser = InviteUserSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        profile = ser.save()
        plain_pw = getattr(profile, "_plain_password", None)

        logger.info(
            "GLOBAL_USER_INVITE | profile=%s email=%s role=%s society=%s by=%s",
            profile.pk,
            profile.user.email,
            profile.role.name if profile.role_id else "None",
            profile.society.name if profile.society_id else "None",
            request.user,
        )

        response_data = GlobalUserSerializer(profile).data
        if plain_pw:
            response_data["generated_password"] = plain_pw   # shown once

        log_action(request=request, action="invited user", action_type="invite",
                   target=profile.full_name or profile.user.email,
                   target_type="user", target_id=str(profile.pk))
        return Response(
            {"success": True, "message": "User created successfully.", "data": response_data},
            status=status.HTTP_201_CREATED,
        )

    # ── Retrieve ──────────────────────────────────────────────────────────────

    def retrieve(self, request, *args, **kwargs):
        profile = self.get_object()
        return Response({"success": True, "data": GlobalUserSerializer(profile).data})

    # ── Partial update (role / society / status / flat_number) ────────────────

    def partial_update(self, request, *args, **kwargs):
        profile = self.get_object()
        ser = UpdateUserSerializer(profile, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        logger.info("GLOBAL_USER_UPDATE | profile=%s by=%s", profile.pk, request.user)
        return Response({"success": True, "data": GlobalUserSerializer(profile).data})

    # ── Suspend / Activate quick actions ──────────────────────────────────────

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        """POST /<id>/suspend/ — set status=inactive."""
        profile = self.get_object()
        if profile.status == UserProfile.Status.INACTIVE:
            return Response({"detail": "User is already suspended."}, status=status.HTTP_400_BAD_REQUEST)
        profile.status = UserProfile.Status.INACTIVE
        profile.save(update_fields=["status", "updated_at"])
        logger.info("GLOBAL_USER_SUSPEND | profile=%s by=%s", profile.pk, request.user)
        log_action(request=request, action="suspended user", action_type="suspend",
                   target=profile.full_name or profile.user.email, target_type="user", target_id=str(profile.pk))
        return Response({"success": True, "data": GlobalUserSerializer(profile).data})

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        """POST /<id>/activate/ — set status=active."""
        profile = self.get_object()
        if profile.status == UserProfile.Status.ACTIVE:
            return Response({"detail": "User is already active."}, status=status.HTTP_400_BAD_REQUEST)
        profile.status = UserProfile.Status.ACTIVE
        profile.save(update_fields=["status", "updated_at"])
        logger.info("GLOBAL_USER_ACTIVATE | profile=%s by=%s", profile.pk, request.user)
        log_action(request=request, action="activated user", action_type="activate",
                   target=profile.full_name or profile.user.email, target_type="user", target_id=str(profile.pk))
        return Response({"success": True, "data": GlobalUserSerializer(profile).data})

    # ── Disable full create / destroy via default routes ─────────────────────

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Use POST /invite/ to create a user."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Users cannot be deleted. Use /suspend/ to deactivate."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )