import logging
from datetime import date

from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsSocietyAdmin

from apps.common.utils import get_society_id

from .models import Notice, NoticeRead
from .serializers import (
    NoticeDashboardSerializer,
    NoticeReadSerializer,
    NoticeSerializer,
)

logger = logging.getLogger(__name__)


class NoticeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    queryset = (
        Notice.objects
        .select_related("society", "building", "created_by", "created_by__user")
        .prefetch_related("reads")
        .order_by("-created_at")
    )
    serializer_class = NoticeSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["society", "category", "audience", "status", "building"]
    search_fields    = ["title", "description"]
    ordering_fields  = ["created_at", "event_date", "title", "status"]
    ordering         = ["-created_at"]

    def perform_create(self, serializer):
        try:
            profile = self.request.user.profile
        except Exception:
            profile = None
        notice = serializer.save(created_by=profile)
        logger.info(
            "NOTICE_CREATE | id=%s category=%s society=%s by=%s",
            notice.pk, notice.category, notice.society_id, self.request.user,
        )

    def perform_update(self, serializer):
        notice = serializer.save()
        logger.info(
            "NOTICE_UPDATE | id=%s category=%s by=%s",
            notice.pk, notice.category, self.request.user,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        logger.info(
            "NOTICE_DELETE | id=%s title=%s by=%s",
            instance.pk, instance.title, request.user,
        )
        instance.delete()
        return Response({"success": True, "message": "Notice deleted."})

    # ── Custom actions ────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        """Mark a notice as read by a specific resident.

        Body: { "resident": <profile_id> }
        """
        notice = self.get_object()
        resident_id = request.data.get("resident")
        if not resident_id:
            return Response(
                {"detail": "resident (profile id) is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        read_obj, created = NoticeRead.objects.get_or_create(
            notice=notice,
            resident_id=resident_id,
        )
        logger.info("NOTICE_READ | notice=%s resident=%s new=%s", notice.pk, resident_id, created)
        ser = NoticeReadSerializer(read_obj)
        return Response(ser.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="read-receipts")
    def read_receipts(self, request, pk=None):
        """List all residents who have read this notice."""
        notice = self.get_object()
        reads = notice.reads.select_related("resident", "resident__user").order_by("-read_at")
        ser = NoticeReadSerializer(reads, many=True)
        return Response({"count": reads.count(), "results": ser.data})

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        """Archive a notice (soft delete)."""
        notice = self.get_object()
        notice.status = Notice.Status.ARCHIVED
        notice.save(update_fields=["status"])
        logger.info("NOTICE_ARCHIVE | id=%s by=%s", notice.pk, request.user)
        return Response(NoticeSerializer(notice).data)

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        """Re-activate an inactive or archived notice."""
        notice = self.get_object()
        notice.status = Notice.Status.ACTIVE
        notice.save(update_fields=["status"])
        logger.info("NOTICE_ACTIVATE | id=%s by=%s", notice.pk, request.user)
        return Response(NoticeSerializer(notice).data)


class NoticeDashboardView(APIView):
    permission_classes = [IsSocietyAdmin]
    """GET /api/society-admin/notice-board/dashboard/?society=<id>"""

    def get(self, request):
        society_id = get_society_id(request)
        qs = Notice.objects.all()
        if society_id:
            qs = qs.filter(society_id=society_id)

        today = date.today()
        active_qs = qs.filter(status=Notice.Status.ACTIVE)

        by_category = list(
            active_qs.values("category").annotate(count=Count("id")).order_by("-count")
        )
        by_audience = list(
            active_qs.values("audience").annotate(count=Count("id")).order_by("-count")
        )

        total_unread = NoticeRead.objects.filter(
            notice__in=active_qs
        ).count()

        data = {
            "active_notices":     active_qs.count(),
            "live_fundraisers":   active_qs.filter(category=Notice.Category.FUNDRAISER).count(),
            "upcoming_events":    active_qs.filter(category=Notice.Category.EVENT, event_date__gte=today).count(),
            "maintenance_alerts": active_qs.filter(category=Notice.Category.MAINTENANCE).count(),
            "total_unread":       total_unread,
            "by_category":        by_category,
            "by_audience":        by_audience,
        }
        return Response(NoticeDashboardSerializer(data).data)