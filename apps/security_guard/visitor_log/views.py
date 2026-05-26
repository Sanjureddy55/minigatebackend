import logging

from django.db.models import Q
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSecurityGuard
from apps.society_admin.visitors.models import Visitor
from apps.society_admin.visitors.serializers import VisitorRejectSerializer, VisitorSerializer

logger = logging.getLogger(__name__)


class VisitorLogListView(APIView):
    """
    GET /api/security-guard/visitor-log/

    List all visitors for the guard's society.
    Filters: ?status=pending|approved|inside|exited|rejected
             ?visit_type=guest|delivery|cab|service|other
             ?date=YYYY-MM-DD
             ?search=<name or mobile>
             ?page_size=30
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = (
            Visitor.objects
            .filter(society_id=society_id)
            .select_related("flat", "flat__building", "approved_by")
            .order_by("-created_at")
        )

        visitor_status = request.query_params.get("status")
        visit_type     = request.query_params.get("visit_type")
        date_str       = request.query_params.get("date")
        search         = request.query_params.get("search")

        if visitor_status:
            qs = qs.filter(status=visitor_status)
        if visit_type:
            qs = qs.filter(visit_type=visit_type)
        if date_str:
            qs = qs.filter(created_at__date=date_str)
        if search:
            qs = qs.filter(Q(full_name__icontains=search) | Q(mobile__icontains=search))

        paginator           = PageNumberPagination()
        paginator.page_size = int(request.query_params.get("page_size", 30))
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            return paginator.get_paginated_response(VisitorSerializer(page, many=True).data)
        return Response({"success": True, "count": qs.count(), "results": VisitorSerializer(qs, many=True).data})


class VisitorCheckInView(APIView):
    """
    POST /api/security-guard/visitor-log/<id>/check-in/

    Transition: APPROVED → INSIDE. Records checked_in_at.
    """
    permission_classes = [IsSecurityGuard]

    def post(self, request, pk):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        try:
            visitor = Visitor.objects.get(pk=pk, society_id=society_id)
        except Visitor.DoesNotExist:
            return Response({"success": False, "message": "Visitor not found."}, status=404)

        if visitor.status != Visitor.Status.APPROVED:
            return Response(
                {"success": False, "message": f"Cannot check in visitor with status '{visitor.status}'."},
                status=400,
            )

        visitor.status        = Visitor.Status.INSIDE
        visitor.checked_in_at = timezone.now()
        visitor.save(update_fields=["status", "checked_in_at", "updated_at"])

        logger.info("VISITOR_CHECKIN | id=%s society=%s by=%s", pk, society_id, request.user.profile.pk)
        return Response({"success": True, "message": "Visitor checked in.", "data": VisitorSerializer(visitor).data})


class VisitorCheckOutView(APIView):
    """
    POST /api/security-guard/visitor-log/<id>/check-out/

    Transition: INSIDE → EXITED. Records checked_out_at.
    """
    permission_classes = [IsSecurityGuard]

    def post(self, request, pk):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        try:
            visitor = Visitor.objects.get(pk=pk, society_id=society_id)
        except Visitor.DoesNotExist:
            return Response({"success": False, "message": "Visitor not found."}, status=404)

        if visitor.status != Visitor.Status.INSIDE:
            return Response(
                {"success": False, "message": f"Cannot check out visitor with status '{visitor.status}'."},
                status=400,
            )

        visitor.status         = Visitor.Status.EXITED
        visitor.checked_out_at = timezone.now()
        visitor.save(update_fields=["status", "checked_out_at", "updated_at"])

        logger.info("VISITOR_CHECKOUT | id=%s society=%s by=%s", pk, society_id, request.user.profile.pk)
        return Response({"success": True, "message": "Visitor checked out.", "data": VisitorSerializer(visitor).data})


class VisitorApproveView(APIView):
    """
    POST /api/security-guard/visitor-log/<id>/approve/

    Guard approves a PENDING visitor: PENDING → APPROVED.
    """
    permission_classes = [IsSecurityGuard]

    def post(self, request, pk):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        try:
            visitor = Visitor.objects.get(pk=pk, society_id=society_id)
        except Visitor.DoesNotExist:
            return Response({"success": False, "message": "Visitor not found."}, status=404)

        if visitor.status != Visitor.Status.PENDING:
            return Response(
                {"success": False, "message": f"Visitor is not pending (current: {visitor.status})."},
                status=400,
            )

        visitor.status      = Visitor.Status.APPROVED
        visitor.approved_by = request.user.profile
        visitor.save(update_fields=["status", "approved_by", "updated_at"])

        logger.info("VISITOR_APPROVE | id=%s society=%s by=%s", pk, society_id, request.user.profile.pk)
        return Response({"success": True, "message": "Visitor approved.", "data": VisitorSerializer(visitor).data})


class VisitorRejectView(APIView):
    """
    POST /api/security-guard/visitor-log/<id>/reject/

    Guard rejects a PENDING visitor: PENDING → REJECTED. Body: {"reason": "..."}
    """
    permission_classes = [IsSecurityGuard]

    def post(self, request, pk):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "No linked society."}, status=400)

        try:
            visitor = Visitor.objects.get(pk=pk, society_id=society_id)
        except Visitor.DoesNotExist:
            return Response({"success": False, "message": "Visitor not found."}, status=404)

        if visitor.status != Visitor.Status.PENDING:
            return Response(
                {"success": False, "message": f"Visitor is not pending (current: {visitor.status})."},
                status=400,
            )

        ser = VisitorRejectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        visitor.status          = Visitor.Status.REJECTED
        visitor.rejected_reason = ser.validated_data["reason"]
        visitor.save(update_fields=["status", "rejected_reason", "updated_at"])

        logger.info("VISITOR_REJECT | id=%s society=%s by=%s", pk, society_id, request.user.profile.pk)
        return Response({"success": True, "message": "Visitor rejected.", "data": VisitorSerializer(visitor).data})
