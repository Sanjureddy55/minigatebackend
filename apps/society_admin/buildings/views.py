import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import IsSocietyAdmin
from apps.platform_admin.create_society.models import Society
from apps.society_admin.flats.models import Flat

from .models import Building
from .serializers import BuildingSerializer

logger = logging.getLogger(__name__)


def _admin_society(request):
    """Returns the Society for the logged-in admin. Raises 403 if not linked."""
    try:
        sid = request.user.profile.society_id
        if not sid:
            raise ValueError
        return Society.objects.get(pk=sid)
    except Exception:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Your account is not linked to any society.")


class BuildingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    serializer_class   = BuildingSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ["status"]          # 'society' removed — auto-scoped
    search_fields      = ["name"]
    ordering_fields    = ["name", "created_at"]
    ordering           = ["name"]

    def get_queryset(self):
        society = _admin_society(self.request)
        return (
            Building.objects
            .filter(society=society)
            .select_related("society", "society__city")
            .prefetch_related("flats")
            .order_by("name")
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        try:
            ctx["society"] = _admin_society(self.request)
        except Exception:
            pass
        return ctx

    def perform_create(self, serializer):
        society = _admin_society(self.request)
        building = serializer.save(society=society)
        logger.info("BUILDING_CREATE | building=%s society=%s by=%s", building.pk, society.pk, self.request.user)

        # Auto-generate flats if total_floors and flats_per_floor provided
        total_floors    = self.request.data.get("total_floors", 0)
        flats_per_floor = int(self.request.data.get("flats_per_floor", 0))
        if total_floors and flats_per_floor:
            self._generate_flats(building, int(total_floors), flats_per_floor)

    def perform_update(self, serializer):
        building = serializer.save()
        logger.info("BUILDING_UPDATE | building=%s by=%s", building.pk, self.request.user)

    def _generate_flats(self, building, total_floors: int, flats_per_floor: int):
        """
        Auto-creates flat records for a new building.
        Naming convention: {building_prefix}-{floor}{unit}
          e.g. Block A → A, Tower B → B
          Flat A-101, A-102 ... A-201, A-202 ...
        """
        parts  = building.name.strip().split()
        prefix = parts[-1] if len(parts) > 1 else parts[0]
        prefix = prefix[0].upper()   # "Block A" → "A", "Tower" → "T"

        flats_to_create = []
        for floor in range(1, total_floors + 1):
            for unit in range(1, flats_per_floor + 1):
                flat_number = f"{prefix}-{floor}{unit:02d}"
                flats_to_create.append(
                    Flat(building=building, flat_number=flat_number)
                )

        Flat.objects.bulk_create(flats_to_create, ignore_conflicts=True)
        logger.info(
            "FLATS_AUTO_CREATED | building=%s floors=%d flats_per_floor=%d total=%d",
            building.pk, total_floors, flats_per_floor, len(flats_to_create),
        )

    # ── Dashboard (stat cards in the UI) ─────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        """
        GET /api/society-admin/buildings/dashboard/
        Returns: Buildings, Floors, Flats counts (the 3 stat cards in the UI).
        """
        society  = _admin_society(request)
        qs       = Building.objects.filter(society=society).prefetch_related("flats")

        total_buildings = qs.count()
        total_floors    = sum(b.total_floors for b in qs)
        total_flats     = Flat.objects.filter(building__society=society).count()

        return Response({
            "success": True,
            "data": {
                "buildings": total_buildings,
                "floors":    total_floors,
                "flats":     total_flats,
            },
        })
