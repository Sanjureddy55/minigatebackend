import logging
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsDeliveryPartner
from apps.delivery_partner.delivery_requests.models import Delivery

logger = logging.getLogger(__name__)


class DeliveryDashboardView(APIView):
    permission_classes = [IsDeliveryPartner]

    def get(self, request):
        try:
            profile = request.user.profile
        except Exception:
            return Response({"success": False, "message": "No profile."}, status=400)

        today = timezone.localdate()
        qs    = Delivery.objects.filter(
            society_id=profile.society_id,
            assigned_to=profile,
            created_at__date=today,
        )

        active_qs = qs.filter(status__in=[
            Delivery.Status.PENDING, Delivery.Status.OUT_FOR_DELIVERY, Delivery.Status.FAILED
        ])
        delivered_qs = qs.filter(status=Delivery.Status.DELIVERED)

        def _d(obj):
            return {
                "id": obj.id,
                "delivery_id": obj.delivery_id,
                "item_name": obj.item_name,
                "vendor_name": obj.vendor_name,
                "resident_name": obj.resident_name,
                "flat_number": obj.flat_number,
                "status": obj.status,
                "status_display": obj.get_status_display(),
                "delivery_note": obj.delivery_note,
            }

        return Response({
            "success": True,
            "data": {
                "stats": {
                    "total_today":  qs.count(),
                    "pending":      qs.filter(status=Delivery.Status.PENDING).count(),
                    "delivered":    qs.filter(status=Delivery.Status.DELIVERED).count(),
                    "failed":       qs.filter(status=Delivery.Status.FAILED).count(),
                },
                "active_deliveries": [_d(d) for d in active_qs[:10]],
                "delivered_today":   [
                    {**_d(d), "delivered_at": d.delivered_at}
                    for d in delivered_qs.order_by("-delivered_at")[:10]
                ],
            },
        })
