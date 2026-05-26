import logging
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsDeliveryPartner
from apps.delivery_partner.delivery_requests.models import Delivery
from apps.delivery_partner.delivery_requests.serializers import DeliverySerializer

logger = logging.getLogger(__name__)

TERMINAL = (Delivery.Status.DELIVERED, Delivery.Status.FAILED, Delivery.Status.RETURNED)


class DeliveryHistoryView(APIView):
    permission_classes = [IsDeliveryPartner]

    def get(self, request):
        try:
            profile = request.user.profile
        except Exception:
            return Response({"success": False, "message": "No profile."}, status=400)

        qs = Delivery.objects.filter(
            society_id=profile.society_id,
            assigned_to=profile,
            status__in=TERMINAL,
        ).order_by("-updated_at")

        total     = qs.count()
        delivered = qs.filter(status=Delivery.Status.DELIVERED).count()
        failed    = qs.filter(status=Delivery.Status.FAILED).count()
        returned  = qs.filter(status=Delivery.Status.RETURNED).count()
        success_rate = round(delivered / total * 100) if total else 0

        # Search
        search = request.query_params.get("search")
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(item_name__icontains=search)
                | Q(vendor_name__icontains=search)
                | Q(resident_name__icontains=search)
                | Q(flat_number__icontains=search)
            )

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)

        return Response({
            "success": True,
            "data": {
                "stats": {
                    "delivered": delivered,
                    "failed": failed,
                    "returned": returned,
                    "success_rate": success_rate,
                },
                "results": DeliverySerializer(page or qs, many=True).data,
            }
        })
