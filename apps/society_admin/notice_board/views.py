import logging
from datetime import date

from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSocietyAdmin
from apps.platform_admin.create_society.models import Society

from .models import Notice, NoticeRead
from .serializers import (
    NoticeDashboardSerializer,
    NoticeReadSerializer,
    NoticeSerializer,
)

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


class NoticeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSocietyAdmin]
    """
    Notice Board — society-scoped CRUD.

    GET    /api/society-admin/notice-board/            List notices
    POST   /api/society-admin/notice-board/            Create notice (Send notification)
    GET    /api/society-admin/notice-board/{id}/       Retrieve notice
    PATCH  /api/society-admin/notice-board/{id}/       Update notice
    DELETE /api/society-admin/notice-board/{id}/       Delete notice
    POST   /api/society-admin/notice-board/{id}/archive/      Archive
    POST   /api/society-admin/notice-board/{id}/activate/     Re-activate
    POST   /api/society-admin/notice-board/{id}/mark-read/    Mark as read
    GET    /api/society-admin/notice-board/{id}/read-receipts/ Who read it
    """

    serializer_class = NoticeSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "audience", "status", "building"]   # 'society' removed
    search_fields    = ["title", "description"]
    ordering_fields  = ["created_at", "event_date", "title", "status"]
    ordering         = ["-created_at"]

    def get_queryset(self):
        society = _admin_society(self.request)
        return (
            Notice.objects
            .filter(society=society)
            .select_related("society", "building", "created_by", "created_by__user")
            .prefetch_related("reads")
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        society = _admin_society(self.request)
        try:
            profile = self.request.user.profile
        except Exception:
            profile = None
        notice = serializer.save(society=society, created_by=profile)
        logger.info(
            "NOTICE_CREATE | id=%s category=%s society=%s by=%s",
            notice.pk, notice.category, society.pk, self.request.user,
        )

    def perform_update(self, serializer):
        notice = serializer.save()
        logger.info("NOTICE_UPDATE | id=%s by=%s", notice.pk, self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        logger.info("NOTICE_DELETE | id=%s by=%s", instance.pk, request.user)
        instance.delete()
        return Response({"success": True, "message": "Notice deleted."})

    # ── Archive / Activate ────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        """POST /api/society-admin/notice-board/{id}/archive/"""
        notice = self.get_object()
        notice.status = Notice.Status.ARCHIVED
        notice.save(update_fields=["status"])
        logger.info("NOTICE_ARCHIVE | id=%s by=%s", notice.pk, request.user)
        return Response({"success": True, "data": NoticeSerializer(notice).data})

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        """POST /api/society-admin/notice-board/{id}/activate/"""
        notice = self.get_object()
        notice.status = Notice.Status.ACTIVE
        notice.save(update_fields=["status"])
        logger.info("NOTICE_ACTIVATE | id=%s by=%s", notice.pk, request.user)
        return Response({"success": True, "data": NoticeSerializer(notice).data})

    # ── Read receipts ─────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        """POST /api/society-admin/notice-board/{id}/mark-read/  Body: { "resident": <id> }"""
        notice = self.get_object()
        resident_id = request.data.get("resident")
        if not resident_id:
            return Response(
                {"detail": "resident (profile id) is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        read_obj, created = NoticeRead.objects.get_or_create(
            notice=notice, resident_id=resident_id,
        )
        logger.info("NOTICE_READ | notice=%s resident=%s", notice.pk, resident_id)
        return Response(
            NoticeReadSerializer(read_obj).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="read-receipts")
    def read_receipts(self, request, pk=None):
        """GET /api/society-admin/notice-board/{id}/read-receipts/"""
        notice = self.get_object()
        reads  = notice.reads.select_related("resident").order_by("-read_at")
        return Response({"count": reads.count(), "results": NoticeReadSerializer(reads, many=True).data})


# ── Dashboard ─────────────────────────────────────────────────────────────────

class NoticeDashboardView(APIView):
    permission_classes = [IsSocietyAdmin]

    def get(self, request):
        """
        GET /api/society-admin/notice-board/dashboard/
        No params needed — auto-scoped to the admin's own society.

        Returns the 4 stat cards:
          active_notices    → "3  Active Notices"
          live_fundraisers  → "1  Live Fundraisers"
          upcoming_events   → "0  Upcoming Events"
          unread_notices    → "1  Unread by Residents"
                              (notices with 0 resident reads)
        """
        society   = _admin_society(request)
        today     = date.today()

        qs        = Notice.objects.filter(society=society)
        active_qs = qs.filter(status=Notice.Status.ACTIVE)

        # Notices that have NOT been read by any resident yet
        read_notice_ids = (
            NoticeRead.objects
            .filter(notice__society=society)
            .values_list("notice_id", flat=True)
            .distinct()
        )
        unread_notices = active_qs.exclude(id__in=read_notice_ids).count()

        by_category = list(
            active_qs.values("category").annotate(count=Count("id")).order_by("-count")
        )
        by_audience = list(
            active_qs.values("audience").annotate(count=Count("id")).order_by("-count")
        )

        data = {
            "active_notices":     active_qs.count(),
            "live_fundraisers":   active_qs.filter(category=Notice.Category.FUNDRAISER).count(),
            "upcoming_events":    active_qs.filter(
                                      category=Notice.Category.EVENT,
                                      event_date__gte=today,
                                  ).count(),
            "maintenance_alerts": active_qs.filter(category=Notice.Category.MAINTENANCE).count(),
            "total_unread":       unread_notices,
            "by_category":        by_category,
            "by_audience":        by_audience,
        }
        return Response({"success": True, "data": NoticeDashboardSerializer(data).data})
