import logging

from django.db import transaction
from django.utils import timezone
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView

from apps.common.permissions import IsSecurityGuard
from apps.resident.visitors.models import GuestPass
from apps.society_admin.visitors.models import Visitor
from apps.society_admin.visitors.serializers import VisitorSerializer

from .models import QRVerifyLog
from .serializers import (
    GuestPassDetailSerializer,
    QRCodeInputSerializer,
    QRVerifyLogSerializer,
    SamplePassCodeSerializer,
)

logger = logging.getLogger(__name__)


def _resolve_pass(code: str, society_id):
    """
    Look up a GuestPass by qr_code for this society.
    Returns (pass_obj, error_str) — one of them will be None.
    """
    try:
        gp = (
            GuestPass.objects
            .select_related("flat", "flat__building", "created_by")
            .get(qr_code=code)
        )
    except GuestPass.DoesNotExist:
        return None, "QR code not recognised. Please check and try again."

    if gp.flat and gp.flat.building.society_id != society_id:
        return None, "This pass is for a different society."

    return gp, None


def _pass_to_detail(gp: GuestPass, is_valid: bool, error_reason) -> dict:
    flat       = gp.flat
    building   = flat.building if flat else None
    created_by = gp.created_by

    return {
        "pass_id":            gp.pk,
        "qr_code":            gp.qr_code,
        "full_name":          gp.full_name,
        "mobile":             gp.mobile,
        "vehicle_number":     gp.vehicle_number,
        "visit_type":         gp.visit_type,
        "visit_type_display": gp.get_visit_type_display(),
        "notes_for_guard":    gp.notes_for_guard,
        "flat_number":        flat.flat_number      if flat     else None,
        "building_name":      building.name         if building else None,
        "host_name":          created_by.full_name  if created_by else None,
        "visit_date":         gp.visit_date,
        "visit_time":         gp.visit_time,
        "valid_until":        gp.valid_until,
        "pass_validity":      gp.pass_validity,
        "pass_validity_display": gp.get_pass_validity_display(),
        "status":             gp.status,
        "status_display":     gp.get_status_display(),
        "is_valid":           is_valid,
        "error_reason":       error_reason,
    }


def _check_usability(gp: GuestPass):
    """Return (is_valid, error_reason) based on pass status and expiry."""
    if gp.status == GuestPass.Status.CANCELLED:
        return False, "This pass has been cancelled by the resident."
    if gp.status == GuestPass.Status.USED:
        return False, "This pass has already been used."
    if gp.status == GuestPass.Status.EXPIRED:
        return False, "This pass has expired."
    if gp.valid_until and timezone.now() > gp.valid_until:
        return False, f"This pass expired at {gp.valid_until.strftime('%H:%M on %d %b')}."
    if gp.status != GuestPass.Status.ACTIVE:
        return False, f"Pass status is '{gp.get_status_display()}'."
    return True, None


def _log_verify(code: str, full_name: str, is_valid: bool, society_id, guard_profile):
    """Persist a QRVerifyLog row for every verification attempt."""
    try:
        QRVerifyLog.objects.create(
            society_id=society_id,
            pass_code=code,
            full_name=full_name or "Unknown",
            is_valid=is_valid,
            verified_by=guard_profile,
        )
    except Exception as exc:
        logger.warning("QR_LOG_FAIL | %s", exc)


class QRVerifyView(APIView):
    """
    POST /api/security-guard/qr-passcode/verify/

    Scan or type a QR / passcode.
    Returns full guest pass details — no state change.
    """
    permission_classes = [IsSecurityGuard]

    def post(self, request):
        ser = QRCodeInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        code = ser.validated_data["code"].strip()

        try:
            society_id = request.user.profile.society_id
            guard      = request.user.profile
        except Exception:
            return Response({"success": False, "message": "Guard profile has no linked society."}, status=400)

        gp, lookup_error = _resolve_pass(code, society_id)
        if lookup_error:
            _log_verify(code, "", False, society_id, guard)
            return Response({"success": False, "message": lookup_error}, status=404)

        is_valid, error_reason = _check_usability(gp)
        _log_verify(code, gp.full_name, is_valid, society_id, guard)

        detail = _pass_to_detail(gp, is_valid, error_reason)
        logger.info(
            "QR_VERIFY | pass_id=%s society=%s valid=%s by=%s",
            gp.pk, society_id, is_valid, guard.pk,
        )
        return Response({
            "success": True,
            "data":    GuestPassDetailSerializer(detail).data,
        })


