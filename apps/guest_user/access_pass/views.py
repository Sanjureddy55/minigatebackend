import logging
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsGuestUser
from apps.common.models import AccessPass

logger = logging.getLogger(__name__)


def _get_pass(profile):
    return AccessPass.objects.filter(user=profile).order_by("-created_at").first()


def _make_pass(profile):
    now = timezone.now()
    existing = AccessPass.objects.filter(
        user=profile,
        status=AccessPass.Status.ACTIVE,
        valid_until__gt=now,
    ).first()
    if existing:
        return existing
    AccessPass.objects.filter(user=profile, status=AccessPass.Status.ACTIVE).update(status=AccessPass.Status.EXPIRED)
    ap = AccessPass.objects.create(
        user=profile,
        society=profile.society,
        user_role=AccessPass.UserRole.GUEST_USER,
        visitor_name=profile.full_name,
        visitor_phone=profile.mobile,
        valid_from=now,
        valid_until=now + timezone.timedelta(hours=24),
    )
    return ap


class GuestAccessPassView(APIView):
    permission_classes = [IsGuestUser]

    def get(self, request):
        try:
            profile = request.user.profile
        except Exception:
            return Response({"success": False, "message": "No profile."}, status=400)
        if not profile.society_id:
            return Response({"success": False, "message": "No society linked."}, status=400)
        ap = _make_pass(profile)
        return Response({
            "success": True,
            "data": {
                "id": ap.id,
                "passcode": ap.passcode,
                "qr_code_value": ap.qr_code_value,
                "society_name": ap.society.name if ap.society_id else "",
                "visitor_name": ap.visitor_name,
                "host_resident_name": ap.host_resident_name,
                "host_flat_number": ap.host_flat_number,
                "purpose": ap.purpose,
                "valid_from": ap.valid_from,
                "valid_until": ap.valid_until,
                "status": ap.status,
                "entry_confirmed_at": ap.entry_confirmed_at,
                "gate": ap.gate,
            }
        })


class GuestQRCodeView(APIView):
    permission_classes = [IsGuestUser]

    def get(self, request):
        try:
            profile = request.user.profile
        except Exception:
            return Response({"success": False, "message": "No profile."}, status=400)
        ap = AccessPass.objects.filter(user=profile, status=AccessPass.Status.ACTIVE).order_by("-created_at").first()
        if not ap:
            return Response({"success": False, "message": "No active pass."}, status=404)
        return Response({"success": True, "data": {
            "qr_code_value": ap.qr_code_value,
            "passcode": ap.passcode,
            "society_name": ap.society.name if ap.society_id else "",
            "visitor_name": ap.visitor_name,
            "host_resident_name": ap.host_resident_name,
            "host_flat_number": ap.host_flat_number,
            "purpose": ap.purpose,
            "valid_until": ap.valid_until,
        }})


class GuestEntryStatusView(APIView):
    permission_classes = [IsGuestUser]

    def get(self, request):
        try:
            profile = request.user.profile
        except Exception:
            return Response({"success": False, "message": "No profile."}, status=400)
        ap = AccessPass.objects.filter(user=profile).order_by("-created_at").first()
        if not ap:
            return Response({"success": False, "message": "No pass found."}, status=404)
        return Response({"success": True, "data": {
            "entry_confirmed": bool(ap.entry_confirmed_at),
            "entry_confirmed_at": ap.entry_confirmed_at,
            "gate": ap.gate,
            "expected_exit": ap.valid_until,
            "status": ap.status,
            "passcode": ap.passcode,
        }})
