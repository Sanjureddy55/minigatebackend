import logging

from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsResident

from apps.society_admin.visitors.models import Visitor
from apps.society_admin.visitors.serializers import VisitorSerializer

from .models import GuestPass
from .serializers import GuestPassSerializer
from apps.common.utils import get_flat_id

logger = logging.getLogger(__name__)


class GuestPassViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResident]
    """
    Invite Guest — auto-scoped to the logged-in resident.

    GET    /api/resident/visitors/passes/            List (resident's own passes)
    POST   /api/resident/visitors/passes/            Generate pass (no flat/created_by in body)
    GET    /api/resident/visitors/passes/stats/      Stats: active, used_today, total_issued
    GET    /api/resident/visitors/passes/{id}/       Retrieve
    PATCH  /api/resident/visitors/passes/{id}/       Update (active passes only)
    DELETE /api/resident/visitors/passes/{id}/       Delete
    POST   /api/resident/visitors/passes/{id}/cancel/ Cancel an active pass
    """

    serializer_class = GuestPassSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["visit_type", "status"]
    search_fields    = ["full_name", "mobile", "pass_code", "vehicle_number"]
    ordering_fields  = ["visit_date", "created_at"]
    ordering         = ["-created_at"]

    def _profile_and_flat(self):
        """Returns (UserProfile, Flat) for the logged-in resident."""
        from apps.resident.profile.models import ResidentFlat
        profile = self.request.user.profile
        rf = (
            ResidentFlat.objects
            .filter(profile=profile, status=ResidentFlat.Status.ACTIVE)
            .order_by("-is_primary")
            .first()
        )
        flat = rf.flat if rf else None
        return profile, flat

    def get_queryset(self):
        profile, _ = self._profile_and_flat()
        return (
            GuestPass.objects
            .filter(created_by=profile)
            .select_related("flat")
            .order_by("-created_at")
        )

    # ── Stats (3 cards in UI) ─────────────────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """GET /api/resident/visitors/passes/stats/ — Active Passes, Used Today, Total Issued."""
        profile, _ = self._profile_and_flat()
        today = timezone.localdate()
        qs    = GuestPass.objects.filter(created_by=profile)
        active     = qs.filter(status=GuestPass.Status.ACTIVE).count()
        used_today = qs.filter(status=GuestPass.Status.USED, updated_at__date=today).count()
        total      = qs.count()
        return Response({
            "success": True,
            "data": {
                "active_passes": active,
                "used_today":    used_today,
                "total_issued":  total,
            },
        })

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def list(self, request, *args, **kwargs):
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        data = GuestPassSerializer(page if page is not None else qs, many=True).data
        if page is not None:
            return self.get_paginated_response(data)
        return Response({"count": len(data), "results": data})

    def create(self, request, *args, **kwargs):
        """
        POST /api/resident/visitors/passes/
        flat and created_by are auto-injected — no need to pass them in body.

        Body: { full_name, visit_type (opt), valid_until (opt),
                mobile (opt), vehicle_number (opt), notes_for_guard (opt),
                visit_date (opt), visit_time (opt), pass_validity (opt) }
        """
        profile, flat = self._profile_and_flat()
        if not flat:
            return Response(
                {"success": False, "message": "No active flat linked. Please link a flat first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = GuestPassSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save(flat=flat, created_by=profile)
        logger.info(
            "GUEST_PASS_CREATE | id=%s pass_code=%s visitor='%s' resident=%s",
            obj.pk, obj.pass_code, obj.full_name, profile.pk,
        )
        return Response(
            {"success": True, "message": "Guest pass generated.", "data": GuestPassSerializer(obj).data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "data": GuestPassSerializer(self.get_object()).data})

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != GuestPass.Status.ACTIVE:
            return Response(
                {"success": False, "message": "Only active passes can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = GuestPassSerializer(instance, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        return Response({"success": True, "data": GuestPassSerializer(ser.save()).data})

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        logger.info("GUEST_PASS_DELETE | by=%s", request.user)
        return Response({"success": True, "message": "Guest pass deleted."})

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """POST /api/resident/visitors/passes/{id}/cancel/"""
        obj = self.get_object()
        if obj.status != GuestPass.Status.ACTIVE:
            return Response(
                {"success": False, "message": "Only active passes can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj.status = GuestPass.Status.CANCELLED
        obj.save(update_fields=["status", "updated_at"])
        logger.info("GUEST_PASS_CANCEL | id=%s by=%s", obj.pk, request.user)
        return Response({"success": True, "message": "Guest pass cancelled.", "data": GuestPassSerializer(obj).data})


class ResidentVisitorApprovalView(APIView):
    permission_classes = [IsResident]
    """
    GET /api/resident/visitors/approvals/?flat=<uuid>

    Pending + approved-today visitors for a resident's flat.
    """

    def get(self, request):
        flat_id = get_flat_id(request)
        if not flat_id:
            return Response({"success": False, "message": "flat query param required."}, status=400)

        today = timezone.localdate()
        qs    = Visitor.objects.filter(flat_id=flat_id).select_related("flat", "approved_by")

        awaiting       = qs.filter(status=Visitor.Status.PENDING)
        approved_today = qs.filter(status=Visitor.Status.APPROVED, created_at__date=today)

        return Response({
            "success": True,
            "data": {
                "awaiting_count":       awaiting.count(),
                "approved_today_count": approved_today.count(),
                "awaiting":             VisitorSerializer(awaiting.order_by("-created_at"), many=True).data,
                "approved_today":       VisitorSerializer(approved_today.order_by("-created_at"), many=True).data,
            },
        })


class ResidentDeliveryApprovalView(APIView):
    permission_classes = [IsResident]
    """
    GET /api/resident/visitors/deliveries/?flat=<uuid>

    Delivery-type visitors for a flat, split by pending / completed.
    """

    def get(self, request):
        flat_id = get_flat_id(request)
        if not flat_id:
            return Response({"success": False, "message": "flat query param required."}, status=400)

        qs = (
            Visitor.objects
            .filter(flat_id=flat_id, visit_type=Visitor.VisitType.DELIVERY)
            .select_related("flat", "approved_by")
            .order_by("-created_at")
        )
        pending   = qs.filter(status=Visitor.Status.PENDING)
        completed = qs.exclude(status=Visitor.Status.PENDING)

        return Response({
            "success": True,
            "data": {
                "pending_count":   pending.count(),
                "completed_count": completed.count(),
                "pending":         VisitorSerializer(pending, many=True).data,
                "completed":       VisitorSerializer(completed[:20], many=True).data,
            },
        })


class ResidentEntryExitHistoryView(APIView):
    permission_classes = [IsResident]
    """
    GET /api/resident/visitors/history/?flat=<uuid>&page_size=20

    All processed visitors for the flat ordered by most recent activity.
    """

    def get(self, request):
        flat_id = get_flat_id(request)
        if not flat_id:
            return Response({"success": False, "message": "flat query param required."}, status=400)

        qs = (
            Visitor.objects
            .filter(flat_id=flat_id)
            .exclude(status=Visitor.Status.PENDING)
            .select_related("flat", "approved_by")
            .order_by("-created_at")
        )
        paginator           = PageNumberPagination()
        paginator.page_size = int(request.query_params.get("page_size", 20))
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            return paginator.get_paginated_response(VisitorSerializer(page, many=True).data)
        return Response({"success": True, "count": qs.count(), "results": VisitorSerializer(qs, many=True).data})