import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from apps.common.permissions import IsSocietyAdmin
from apps.common.utils import get_society_id

from .models import Flat
from .serializers import FlatSerializer

logger = logging.getLogger(__name__)


class FlatViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    serializer_class = FlatSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["building", "building__society"]
    search_fields = ["flat_number", "building__name", "building__society__name"]
    ordering_fields = ["flat_number", "created_at"]
    ordering = ["building__name", "flat_number"]

    def get_queryset(self):
        qs = (
            Flat.objects
            .select_related("building", "building__society", "building__society__city")
            .order_by("building__name", "flat_number")
        )
        society_id = get_society_id(self.request)
        if society_id:
            qs = qs.filter(building__society_id=society_id)
        return qs