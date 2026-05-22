import logging

from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.common.permissions import IsResident

from .models import Complaint
from .serializers import ComplaintSerializer

logger = logging.getLogger(__name__)


class ComplaintViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResident]
    """
    Resident — file and track complaints.

    GET    /api/resident/complaints/
    POST   /api/resident/complaints/
    GET    /api/resident/complaints/{id}/
    PUT    /api/resident/complaints/{id}/
    PATCH  /api/resident/complaints/{id}/
    DELETE /api/resident/complaints/{id}/
    POST   /api/resident/complaints/{id}/resolve/
    POST   /api/resident/complaints/{id}/close/
    """

    serializer_class = ComplaintSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["resident", "flat", "society", "category", "status", "priority"]
    search_fields    = ["title", "description"]
    ordering_fields  = ["created_at", "priority", "status"]
    ordering         = ["-created_at"]

    def get_queryset(self):
        return (
            Complaint.objects
            .select_related("resident", "flat", "society", "assigned_to")
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(ComplaintSerializer(page, many=True).data)
        return Response({"count": qs.count(), "results": ComplaintSerializer(qs, many=True).data})

    def create(self, request, *args, **kwargs):
        ser = ComplaintSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        logger.info("COMPLAINT_CREATE | id=%s title='%s' resident=%s", obj.pk, obj.title, obj.resident_id)
        return Response(
            {"success": True, "message": "Complaint filed.", "data": ComplaintSerializer(obj).data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "data": ComplaintSerializer(self.get_object()).data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        ser = ComplaintSerializer(self.get_object(), data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        return Response({"success": True, "data": ComplaintSerializer(ser.save()).data})

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.delete()
        return Response({"success": True, "message": "Complaint deleted."})

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        """POST /api/resident/complaints/{id}/resolve/ — mark resolved."""
        obj = self.get_object()
        obj.status      = Complaint.Status.RESOLVED
        obj.resolved_at = timezone.now()
        obj.resolution_notes = request.data.get("resolution_notes", obj.resolution_notes)
        obj.save(update_fields=["status", "resolved_at", "resolution_notes", "updated_at"])
        logger.info("COMPLAINT_RESOLVED | id=%s", obj.pk)
        return Response({"success": True, "message": "Complaint resolved.", "data": ComplaintSerializer(obj).data})

    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request, pk=None):
        """POST /api/resident/complaints/{id}/close/ — close the complaint."""
        obj = self.get_object()
        obj.status = Complaint.Status.CLOSED
        obj.save(update_fields=["status", "updated_at"])
        return Response({"success": True, "message": "Complaint closed.", "data": ComplaintSerializer(obj).data})