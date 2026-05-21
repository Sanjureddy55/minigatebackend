import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from .filters import SocietyFilter
from .models import Society
from .serializers import SocietySerializer

# Module-level logger — name resolves to apps.platform_admin.create_society.views
# Output controlled by the "apps" logger in settings.LOGGING.
logger = logging.getLogger(__name__)


class SocietyViewSet(viewsets.ModelViewSet):
    """
    Full CRUD ViewSet for Society.

    All endpoints live under /api/platform-admin/create-society/

        GET    societies/                    → list (filterable, searchable, orderable)
        POST   societies/                    → create
        GET    societies/{id}/               → retrieve
        PUT    societies/{id}/               → full update
        PATCH  societies/{id}/               → partial update
        DELETE societies/{id}/               → destroy
        PATCH  societies/{id}/toggle-status/ → flip Active ↔ Inactive

    Supported query parameters for GET /societies/:
        ?status=active          filter by status (active | inactive)
        ?plan=pro               filter by plan (free | pro | enterprise)
        ?city=pune              case-insensitive city match
        ?name=sunrise           case-insensitive name match
        ?created_after=2026-01-01
        ?created_before=2026-12-31
        ?search=<term>          searches name and city simultaneously
        ?ordering=name          sort ascending; -name for descending
    """

    serializer_class = SocietySerializer
    # No permission enforcement during the planning phase.
    # AllowAny is already the global default in settings REST_FRAMEWORK.
    permission_classes = []

    # DjangoFilterBackend drives declarative filtering via SocietyFilter.
    # SearchFilter and OrderingFilter are scoped explicitly to this ViewSet
    # rather than relying solely on the global DEFAULT_FILTER_BACKENDS.
    filterset_class = SocietyFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    # SearchFilter searches across these model fields with ?search=<term>
    search_fields = ["name", "city", "admin_email"]

    # OrderingFilter allows ?ordering=name,-created_at etc.
    ordering_fields = ["name", "city", "plan", "status", "created_at", "total_flats"]
    ordering = ["-created_at"]     # default sort when ?ordering is not supplied

    def get_queryset(self):
        # select_related is handled inside SocietyFilter.qs (see filters.py).
        # This base queryset is the starting point before filter_backends apply.
        return Society.objects.select_related("society_admin").all()

    # ── List ─────────────────────────────────────────────────────────────────

    def list(self, request, *args, **kwargs):
        active_filters = {k: v for k, v in request.query_params.items()}
        logger.info(
            "LIST societies | user=%s | filters=%s",
            request.user,
            active_filters or "none",
        )
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            logger.info("LIST societies | paginated | page_size=%d", len(page))
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        total = queryset.count()
        logger.info("LIST societies | returned %d record(s)", total)
        return Response({"success": True, "count": total, "results": serializer.data})

    # ── Create ───────────────────────────────────────────────────────────────

    def create(self, request, *args, **kwargs):
        logger.info(
            "CREATE society | user=%s | name='%s' city='%s'",
            request.user,
            request.data.get("name", "—"),
            request.data.get("city", "—"),
        )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        society = serializer.save()
        logger.info(
            "CREATE society | success | id=%s name='%s' plan=%s",
            society.pk,
            society.name,
            society.plan,
        )
        return Response(
            {
                "success": True,
                "message": "Society created successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    # ── Retrieve ─────────────────────────────────────────────────────────────

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        logger.info(
            "RETRIEVE society | user=%s | id=%s name='%s'",
            request.user,
            instance.pk,
            instance.name,
        )
        serializer = self.get_serializer(instance)
        return Response({"success": True, "data": serializer.data})

    # ── Update (PUT / PATCH) ──────────────────────────────────────────────────

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        logger.info(
            "UPDATE society | user=%s | id=%s name='%s' | partial=%s",
            request.user,
            instance.pk,
            instance.name,
            partial,
        )
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        label = "partially updated" if partial else "updated"
        logger.info(
            "UPDATE society | success | id=%s name='%s' (%s)",
            instance.pk,
            instance.name,
            label,
        )
        return Response(
            {
                "success": True,
                "message": f"Society {label} successfully.",
                "data": serializer.data,
            }
        )

    # ── Destroy ───────────────────────────────────────────────────────────────

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        society_id = instance.pk
        society_name = instance.name
        # WARNING level — deletion is irreversible and audit-worthy.
        logger.warning(
            "DELETE society | user=%s | id=%s name='%s'",
            request.user,
            society_id,
            society_name,
        )
        instance.delete()
        logger.info("DELETE society | success | id=%s name='%s'", society_id, society_name)
        return Response(
            {
                "success": True,
                "message": f"Society '{society_name}' deleted successfully.",
            },
            status=status.HTTP_200_OK,
        )

    # ── Custom: toggle Active ↔ Inactive in a single call ────────────────────

    @action(detail=True, methods=["patch"], url_path="toggle-status", url_name="toggle-status")
    def toggle_status(self, request, pk=None):
        """
        PATCH /societies/{id}/toggle-status/

        Flips the society status between Active and Inactive.
        No request body required — the new value is derived from the current one.
        """
        instance = self.get_object()
        old_status = instance.status
        instance.status = (
            Society.Status.INACTIVE
            if old_status == Society.Status.ACTIVE
            else Society.Status.ACTIVE
        )
        # Only write the two changed columns; leaves updated_at auto-refreshed.
        instance.save(update_fields=["status", "updated_at"])
        logger.info(
            "TOGGLE_STATUS society | user=%s | id=%s name='%s' | %s → %s",
            request.user,
            instance.pk,
            instance.name,
            old_status,
            instance.status,
        )
        serializer = self.get_serializer(instance)
        return Response(
            {
                "success": True,
                "message": (
                    f"Status changed from '{old_status}' to '{instance.status}'."
                ),
                "data": serializer.data,
            }
        )
