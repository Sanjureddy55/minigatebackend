import logging

from django.db.models import Count, Q
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSuperAdmin
from apps.platform_admin.audit_logs.utils import log_action
from apps.roles_permissions.models import UserProfile

from .serializers import (
    InviteSocietyAdminSerializer,
    SocietyAdminSerializer,
    SocietyAdminStatsSerializer,
)

logger = logging.getLogger(__name__)


class _Pagination(PageNumberPagination):
    page_size             = 20
    page_size_query_param = "page_size"
    max_page_size         = 100


def _base_qs():
    return (
        UserProfile.objects
        .filter(role__slug="society-admin")
        .select_related("user", "role", "society", "society__city")
        .order_by("-created_at")
    )


class SocietyAdminListCreateView(APIView):
    """
    GET  /api/platform-admin/society-admins/
         ?status=active|pending|inactive
         ?society=<id>
         ?search=<name|email|mobile>
         ?page=  ?page_size=

    POST /api/platform-admin/society-admins/invite/
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        qs = _base_qs()

        if s := request.query_params.get("status", "").strip():
            qs = qs.filter(status=s)

        if soc := request.query_params.get("society", "").strip():
            qs = qs.filter(society_id=soc)

        if q := request.query_params.get("search", "").strip():
            qs = qs.filter(
                Q(full_name__icontains=q)
                | Q(mobile__icontains=q)
                | Q(user__email__icontains=q)
                | Q(society__name__icontains=q)
            )

        paginator = _Pagination()
        page      = paginator.paginate_queryset(qs, request, view=self)
        data      = SocietyAdminSerializer(page, many=True).data
        response  = paginator.get_paginated_response(data)

        # Embed stats in every list response
        all_sa = _base_qs()
        response.data["stats"] = {
            "total":     all_sa.count(),
            "active":    all_sa.filter(status=UserProfile.Status.ACTIVE).count(),
            "pending":   all_sa.filter(status=UserProfile.Status.PENDING).count(),
            "suspended": all_sa.filter(status=UserProfile.Status.INACTIVE).count(),
        }
        return response


class SocietyAdminStatsView(APIView):
    """GET /api/platform-admin/society-admins/stats/"""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        qs = _base_qs()
        data = {
            "total":     qs.count(),
            "active":    qs.filter(status=UserProfile.Status.ACTIVE).count(),
            "pending":   qs.filter(status=UserProfile.Status.PENDING).count(),
            "suspended": qs.filter(status=UserProfile.Status.INACTIVE).count(),
        }
        return Response({"success": True, "data": SocietyAdminStatsSerializer(data).data})


class SocietyAdminInviteView(APIView):
    """POST /api/platform-admin/society-admins/invite/"""
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        ser = InviteSocietyAdminSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        profile  = ser.save()
        plain_pw = getattr(profile, "_plain_password", None)

        logger.info(
            "SOCIETY_ADMIN_INVITE | profile=%s mobile=%s society=%s by=%s",
            profile.pk, profile.mobile,
            profile.society.name if profile.society_id else "None",
            request.user,
        )
        log_action(
            request=request, action="invited society admin", action_type="invite",
            target=profile.full_name, target_type="user", target_id=str(profile.pk),
        )

        response_data = SocietyAdminSerializer(profile).data
        if plain_pw:
            response_data["generated_password"] = plain_pw
        return Response(
            {"success": True, "message": "Society Admin account created. Login: mobile + OTP 123456.", "data": response_data},
            status=status.HTTP_201_CREATED,
        )


class SocietyAdminDetailView(APIView):
    """
    GET   /api/platform-admin/society-admins/<id>/
    PATCH /api/platform-admin/society-admins/<id>/
    """
    permission_classes = [IsSuperAdmin]

    def _get(self, pk):
        try:
            return _base_qs().get(pk=pk)
        except UserProfile.DoesNotExist:
            return None

    def get(self, request, pk):
        profile = self._get(pk)
        if not profile:
            return Response({"success": False, "message": "Society Admin not found."}, status=404)
        return Response({"success": True, "data": SocietyAdminSerializer(profile).data})

    def patch(self, request, pk):
        profile = self._get(pk)
        if not profile:
            return Response({"success": False, "message": "Society Admin not found."}, status=404)

        allowed = {"full_name", "mobile", "description", "society"}
        for field in allowed:
            if field in request.data:
                if field == "society":
                    from apps.platform_admin.create_society.models import Society as _Society
                    try:
                        profile.society = _Society.objects.get(pk=request.data["society"])
                    except _Society.DoesNotExist:
                        return Response({"success": False, "message": "Society not found."}, status=400)
                else:
                    setattr(profile, field, request.data[field])
        profile.save()
        return Response({"success": True, "data": SocietyAdminSerializer(profile).data})


class SocietyAdminApproveView(APIView):
    """POST /api/platform-admin/society-admins/<id>/approve/"""
    permission_classes = [IsSuperAdmin]

    def post(self, request, pk):
        try:
            profile = _base_qs().get(pk=pk)
        except UserProfile.DoesNotExist:
            return Response({"success": False, "message": "Society Admin not found."}, status=404)

        if profile.status == UserProfile.Status.ACTIVE:
            return Response({"success": False, "message": "Account is already active."}, status=400)

        profile.status = UserProfile.Status.ACTIVE
        profile.save(update_fields=["status", "updated_at"])

        logger.info("SOCIETY_ADMIN_APPROVE | profile=%s by=%s", pk, request.user)
        log_action(
            request=request, action="approved society admin", action_type="approve",
            target=profile.full_name, target_type="user", target_id=str(profile.pk),
        )
        return Response({"success": True, "message": f"'{profile.full_name}' approved.", "data": SocietyAdminSerializer(profile).data})


class SocietyAdminSuspendView(APIView):
    """POST /api/platform-admin/society-admins/<id>/suspend/"""
    permission_classes = [IsSuperAdmin]

    def post(self, request, pk):
        try:
            profile = _base_qs().get(pk=pk)
        except UserProfile.DoesNotExist:
            return Response({"success": False, "message": "Society Admin not found."}, status=404)

        if profile.status == UserProfile.Status.INACTIVE:
            return Response({"success": False, "message": "Account is already suspended."}, status=400)

        profile.status = UserProfile.Status.INACTIVE
        profile.save(update_fields=["status", "updated_at"])

        logger.info("SOCIETY_ADMIN_SUSPEND | profile=%s by=%s", pk, request.user)
        log_action(
            request=request, action="suspended society admin", action_type="suspend",
            target=profile.full_name, target_type="user", target_id=str(profile.pk),
        )
        return Response({"success": True, "message": f"'{profile.full_name}' suspended.", "data": SocietyAdminSerializer(profile).data})
