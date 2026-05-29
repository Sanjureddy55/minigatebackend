import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import IsSocietyAdmin
from apps.platform_admin.create_society.models import Society
from apps.resident.profile.models import ResidentFlat

from .models import Flat
from .serializers import FlatBulkAddSerializer, FlatCreateSerializer, FlatSerializer

logger = logging.getLogger(__name__)


def _admin_society(request):
    try:
        sid = request.user.profile.society_id
        if not sid:
            raise ValueError
        return Society.objects.get(pk=sid)
    except Exception:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Your account is not linked to any society.")


class FlatViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    serializer_class   = FlatSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ["building"]          # 'society' removed — auto-scoped
    search_fields      = ["flat_number", "building__name"]
    ordering_fields    = ["flat_number", "created_at"]
    ordering           = ["building__name", "flat_number"]

    def get_queryset(self):
        society = _admin_society(self.request)
        qs = (
            Flat.objects
            .filter(building__society=society)
            .select_related("building", "building__society")
            .prefetch_related(
                "resident_occupants",
                "resident_occupants__profile",
            )
            .order_by("building__name", "flat_number")
        )
        # ?floor=1  → filter flats on that floor
        # Flat naming: PREFIX-{floor}{unit:02d}  e.g. A-101, A-1001
        floor = self.request.query_params.get("floor", "").strip()
        if floor and floor.isdigit():
            qs = qs.filter(flat_number__iregex=rf"-{floor}\d{{2}}$")
        return qs

    # ── Dashboard (3 stat cards in UI) ────────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        """
        GET /api/society-admin/flats/dashboard/
        Returns: Total, Occupied, Vacant flat counts.
        """
        society = _admin_society(request)

        all_flats  = Flat.objects.filter(building__society=society)
        total      = all_flats.count()

        # Occupied = flat has at least one ACTIVE ResidentFlat
        occupied_flat_ids = (
            ResidentFlat.objects
            .filter(society=society, status=ResidentFlat.Status.ACTIVE)
            .values_list("flat_id", flat=True)
            .distinct()
        )
        occupied = len(set(occupied_flat_ids))
        vacant   = total - occupied

        return Response({
            "success": True,
            "data": {
                "total":    total,
                "occupied": occupied,
                "vacant":   vacant,
            },
        })

    # ── Add Flat (simple form — building by name) ─────────────────────────────

    @action(detail=False, methods=["post"], url_path="add")
    def add(self, request):
        """
        POST /api/society-admin/flats/add/

        Simple 'Add Flat' form — matches the UI.
        Building is passed by NAME (not UUID).

        Body:
          {
            "flat_number": "A-402",
            "building":    "Block A"
          }
        """
        society = _admin_society(request)
        ser = FlatCreateSerializer(
            data=request.data,
            context={"request": request, "society": society},
        )
        ser.is_valid(raise_exception=True)

        flat = Flat.objects.create(
            flat_number = ser.validated_data["flat_number"],
            building    = ser.validated_data["building_obj"],
        )
        logger.info(
            "FLAT_ADD | flat=%s building=%s society=%s by=%s",
            flat.pk, flat.building.pk, society.pk, request.user,
        )
        # Re-fetch with prefetch for serializer
        flat = (
            Flat.objects
            .prefetch_related("resident_occupants", "resident_occupants__profile")
            .select_related("building", "building__society")
            .get(pk=flat.pk)
        )
        return Response(
            {
                "success": True,
                "message": f"Flat '{flat.flat_number}' added to {flat.building.name}.",
                "data":    FlatSerializer(flat).data,
            },
            status=status.HTTP_201_CREATED,
        )

    # ── Bulk Add ──────────────────────────────────────────────────────────────

    @action(detail=False, methods=["post"], url_path="bulk-add")
    def bulk_add(self, request):
        """
        POST /api/society-admin/flats/bulk-add/

        Add multiple flats at once — two modes:

        MODE 1 — Floor range (auto-generates names):
          {
            "building":        "Block A",
            "floor_from":      1,
            "floor_to":        10,
            "flats_per_floor": 4
          }
          → Creates A-101 … A-1004  (40 flats)

        MODE 2 — Explicit list:
          {
            "building":     "Block A",
            "flat_numbers": ["A-101", "A-102", "A-201", "A-202"]
          }

        Max 500 flats per request.
        Existing flats are skipped (no error).
        """
        society = _admin_society(request)
        ser = FlatBulkAddSerializer(
            data=request.data,
            context={"request": request, "society": society},
        )
        ser.is_valid(raise_exception=True)

        building     = ser.validated_data["building_obj"]
        flat_numbers = ser.validated_data["_flat_numbers"]

        # Skip already-existing flats
        existing = set(
            Flat.objects
            .filter(building=building, flat_number__in=flat_numbers)
            .values_list("flat_number", flat=True)
        )
        to_create = [
            Flat(building=building, flat_number=fn)
            for fn in flat_numbers
            if fn not in existing
        ]

        created = Flat.objects.bulk_create(to_create, ignore_conflicts=True)

        logger.info(
            "FLAT_BULK_ADD | building=%s created=%d skipped=%d by=%s",
            building.pk, len(created), len(existing), request.user,
        )
        return Response(
            {
                "success":  True,
                "message":  f"{len(created)} flat(s) created in {building.name}.",
                "created":  len(created),
                "skipped":  len(existing),
                "skipped_numbers": sorted(existing) if existing else [],
                "building": building.name,
            },
            status=status.HTTP_201_CREATED,
        )
