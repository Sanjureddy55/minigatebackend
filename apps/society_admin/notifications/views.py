import logging

from django.db.models import Count
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsSocietyAdmin

from .models import Notification
from .serializers import NotificationSerializer, NotificationStatsSerializer

logger = logging.getLogger(__name__)


class NotificationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    """
    Full CRUD for in-app notifications.

    Typical usage:
      GET  /api/society-admin/notifications/?recipient=<profile_id>   — inbox
      POST /api/society-admin/notifications/{id}/mark-read/           — mark read
      POST /api/society-admin/notifications/mark-all-read/            — bulk mark read
    """
    queryset = (
        Notification.objects
        .select_related("recipient", "recipient__user", "society", "notice")
        .order_by("-created_at")
    )
    serializer_class = NotificationSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["recipient", "society", "notif_type", "is_read"]
    search_fields    = ["title", "body"]
    ordering_fields  = ["created_at", "is_read", "notif_type"]
    ordering         = ["-created_at"]

    def perform_create(self, serializer):
        notif = serializer.save()
        logger.info(
            "NOTIF_CREATE | id=%s type=%s recipient=%s",
            notif.pk, notif.notif_type, notif.recipient_id,
        )

    def perform_destroy(self, instance):
        logger.info("NOTIF_DELETE | id=%s title=%s", instance.pk, instance.title)
        instance.delete()

    # ── Custom actions ────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        if not notif.is_read:
            notif.is_read = True
            notif.read_at = timezone.now()
            notif.save(update_fields=["is_read", "read_at"])
            logger.info("NOTIF_READ | id=%s recipient=%s", notif.pk, notif.recipient_id)
        return Response(NotificationSerializer(notif).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        """Mark all unread notifications for a recipient as read.

        Body: { "recipient": <profile_id> }
        """
        recipient_id = request.data.get("recipient")
        if not recipient_id:
            return Response(
                {"detail": "recipient (profile id) is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        now = timezone.now()
        updated = Notification.objects.filter(
            recipient_id=recipient_id, is_read=False
        ).update(is_read=True, read_at=now)
        logger.info("NOTIF_READ_ALL | recipient=%s count=%s", recipient_id, updated)
        return Response({"marked_read": updated})


class NotificationStatsView(APIView):
    permission_classes = [IsSocietyAdmin]
    """GET /api/society-admin/notifications/stats/?recipient=<id>"""

    def get(self, request):
        recipient_id = request.query_params.get("recipient")
        qs = Notification.objects.all()
        if recipient_id:
            qs = qs.filter(recipient_id=recipient_id)

        by_type = list(qs.values("notif_type").annotate(count=Count("id")).order_by("-count"))

        data = {
            "total":   qs.count(),
            "unread":  qs.filter(is_read=False).count(),
            "by_type": by_type,
        }
        return Response(NotificationStatsSerializer(data).data)