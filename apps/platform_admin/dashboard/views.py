import logging

from django.db.models import Count, Q
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ReadOnlyModelViewSet
from apps.common.permissions import IsSuperAdmin

from apps.platform_admin.create_society.models import Society

from .serializers import DashboardStatsSerializer, SocietyDashboardSerializer

logger = logging.getLogger(__name__)


class DashboardStatsView(APIView):
    """GET /api/platform-admin/dashboard/stats/ — platform-wide KPIs."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        data = DashboardStatsSerializer.build()
        return Response({"success": True, "data": DashboardStatsSerializer(data).data})


class _SocietyPagination(PageNumberPagination):
    page_size            = 20
    page_size_query_param = "page_size"
    max_page_size        = 100


class DashboardSocietyListView(ReadOnlyModelViewSet):
    """
    GET /api/platform-admin/dashboard/societies/
    Filterable, searchable, paginated society list with annotated KPIs.

    Query params:
      ?search=       name / city icontains
      ?status=       active | inactive
      ?plan=         free | pro | enterprise
      ?city=         city ID
      ?ordering=     name | -created_at | user_count | open_tickets
      ?page=         page number
      ?page_size=    page size (max 100)
    """
    permission_classes = [IsSuperAdmin]

    serializer_class   = SocietyDashboardSerializer
    pagination_class   = _SocietyPagination
    filter_backends    = [SearchFilter, OrderingFilter]
    search_fields      = ["name", "city__name"]
    ordering_fields    = ["name", "created_at", "user_count", "open_tickets"]
    ordering           = ["-created_at"]

    def get_queryset(self):
        qs = Society.objects.select_related("city").annotate(
            user_count=Count(
                "user_profiles",
                filter=Q(user_profiles__status="active"),
                distinct=True,
            ),
            open_tickets=Count(
                "support_tickets",
                filter=Q(support_tickets__status__in=["open", "in_progress"]),
                distinct=True,
            ),
        )

        params = self.request.query_params

        if status := params.get("status"):
            qs = qs.filter(status=status)

        if plan := params.get("plan"):
            qs = qs.filter(plan=plan)

        if city := params.get("city"):
            qs = qs.filter(city_id=city)

        return qs