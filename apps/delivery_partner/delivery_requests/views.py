import logging
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from apps.common.permissions import IsDeliveryPartner
from .models import Delivery
from .serializers import DeliverySerializer, DeliveryCreateSerializer

logger = logging.getLogger(__name__)


def _profile(request):
    try:
        return request.user.profile
    except Exception:
        return None


class DeliveryViewSet(ModelViewSet):
    permission_classes = [IsDeliveryPartner]
    serializer_class   = DeliverySerializer
    pagination_class   = PageNumberPagination
    http_method_names  = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        profile = _profile(self.request)
        if not profile:
            return Delivery.objects.none()
        slug = profile.role.slug if profile.role else ""
        qs = Delivery.objects.select_related("assigned_to", "society")
        if slug in ("society-admin", "super-admin"):
            if profile.society_id:
                qs = qs.filter(society_id=profile.society_id)
        else:
            # Delivery partner sees their own assignments in their society
            qs = qs.filter(society_id=profile.society_id, assigned_to=profile)
        # Status filter
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        ser = DeliveryCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        profile = _profile(request)
        delivery = ser.save(
            society_id=profile.society_id,
            assigned_to=profile,
        )
        return Response(
            {"success": True, "data": DeliverySerializer(delivery).data},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["patch"])
    def pickup(self, request, pk=None):
        delivery = self.get_object()
        if delivery.status != Delivery.Status.PENDING:
            return Response({"detail": f"Cannot pick up. Status is '{delivery.status}'."}, status=400)
        delivery.status       = Delivery.Status.OUT_FOR_DELIVERY
        delivery.picked_up_at = timezone.now()
        delivery.assigned_to  = _profile(request)
        delivery.save(update_fields=["status", "picked_up_at", "assigned_to"])
        logger.info("DELIVERY_PICKUP | id=%s by=%s", pk, request.user.pk)
        return Response({"success": True, "data": DeliverySerializer(delivery).data})

    @action(detail=True, methods=["patch"])
    def delivered(self, request, pk=None):
        delivery = self.get_object()
        if delivery.status != Delivery.Status.OUT_FOR_DELIVERY:
            return Response({"detail": f"Cannot mark delivered. Status is '{delivery.status}'."}, status=400)
        delivery.status       = Delivery.Status.DELIVERED
        delivery.delivered_at = timezone.now()
        if request.data.get("delivery_note"):
            delivery.delivery_note = request.data["delivery_note"]
        delivery.save(update_fields=["status", "delivered_at", "delivery_note"])
        logger.info("DELIVERY_DELIVERED | id=%s by=%s", pk, request.user.pk)
        return Response({"success": True, "data": DeliverySerializer(delivery).data})

    @action(detail=True, methods=["patch"])
    def failed(self, request, pk=None):
        delivery = self.get_object()
        if delivery.status in (Delivery.Status.DELIVERED, Delivery.Status.RETURNED):
            return Response({"detail": f"Cannot mark failed. Status is '{delivery.status}'."}, status=400)
        delivery.status         = Delivery.Status.FAILED
        delivery.failed_at      = timezone.now()
        delivery.failure_reason = request.data.get("failure_reason", "")
        delivery.save(update_fields=["status", "failed_at", "failure_reason"])
        logger.info("DELIVERY_FAILED | id=%s by=%s", pk, request.user.pk)
        return Response({"success": True, "data": DeliverySerializer(delivery).data})
