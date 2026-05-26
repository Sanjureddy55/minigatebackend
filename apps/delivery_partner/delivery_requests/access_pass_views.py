import logging
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsDeliveryPartner
from apps.common.models import AccessPass

logger = logging.getLogger(__name__)

_DEFAULT_HOURS = 12


def _make_or_get_pass(profile):
    now = timezone.now()
    existing = AccessPass.objects.filter(
        user=profile,
        status=AccessPass.Status.ACTIVE,
        valid_until__gt=now,
    ).first()
    if existing:
        return existing
    # Expire old active passes
    AccessPass.objects.filter(user=profile, status=AccessPass.Status.ACTIVE).update(status=AccessPass.Status.EXPIRED)
    ap = AccessPass.objects.create(
        user=profile,
        society=profile.society,
        user_role=AccessPass.UserRole.DELIVERY_PARTNER,
        visitor_name=profile.full_name,
        visitor_phone=profile.mobile,
        valid_from=now,
        valid_until=now + timezone.timedelta(hours=_DEFAULT_HOURS),
    )
    return ap


def _serialize(ap):
    return {
        "id": ap.id,
        "passcode": ap.passcode,
        "qr_code_value": ap.qr_code_value,
        "society_name": ap.society.name if ap.society_id else "",
        "visitor_name": ap.visitor_name,
        "valid_from": ap.valid_from,
        "valid_until": ap.valid_until,
        "status": ap.status,
        "gate": ap.gate,
        "entry_confirmed_at": ap.entry_confirmed_at,
        "exit_confirmed_at": ap.exit_confirmed_at,
    }


class DeliveryAccessPassView(APIView):
    permission_classes = [IsDeliveryPartner]

    def get(self, request):
        try:
            profile = request.user.profile
        except Exception:
            return Response({"success": False, "message": "No profile."}, status=400)
        if not profile.society_id:
            return Response({"success": False, "message": "No society linked."}, status=400)
        ap = _make_or_get_pass(profile)
        return Response({"success": True, "data": _serialize(ap)})


class DeliveryQRCodeView(APIView):
    permission_classes = [IsDeliveryPartner]

    def get(self, request):
        try:
            profile = request.user.profile
        except Exception:
            return Response({"success": False, "message": "No profile."}, status=400)
        ap = AccessPass.objects.filter(user=profile, status=AccessPass.Status.ACTIVE).order_by("-created_at").first()
        if not ap:
            return Response(
                {"success": False, "message": "No active access pass. Visit /access-pass to generate one."},
                status=404,
            )
        return Response({
            "success": True,
            "data": {
                "qr_code_value": ap.qr_code_value,
                "passcode": ap.passcode,
                "valid_until": ap.valid_until,
            }
        })


class DeliveryEntryStatusView(APIView):
    permission_classes = [IsDeliveryPartner]

    def get(self, request):
        try:
            profile = request.user.profile
        except Exception:
            return Response({"success": False, "message": "No profile."}, status=400)
        ap = AccessPass.objects.filter(user=profile).order_by("-created_at").first()
        if not ap:
            return Response({"success": False, "message": "No access pass found."}, status=404)
        return Response({
            "success": True,
            "data": {
                "entry_confirmed": bool(ap.entry_confirmed_at),
                "entry_confirmed_at": ap.entry_confirmed_at,
                "gate": ap.gate,
                "expected_exit": ap.valid_until,
                "status": ap.status,
                "passcode": ap.passcode,
            }
        })
