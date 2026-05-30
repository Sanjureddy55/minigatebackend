import logging

from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsResident

from apps.society_admin.notice_board.models import Notice, NoticeRead
from apps.roles_permissions.models import UserProfile
from apps.resident.payments.models import ResidentPayment

from .serializers import FundraiserContributeSerializer, ResidentNoticeSerializer

logger = logging.getLogger(__name__)


class ResidentNoticeListView(ListAPIView):
    permission_classes = [IsResident]
    """
    GET /api/resident/notices/?society=<id>&resident=<id>&category=<...>

    Resident read-only notice list with fundraiser progress and read status.
    """

    serializer_class = ResidentNoticeSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["society", "category", "status", "audience"]
    search_fields    = ["title", "description"]
    ordering_fields  = ["created_at", "event_date"]
    ordering         = ["-created_at"]

    def get_queryset(self):
        return Notice.objects.filter(status=Notice.Status.ACTIVE).select_related("society")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["resident_id"] = self.request.query_params.get("resident")
        return ctx

    def list(self, request, *args, **kwargs):
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(
                ResidentNoticeSerializer(page, many=True, context=self.get_serializer_context()).data
            )
        return Response({
            "count":   qs.count(),
            "results": ResidentNoticeSerializer(qs, many=True, context=self.get_serializer_context()).data,
        })


class ResidentNoticeDetailView(RetrieveAPIView):
    permission_classes = [IsResident]
    """GET /api/resident/notices/{id}/"""

    serializer_class = ResidentNoticeSerializer
    queryset         = Notice.objects.select_related("society")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["resident_id"] = self.request.query_params.get("resident")
        return ctx

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response({"success": True, "data": ResidentNoticeSerializer(
            instance, context=self.get_serializer_context()
        ).data})


class ResidentNoticeMarkReadView(APIView):
    permission_classes = [IsResident]
    """POST /api/resident/notices/{pk}/mark-read/ — body: {"resident": <id>}"""

    def post(self, request, pk):
        notice      = Notice.objects.get(pk=pk)
        resident_id = request.data.get("resident")
        if not resident_id:
            return Response({"success": False, "message": "resident is required."}, status=400)

        obj, created = NoticeRead.objects.get_or_create(notice=notice, resident_id=resident_id)
        return Response(
            {"success": True, "message": "Marked as read." if created else "Already read."},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ResidentFundraiserContributeView(APIView):
    permission_classes = [IsResident]
    """
    POST /api/resident/notices/{pk}/contribute/

    Records a fundraiser contribution — resident and flat auto-injected from token.
    Body: { "amount": 500, "payment_method": "upi" }
    """

    def post(self, request, pk):
        try:
            notice = Notice.objects.get(pk=pk, category=Notice.Category.FUNDRAISER)
        except Notice.DoesNotExist:
            return Response({"success": False, "message": "Fundraiser not found."}, status=404)

        ser = FundraiserContributeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        # Auto-inject resident and flat from the authenticated user
        from apps.common.utils import get_flat_id
        from apps.society_admin.flats.models import Flat
        try:
            profile = request.user.profile
        except Exception:
            return Response(
                {"success": False, "message": "User profile not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        flat_id = get_flat_id(request)
        if not flat_id:
            return Response(
                {"success": False, "message": "No flat linked to your account. Please complete your profile."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            flat = Flat.objects.get(pk=flat_id)
        except Flat.DoesNotExist:
            return Response(
                {"success": False, "message": "Flat not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent duplicate contribution from same flat for same fundraiser
        already_paid = ResidentPayment.objects.filter(
            notice=notice, resident=profile
        ).exists()
        if already_paid:
            return Response(
                {"success": False, "message": "You have already contributed to this fundraiser."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment = ResidentPayment.objects.create(
            flat           = flat,
            resident       = profile,
            society        = notice.society,
            notice         = notice,
            payment_type   = ResidentPayment.PaymentType.FUNDRAISER,
            payment_method = data["payment_method"],
            amount         = data["amount"],
            description    = f"Contribution to: {notice.title}",
            payment_date   = timezone.localdate(),
        )

        notice.raised_amount = (notice.raised_amount or 0) + data["amount"]
        notice.save(update_fields=["raised_amount", "updated_at"])

        logger.info(
            "FUNDRAISER_CONTRIBUTION | notice=%s resident=%s flat=%s amount=%s",
            notice.pk, profile.pk, flat.pk, data["amount"],
        )
        return Response({
            "success": True,
            "message": f"Contribution of ₹{data['amount']} recorded successfully.",
            "data": {
                "payment_id":    payment.pk,
                "raised_amount": float(notice.raised_amount),
                "target_amount": float(notice.target_amount) if notice.target_amount else None,
            },
        }, status=status.HTTP_201_CREATED)