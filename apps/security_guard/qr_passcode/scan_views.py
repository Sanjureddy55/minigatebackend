import logging
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsSecurityGuard
from apps.common.models import AccessPass, AccessScanLog

logger = logging.getLogger(__name__)


class ScanAccessPassView(APIView):
    """POST /api/security-guard/scan-access-pass/"""
    permission_classes = [IsSecurityGuard]

    def post(self, request):
        qr_value = request.data.get("qr_code_value") or request.data.get("passcode")
        gate     = request.data.get("gate", "")

        try:
            guard = request.user.profile
        except Exception:
            guard = None

        if not qr_value:
            return Response({"status": "error", "message": "qr_code_value or passcode required."}, status=400)

        # Find pass by QR token or passcode
        ap = (
            AccessPass.objects.select_related("user", "society")
            .filter(qr_code_value=qr_value).first()
            or AccessPass.objects.select_related("user", "society")
            .filter(passcode=qr_value).first()
        )

        if not ap:
            AccessScanLog.objects.create(
                scanned_by=guard, gate=gate,
                scan_result=AccessScanLog.ScanResult.FAILED,
                failure_reason="Invalid access pass",
                raw_qr_value=qr_value,
            )
            return Response({"status": "error", "message": "Invalid access pass."}, status=400)

        if ap.status == AccessPass.Status.REVOKED:
            AccessScanLog.objects.create(
                access_pass=ap, scanned_by=guard, gate=gate,
                scan_result=AccessScanLog.ScanResult.FAILED,
                failure_reason="Revoked",
                raw_qr_value=qr_value,
            )
            return Response({"status": "error", "message": "Access pass revoked."}, status=400)

        if ap.status == AccessPass.Status.EXPIRED or not ap.is_valid_now:
            ap.status = AccessPass.Status.EXPIRED
            ap.save(update_fields=["status"])
            AccessScanLog.objects.create(
                access_pass=ap, scanned_by=guard, gate=gate,
                scan_result=AccessScanLog.ScanResult.FAILED,
                failure_reason="Expired",
                raw_qr_value=qr_value,
            )
            return Response({"status": "error", "message": "Access pass expired."}, status=400)

        # SUCCESS
        now = timezone.now()
        ap.status             = AccessPass.Status.USED
        ap.gate               = gate
        ap.entry_confirmed_at = now
        ap.scanned_by         = guard
        ap.save(update_fields=["status", "gate", "entry_confirmed_at", "scanned_by"])

        AccessScanLog.objects.create(
            access_pass=ap, scanned_by=guard, gate=gate,
            scan_result=AccessScanLog.ScanResult.SUCCESS,
            raw_qr_value=qr_value,
        )

        logger.info("SCAN_SUCCESS | pass=%s gate=%s guard=%s", ap.passcode, gate, guard)

        return Response({
            "status": "success",
            "message": "Entry confirmed.",
            "access_pass": {
                "passcode":           ap.passcode,
                "visitor_name":       ap.visitor_name or (ap.user.full_name if ap.user_id else ""),
                "role":               ap.user_role,
                "society":            ap.society.name if ap.society_id else "",
                "valid_until":        ap.valid_until.strftime("%H:%M"),
                "entry_confirmed_at": now.strftime("%I:%M %p"),
                "gate":               gate,
            }
        })


class ScanLogsView(APIView):
    """GET /api/security-guard/access-scan-logs/"""
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        try:
            guard = request.user.profile
        except Exception:
            return Response({"success": False, "message": "No profile."}, status=400)

        qs = AccessScanLog.objects.filter(
            scanned_by__society_id=guard.society_id
        ).select_related("access_pass", "scanned_by").order_by("-scanned_at")[:50]

        results = [{
            "id": log.id,
            "passcode": log.access_pass.passcode if log.access_pass_id else "",
            "visitor_name": log.access_pass.visitor_name if log.access_pass_id else "",
            "gate": log.gate,
            "scan_result": log.scan_result,
            "failure_reason": log.failure_reason,
            "scanned_at": log.scanned_at,
        } for log in qs]

        return Response({"success": True, "results": results})
