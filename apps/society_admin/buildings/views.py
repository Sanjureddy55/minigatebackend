import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from apps.common.permissions import IsSocietyAdmin
from apps.common.utils import get_society_id

from .models import Building
from .serializers import BuildingSerializer

logger = logging.getLogger(__name__)


class BuildingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    serializer_class = BuildingSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["society"]
    search_fields = ["name", "society__name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        qs = (
            Building.objects
            .select_related("society", "society__city")
            .prefetch_related("flats")
            .order_by("name")
        )
        society_id = get_society_id(self.request)
        if society_id:
            qs = qs.filter(society_id=society_id)
        return qs