class QRCheckInView(APIView):
    """
    POST /api/security-guard/qr-passcode/checkin/

    Verify the QR / passcode AND check the visitor in:
      1. Marks GuestPass.status = USED
      2. Creates a Visitor record with status = INSIDE + checked_in_at = now()
    """
    permission_classes = [IsSecurityGuard]

    def post(self, request):
        ser = QRCodeInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        code = ser.validated_data["code"].strip()

        try:
            society_id = request.user.profile.society_id
            guard      = request.user.profile
        except Exception:
            return Response({"success": False, "message": "Guard profile has no linked society."}, status=400)

        gp, lookup_error = _resolve_pass(code, society_id)
        if lookup_error:
            _log_verify(code, "", False, society_id, guard)
            return Response({"success": False, "message": lookup_error}, status=404)

        is_valid, error_reason = _check_usability(gp)
        if not is_valid:
            _log_verify(code, gp.full_name, False, society_id, guard)
            return Response({"success": False, "message": error_reason}, status=400)

        with transaction.atomic():
            gp.status = GuestPass.Status.USED
            gp.save(update_fields=["status", "updated_at"])

            visitor = Visitor.objects.create(
                society_id=society_id,
                flat=gp.flat,
                full_name=gp.full_name,
                mobile=gp.mobile,
                vehicle_number=gp.vehicle_number,
                visit_type=gp.visit_type,
                purpose=gp.notes_for_guard,
                host_name=gp.created_by.full_name if gp.created_by else "",
                status=Visitor.Status.INSIDE,
                approved_by=guard,
                checked_in_at=timezone.now(),
            )

        _log_verify(code, gp.full_name, True, society_id, guard)
        logger.info(
            "QR_CHECKIN | pass_id=%s visitor_id=%s society=%s name='%s' by=%s",
            gp.pk, visitor.pk, society_id, visitor.full_name, guard.pk,
        )
        return Response({
            "success": True,
            "message": f"{visitor.full_name} checked in successfully.",
            "data":    VisitorSerializer(visitor).data,
        }, status=status.HTTP_201_CREATED)


class QRRecentVerificationsView(APIView):
    """
    GET /api/security-guard/qr-passcode/recent/

    Last 20 verification attempts (valid + invalid) for this society.
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "Guard profile has no linked society."}, status=400)

        logs = (
            QRVerifyLog.objects
            .filter(society_id=society_id)
            .order_by("-verified_at")[:20]
        )
        data = []
        for log in logs:
            data.append({
                "id":          log.pk,
                "pass_code":   log.pass_code,
                "full_name":   log.full_name,
                "is_valid":    log.is_valid,
                "verified_at": log.verified_at,
                "time":        timezone.localtime(log.verified_at).strftime("%H:%M"),
            })

        return Response({
            "success": True,
            "data":    QRVerifyLogSerializer(data, many=True).data,
        })


class QRSampleCodesView(APIView):
    """
    GET /api/security-guard/qr-passcode/sample-codes/

    Up to 6 active GuestPasses for this society — shown on the QR screen
    so the guard can test / demo the passcode flow.
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        try:
            society_id = request.user.profile.society_id
        except Exception:
            return Response({"success": False, "message": "Guard profile has no linked society."}, status=400)

        passes = (
            GuestPass.objects
            .select_related("flat", "flat__building", "created_by")
            .filter(
                status=GuestPass.Status.ACTIVE,
                flat__building__society_id=society_id,
            )
            .order_by("-created_at")[:6]
        )
        data = []
        for gp in passes:
            flat     = gp.flat
            building = flat.building if flat else None
            flat_display = ""
            if flat:
                flat_display = flat.flat_number
                if building:
                    flat_display = f"{building.name} – {flat.flat_number}"

            data.append({
                "pass_id":     gp.pk,
                "qr_code":     gp.qr_code,
                "full_name":   gp.full_name,
                "flat_display": flat_display,
                "valid_until": gp.valid_until,
            })

        return Response({
            "success": True,
            "data":    SamplePassCodeSerializer(data, many=True).data,
        })
