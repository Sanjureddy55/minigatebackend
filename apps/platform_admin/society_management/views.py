import logging

from django.db.models import Count, Q
from django.db.models.functions import Coalesce
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from apps.common.permissions import IsSuperAdmin

from apps.platform_admin.audit_logs.utils import log_action
from apps.platform_admin.create_society.models import Society

from .serializers import (
    CreateSocietySerializer,
    SocietyManagementSerializer,
    SocietyManagementStatsSerializer,
)

logger = logging.getLogger(__name__)


class _SocietyPagination(PageNumberPagination):
    page_size             = 20
    page_size_query_param = "page_size"
    max_page_size         = 100


class SocietyManagementViewSet(viewsets.ModelViewSet):
    """
    ┌──────────────────────────────────────────────────────────────────────┐
    │ GET    /              Paginated list — Society/City/Flats/Plan/Status │
    │ GET    /stats/        KPI cards: Total | Active | Pending | Suspended │
    │ POST   /              Create a new society (status=pending by default)│
    │ GET    /<id>/         Society detail                                   │
    │ PATCH  /<id>/         Update name/city/plan/admin_email/total_flats   │
    │ POST   /<id>/approve/ Pending → Active                                │
    │ POST   /<id>/suspend/ Active → Suspended                              │
    │ POST   /<id>/activate/Suspended/Inactive → Active                     │
    │ DELETE /<id>/         Delete (only if no users linked)                │
    └──────────────────────────────────────────────────────────────────────┘

    Search:   ?search=   (name, city name)
    Filter:   ?status=   active | pending | suspended | inactive
              ?plan=     free | pro | enterprise
              ?city=     <city pk>
    Ordering: ?ordering= name | total_flats | created_at | flat_count
    """
    permission_classes = [IsSuperAdmin]

    serializer_class  = SocietyManagementSerializer
    pagination_class  = _SocietyPagination
    filter_backends   = [SearchFilter, OrderingFilter]
    search_fields     = ["name", "city__name", "admin_email"]
    ordering_fields   = ["name", "total_flats", "flat_count", "created_at", "status", "plan"]
    ordering          = ["-created_at"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = (
            Society.objects
            .select_related("city", "society_admin")
            .annotate(
                flat_count=Coalesce(
                    Count("buildings__flats", distinct=True), 0
                )
            )
        )
        p = self.request.query_params
        if s := p.get("status"):
            qs = qs.filter(status=s)
        if pl := p.get("plan"):
            qs = qs.filter(plan=pl)
        if city := p.get("city"):
            qs = qs.filter(city_id=city)
        return qs.order_by("-created_at")

    # ── Stats — 4 KPI cards ───────────────────────────────────────────────────

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """GET /stats/ — Total, Active, Pending, Suspended."""
        agg = Society.objects.aggregate(
            total     = Count("id"),
            active    = Count("id", filter=Q(status=Society.Status.ACTIVE)),
            pending   = Count("id", filter=Q(status=Society.Status.PENDING)),
            suspended = Count("id", filter=Q(status=Society.Status.SUSPENDED)),
            inactive  = Count("id", filter=Q(status=Society.Status.INACTIVE)),
        )
        return Response({"success": True, "data": SocietyManagementStatsSerializer(agg).data})

    # ── List ──────────────────────────────────────────────────────────────────

    def list(self, request, *args, **kwargs):
        qs      = self.filter_queryset(self.get_queryset())
        page    = self.paginate_queryset(qs)
        items   = page if page is not None else qs
        results = SocietyManagementSerializer(items, many=True).data
        if page is not None:
            return self.get_paginated_response(results)
        return Response({"success": True, "count": len(results), "results": results})

    # ── Create (+ Add Society button) ─────────────────────────────────────────

    def create(self, request, *args, **kwargs):
        ser = CreateSocietySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        society = ser.save()
        logger.info("SOCIETY_CREATE | id=%s name=%s plan=%s by=%s", society.pk, society.name, society.plan, request.user)
        log_action(request=request, action="created society", action_type="create",
                   target=society.name, target_type="society", target_id=str(society.pk))
        return Response(
            {"success": True, "message": "Society created. Status: Pending.", "data": CreateSocietySerializer(society).data},
            status=status.HTTP_201_CREATED,
        )

    # ── Retrieve ──────────────────────────────────────────────────────────────

    def retrieve(self, request, *args, **kwargs):
        society = self.get_object()
        return Response({"success": True, "data": SocietyManagementSerializer(society).data})

    # ── Partial Update ────────────────────────────────────────────────────────

    def partial_update(self, request, *args, **kwargs):
        society = self.get_object()
        ser = CreateSocietySerializer(society, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        logger.info("SOCIETY_UPDATE | id=%s by=%s", society.pk, request.user)
        log_action(request=request, action="updated society", action_type="update",
                   target=society.name, target_type="society", target_id=str(society.pk))
        return Response({"success": True, "data": CreateSocietySerializer(society).data})

    # ── Status transition actions ─────────────────────────────────────────────

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """POST /<id>/approve/ — Pending → Active."""
        society = self.get_object()
        if society.status != Society.Status.PENDING:
            return Response({"detail": f"Society is '{society.status}', not pending."}, status=400)
        society.status = Society.Status.ACTIVE
        society.save(update_fields=["status", "updated_at"])
        logger.info("SOCIETY_APPROVE | id=%s by=%s", society.pk, request.user)
        log_action(request=request, action="approved society", action_type="approve",
                   target=society.name, target_type="society", target_id=str(society.pk))
        return Response({"success": True, "message": "Society approved and activated.", "data": SocietyManagementSerializer(society).data})

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        """POST /<id>/suspend/ — Active → Suspended."""
        society = self.get_object()
        if society.status == Society.Status.SUSPENDED:
            return Response({"detail": "Society is already suspended."}, status=400)
        society.status = Society.Status.SUSPENDED
        society.save(update_fields=["status", "updated_at"])
        logger.info("SOCIETY_SUSPEND | id=%s by=%s", society.pk, request.user)
        log_action(request=request, action="suspended society", action_type="suspend",
                   target=society.name, target_type="society", target_id=str(society.pk))
        return Response({"success": True, "message": "Society suspended.", "data": SocietyManagementSerializer(society).data})

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        """POST /<id>/activate/ — Suspended/Inactive/Pending → Active."""
        society = self.get_object()
        if society.status == Society.Status.ACTIVE:
            return Response({"detail": "Society is already active."}, status=400)
        society.status = Society.Status.ACTIVE
        society.save(update_fields=["status", "updated_at"])
        logger.info("SOCIETY_ACTIVATE | id=%s by=%s", society.pk, request.user)
        log_action(request=request, action="activated society", action_type="activate",
                   target=society.name, target_type="society", target_id=str(society.pk))
        return Response({"success": True, "message": "Society activated.", "data": SocietyManagementSerializer(society).data})

    # ── Delete (guarded) ──────────────────────────────────────────────────────

    def destroy(self, request, *args, **kwargs):
        society = self.get_object()
        user_count = society.user_profiles.count()
        if user_count > 0:
            return Response(
                {"detail": f"Cannot delete — {user_count} user{'s' if user_count != 1 else ''} linked to this society. Suspend instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = society.name
        society.delete()
        logger.info("SOCIETY_DELETE | name=%s by=%s", name, request.user)
        log_action(request=request, action="deleted society", action_type="delete",
                   target=name, target_type="society")
        return Response({"success": True, "message": f"Society '{name}' deleted."}, status=status.HTTP_200_OK)