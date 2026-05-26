import logging

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSecurityGuard

from .models import DeliveryEntry
from .serializers import (
    DeliveryApproveSerializer,
    DeliveryAtGateSerializer,
    DeliveryCreateSerializer,
    DeliveryEntrySerializer,
    DeliveryOTPVerifySerializer,
    DeliveryRejectSerializer,
    DeliveryReturnSerializer,
    DeliverySummarySerializer,
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

TERMINAL_STATUSES = {
    DeliveryEntry.Status.APPROVED,
    DeliveryEntry.Status.REJECTED,
    DeliveryEntry.Status.RETURNED,
    DeliveryEntry.Status.COLLECTED,
}


def _sid(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


def _guard(request):
    try:
        return request.user.profile
    except Exception:
        return None


def _get_delivery(pk, society_id):
    """Fetch a DeliveryEntry scoped to this society, or return None."""
    try:
        return (
            DeliveryEntry.objects
            .select_related("flat", "flat__building", "processed_by", "approved_by", "collected_by")
            .get(pk=pk, society_id=society_id)
        )
    except DeliveryEntry.DoesNotExist:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# List + Create
# ─────────────────────────────────────────────────────────────────────────────

class DeliveryListCreateView(APIView):
    """
    GET  /api/security-guard/delivery-verify/
         List deliveries for the society.
         Filters: ?status= ?delivery_type= ?date=YYYY-MM-DD ?search= ?page_size=

    POST /api/security-guard/delivery-verify/
         Register a new delivery arrival at the gate.
         Body: agent_name, agent_mobile, company, delivery_type,
               flat (UUID) OR flat_number_raw, package_desc, photo_url, notes
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = (
            DeliveryEntry.objects
            .filter(society_id=society_id)
            .select_related("flat", "flat__building", "processed_by", "approved_by")
            .order_by("-arrived_at")
        )

        # Filters
        dstatus  = request.query_params.get("status")
        dtype    = request.query_params.get("delivery_type")
        date_str = request.query_params.get("date")
        search   = request.query_params.get("search")

        if dstatus:
            qs = qs.filter(status=dstatus)
        if dtype:
            qs = qs.filter(delivery_type=dtype)
        if date_str:
            qs = qs.filter(arrived_at__date=date_str)
        if search:
            qs = qs.filter(
                Q(agent_name__icontains=search)
                | Q(agent_mobile__icontains=search)
                | Q(company__icontains=search)
                | Q(flat_number_raw__icontains=search)
            )

        paginator           = PageNumberPagination()
        paginator.page_size = int(request.query_params.get("page_size", 30))
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            return paginator.get_paginated_response(DeliveryEntrySerializer(page, many=True).data)
        return Response({"success": True, "count": qs.count(), "results": DeliveryEntrySerializer(qs, many=True).data})

    def post(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        ser = DeliveryCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        delivery = ser.save(
            society_id=society_id,
            processed_by=_guard(request),
        )

        logger.info(
            "DELIVERY_REGISTER | id=%s society=%s agent='%s' type=%s flat=%s by=%s",
            delivery.pk, society_id, delivery.agent_name,
            delivery.delivery_type, delivery.flat_id or delivery.flat_number_raw,
            request.user.pk,
        )
        return Response(
            {"success": True, "message": "Delivery registered.", "data": DeliveryEntrySerializer(delivery).data},
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Retrieve
# ─────────────────────────────────────────────────────────────────────────────

class DeliveryDetailView(APIView):
    """
    GET /api/security-guard/delivery-verify/<id>/
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request, pk):
        delivery = _get_delivery(pk, _sid(request))
        if not delivery:
            return Response({"success": False, "message": "Delivery not found."}, status=404)
        return Response({"success": True, "data": DeliveryEntrySerializer(delivery).data})


# ─────────────────────────────────────────────────────────────────────────────
# Actions
# ─────────────────────────────────────────────────────────────────────────────

class DeliveryApproveView(APIView):
    """
    POST /api/security-guard/delivery-verify/<id>/approve/

    Manual approval — guard verbally confirms with resident (intercom / phone).
    Changes status PENDING → APPROVED.
    """
    permission_classes = [IsSecurityGuard]

    def post(self, request, pk):
        delivery = _get_delivery(pk, _sid(request))
        if not delivery:
            return Response({"success": False, "message": "Delivery not found."}, status=404)
        if delivery.status != DeliveryEntry.Status.PENDING:
            return Response(
                {"success": False, "message": f"Cannot approve — current status is '{delivery.status}'."},
                status=400,
            )

        ser = DeliveryApproveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        delivery.status      = DeliveryEntry.Status.APPROVED
        delivery.approved_by = _guard(request)
        delivery.resolved_at = timezone.now()
        if ser.validated_data.get("notes"):
            delivery.notes = ser.validated_data["notes"]
        delivery.save(update_fields=["status", "approved_by", "resolved_at", "notes"])

        logger.info("DELIVERY_APPROVE | id=%s by=%s", pk, request.user.pk)
        return Response({"success": True, "message": "Delivery approved.", "data": DeliveryEntrySerializer(delivery).data})


class DeliveryGenerateOTPView(APIView):
    """
    POST /api/security-guard/delivery-verify/<id>/generate-otp/

    Guard triggers OTP generation so the delivery agent can get the code
    from the resident (via phone call / app) and show it at the gate.
    Returns the OTP only in DEBUG mode; in production the OTP is
    communicated via the resident's notification.
    """
    permission_classes = [IsSecurityGuard]

    def post(self, request, pk):
        delivery = _get_delivery(pk, _sid(request))
        if not delivery:
            return Response({"success": False, "message": "Delivery not found."}, status=404)
        if delivery.status != DeliveryEntry.Status.PENDING:
            return Response(
                {"success": False, "message": f"OTP can only be generated for PENDING deliveries."},
                status=400,
            )

        otp = delivery.generate_otp()
        logger.info("DELIVERY_OTP_GENERATE | id=%s by=%s", pk, request.user.pk)

        from django.conf import settings
        response = {
            "success": True,
            "message": "OTP generated. Ask the resident to share it with the delivery agent.",
            "otp_expires_at": delivery.otp_expires_at,
        }
        if settings.DEBUG:
            response["otp_code"] = otp  # Visible in dev; hidden in production

        return Response(response)


class DeliveryVerifyOTPView(APIView):
    """
    POST /api/security-guard/delivery-verify/<id>/verify-otp/

    Guard enters the OTP the delivery agent shows at the gate.
    On success: PENDING → APPROVED.
    Body: { "otp_code": "123456" }
    """
    permission_classes = [IsSecurityGuard]

    def post(self, request, pk):
        delivery = _get_delivery(pk, _sid(request))
        if not delivery:
            return Response({"success": False, "message": "Delivery not found."}, status=404)
        if delivery.status != DeliveryEntry.Status.PENDING:
            return Response(
                {"success": False, "message": f"OTP verify only works on PENDING deliveries."},
                status=400,
            )

        ser = DeliveryOTPVerifySerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        valid, error = delivery.verify_otp(ser.validated_data["otp_code"])
        if not valid:
            logger.warning("DELIVERY_OTP_FAIL | id=%s by=%s error=%s", pk, request.user.pk, error)
            return Response({"success": False, "message": error}, status=400)

        with transaction.atomic():
            delivery.otp_verified = True
            delivery.status       = DeliveryEntry.Status.APPROVED
            delivery.approved_by  = _guard(request)
            delivery.resolved_at  = timezone.now()
            delivery.save(update_fields=["otp_verified", "status", "approved_by", "resolved_at"])

        logger.info("DELIVERY_OTP_VERIFIED | id=%s by=%s", pk, request.user.pk)
        return Response({
            "success": True,
            "message": "OTP verified. Delivery approved.",
            "data":    DeliveryEntrySerializer(delivery).data,
        })


class DeliveryRejectView(APIView):
    """
    POST /api/security-guard/delivery-verify/<id>/reject/

    Resident refuses delivery. PENDING → REJECTED.
    Body: { "reason": "..." }
    """
    permission_classes = [IsSecurityGuard]

    def post(self, request, pk):
        delivery = _get_delivery(pk, _sid(request))
        if not delivery:
            return Response({"success": False, "message": "Delivery not found."}, status=404)
        if delivery.status != DeliveryEntry.Status.PENDING:
            return Response(
                {"success": False, "message": f"Cannot reject — current status is '{delivery.status}'."},
                status=400,
            )

        ser = DeliveryRejectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        delivery.status           = DeliveryEntry.Status.REJECTED
        delivery.rejection_reason = ser.validated_data.get("reason", "")
        delivery.resolved_at      = timezone.now()
        delivery.save(update_fields=["status", "rejection_reason", "resolved_at"])

        logger.info("DELIVERY_REJECT | id=%s reason='%s' by=%s", pk, delivery.rejection_reason, request.user.pk)
        return Response({"success": True, "message": "Delivery rejected.", "data": DeliveryEntrySerializer(delivery).data})


class DeliveryAtGateView(APIView):
    """
    POST /api/security-guard/delivery-verify/<id>/at-gate/

    Resident not home — package stored at the guard post.
    PENDING → AT_GATE.
    Body: { "notes": "Shelf 2 near main gate" }
    """
    permission_classes = [IsSecurityGuard]

    def post(self, request, pk):
        delivery = _get_delivery(pk, _sid(request))
        if not delivery:
            return Response({"success": False, "message": "Delivery not found."}, status=404)
        if delivery.status != DeliveryEntry.Status.PENDING:
            return Response(
                {"success": False, "message": f"Cannot store at gate — current status is '{delivery.status}'."},
                status=400,
            )

        ser = DeliveryAtGateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        delivery.status = DeliveryEntry.Status.AT_GATE
        if ser.validated_data.get("notes"):
            delivery.notes = ser.validated_data["notes"]
        delivery.save(update_fields=["status", "notes"])

        logger.info("DELIVERY_AT_GATE | id=%s by=%s", pk, request.user.pk)
        return Response({"success": True, "message": "Package stored at gate.", "data": DeliveryEntrySerializer(delivery).data})


class DeliveryCollectedView(APIView):
    """
    POST /api/security-guard/delivery-verify/<id>/collected/

    Resident collected the at-gate package.
    AT_GATE → COLLECTED.
    """
    permission_classes = [IsSecurityGuard]

    def post(self, request, pk):
        delivery = _get_delivery(pk, _sid(request))
        if not delivery:
            return Response({"success": False, "message": "Delivery not found."}, status=404)
        if delivery.status != DeliveryEntry.Status.AT_GATE:
            return Response(
                {"success": False, "message": f"Cannot mark collected — current status is '{delivery.status}'."},
                status=400,
            )

        delivery.status       = DeliveryEntry.Status.COLLECTED
        delivery.collected_at = timezone.now()
        delivery.collected_by = _guard(request)  # Guard marks on behalf of resident
        delivery.save(update_fields=["status", "collected_at", "collected_by"])

        logger.info("DELIVERY_COLLECTED | id=%s by=%s", pk, request.user.pk)
        return Response({"success": True, "message": "Delivery marked as collected.", "data": DeliveryEntrySerializer(delivery).data})


class DeliveryReturnView(APIView):
    """
    POST /api/security-guard/delivery-verify/<id>/return/

    Package returned to sender (uncollected after wait).
    AT_GATE → RETURNED.
    Body: { "reason": "Uncollected after 2 days" }
    """
    permission_classes = [IsSecurityGuard]

    def post(self, request, pk):
        delivery = _get_delivery(pk, _sid(request))
        if not delivery:
            return Response({"success": False, "message": "Delivery not found."}, status=404)
        if delivery.status != DeliveryEntry.Status.AT_GATE:
            return Response(
                {"success": False, "message": f"Can only return AT_GATE packages. Current: '{delivery.status}'."},
                status=400,
            )

        ser = DeliveryReturnSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        delivery.status           = DeliveryEntry.Status.RETURNED
        delivery.rejection_reason = ser.validated_data.get("reason", "")
        delivery.resolved_at      = timezone.now()
        delivery.save(update_fields=["status", "rejection_reason", "resolved_at"])

        logger.info("DELIVERY_RETURN | id=%s by=%s", pk, request.user.pk)
        return Response({"success": True, "message": "Package marked as returned.", "data": DeliveryEntrySerializer(delivery).data})


# ─────────────────────────────────────────────────────────────────────────────
# Filtered lists
# ─────────────────────────────────────────────────────────────────────────────

class DeliveryPendingView(APIView):
    """
    GET /api/security-guard/delivery-verify/pending/

    All deliveries awaiting action — used for the notification badge count.
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = (
            DeliveryEntry.objects
            .filter(society_id=society_id, status=DeliveryEntry.Status.PENDING)
            .select_related("flat", "flat__building", "processed_by")
            .order_by("arrived_at")  # oldest first — most urgent
        )
        return Response({"success": True, "count": qs.count(), "results": DeliveryEntrySerializer(qs, many=True).data})


class DeliveryAtGateListView(APIView):
    """
    GET /api/security-guard/delivery-verify/at-gate/

    Packages stored at the gate waiting to be picked up by residents.
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = (
            DeliveryEntry.objects
            .filter(society_id=society_id, status=DeliveryEntry.Status.AT_GATE)
            .select_related("flat", "flat__building", "processed_by")
            .order_by("arrived_at")  # oldest first
        )
        return Response({"success": True, "count": qs.count(), "results": DeliveryEntrySerializer(qs, many=True).data})


# ─────────────────────────────────────────────────────────────────────────────
# Summary / Stats
# ─────────────────────────────────────────────────────────────────────────────

class DeliverySummaryView(APIView):
    """
    GET /api/security-guard/delivery-verify/summary/

    Today's delivery stats — powers the KPI cards on the Delivery Verify page.
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        today = timezone.localdate()
        qs    = DeliveryEntry.objects.filter(society_id=society_id, arrived_at__date=today)

        by_type = {dt.value: qs.filter(delivery_type=dt.value).count() for dt in DeliveryEntry.DeliveryType}

        payload = {
            "date":        today,
            "total_today": qs.count(),
            "pending":     qs.filter(status=DeliveryEntry.Status.PENDING).count(),
            "approved":    qs.filter(status=DeliveryEntry.Status.APPROVED).count(),
            "rejected":    qs.filter(status=DeliveryEntry.Status.REJECTED).count(),
            "at_gate":     qs.filter(status=DeliveryEntry.Status.AT_GATE).count(),
            "collected":   qs.filter(status=DeliveryEntry.Status.COLLECTED).count(),
            "by_type":     by_type,
        }
        return Response({"success": True, "data": DeliverySummarySerializer(payload).data})
