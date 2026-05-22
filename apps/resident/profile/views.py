import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.permissions import IsResident

from .models import DailyHelp, FamilyMember, Pet, ResidentFlat, Vehicle
from .serializers import (
    AddFlatSerializer,
    DailyHelpSerializer,
    FamilyMemberSerializer,
    PetSerializer,
    ResidentFlatSerializer,
    VehicleSerializer,
)

logger = logging.getLogger(__name__)


class FamilyMemberViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResident]
    """
    CRUD for family members linked to a resident + flat.

    GET    /api/resident/profile/family/
    POST   /api/resident/profile/family/
    GET    /api/resident/profile/family/{id}/
    PUT    /api/resident/profile/family/{id}/
    PATCH  /api/resident/profile/family/{id}/
    DELETE /api/resident/profile/family/{id}/
    """

    serializer_class = FamilyMemberSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["resident", "flat", "relation"]
    search_fields    = ["name", "phone"]
    ordering_fields  = ["name", "created_at"]
    ordering         = ["name"]

    def get_queryset(self):
        return (
            FamilyMember.objects
            .select_related("resident", "flat")
            .order_by("name")
        )

    def list(self, request, *args, **kwargs):
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(FamilyMemberSerializer(page, many=True).data)
        return Response({"count": qs.count(), "results": FamilyMemberSerializer(qs, many=True).data})

    def create(self, request, *args, **kwargs):
        ser = FamilyMemberSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        logger.info("FAMILY_MEMBER_CREATE | id=%s name='%s'", obj.pk, obj.name)
        return Response({"success": True, "data": FamilyMemberSerializer(obj).data}, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "data": FamilyMemberSerializer(self.get_object()).data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        ser = FamilyMemberSerializer(self.get_object(), data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        return Response({"success": True, "data": FamilyMemberSerializer(obj).data})

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.delete()
        logger.info("FAMILY_MEMBER_DELETE | id=%s", obj.pk)
        return Response({"success": True, "message": "Family member removed."})


class VehicleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResident]
    """
    CRUD for vehicles registered under a resident.

    GET    /api/resident/profile/vehicles/
    POST   /api/resident/profile/vehicles/
    GET    /api/resident/profile/vehicles/{id}/
    PUT    /api/resident/profile/vehicles/{id}/
    PATCH  /api/resident/profile/vehicles/{id}/
    DELETE /api/resident/profile/vehicles/{id}/
    """

    serializer_class = VehicleSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["resident", "flat", "vehicle_type", "status"]
    search_fields    = ["vehicle_name", "plate_number", "parking_slot"]
    ordering_fields  = ["vehicle_name", "created_at"]
    ordering         = ["vehicle_name"]

    def get_queryset(self):
        return Vehicle.objects.select_related("resident", "flat").order_by("vehicle_name")

    def list(self, request, *args, **kwargs):
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(VehicleSerializer(page, many=True).data)
        return Response({"count": qs.count(), "results": VehicleSerializer(qs, many=True).data})

    def create(self, request, *args, **kwargs):
        ser = VehicleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        logger.info("VEHICLE_CREATE | id=%s plate='%s'", obj.pk, obj.plate_number)
        return Response({"success": True, "data": VehicleSerializer(obj).data}, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "data": VehicleSerializer(self.get_object()).data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        ser = VehicleSerializer(self.get_object(), data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        return Response({"success": True, "data": VehicleSerializer(ser.save()).data})

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.delete()
        return Response({"success": True, "message": "Vehicle removed."})


class PetViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResident]
    """
    CRUD for pets registered under a resident.

    GET    /api/resident/profile/pets/
    POST   /api/resident/profile/pets/
    GET    /api/resident/profile/pets/{id}/
    PUT    /api/resident/profile/pets/{id}/
    PATCH  /api/resident/profile/pets/{id}/
    DELETE /api/resident/profile/pets/{id}/
    """

    serializer_class = PetSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["resident", "flat", "pet_type", "gender"]
    search_fields    = ["name", "calling_name", "color"]
    ordering_fields  = ["name", "created_at"]
    ordering         = ["name"]

    def get_queryset(self):
        return Pet.objects.select_related("resident", "flat").order_by("name")

    def list(self, request, *args, **kwargs):
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(PetSerializer(page, many=True).data)
        return Response({"count": qs.count(), "results": PetSerializer(qs, many=True).data})

    def create(self, request, *args, **kwargs):
        ser = PetSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        return Response({"success": True, "data": PetSerializer(obj).data}, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "data": PetSerializer(self.get_object()).data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        ser = PetSerializer(self.get_object(), data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        return Response({"success": True, "data": PetSerializer(ser.save()).data})

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return Response({"success": True, "message": "Pet removed."})


class DailyHelpViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResident]
    """
    CRUD for daily helpers registered under a resident.

    GET    /api/resident/profile/daily-help/
    POST   /api/resident/profile/daily-help/
    GET    /api/resident/profile/daily-help/{id}/
    PUT    /api/resident/profile/daily-help/{id}/
    PATCH  /api/resident/profile/daily-help/{id}/
    DELETE /api/resident/profile/daily-help/{id}/
    """

    serializer_class = DailyHelpSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["resident", "flat", "help_type", "status"]
    search_fields    = ["name", "upi_id"]
    ordering_fields  = ["name", "created_at"]
    ordering         = ["name"]

    def get_queryset(self):
        return DailyHelp.objects.select_related("resident", "flat").order_by("name")

    def list(self, request, *args, **kwargs):
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(DailyHelpSerializer(page, many=True).data)
        return Response({"count": qs.count(), "results": DailyHelpSerializer(qs, many=True).data})

    def create(self, request, *args, **kwargs):
        ser = DailyHelpSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        logger.info("DAILY_HELP_CREATE | id=%s name='%s'", obj.pk, obj.name)
        return Response({"success": True, "data": DailyHelpSerializer(obj).data}, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "data": DailyHelpSerializer(self.get_object()).data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        ser = DailyHelpSerializer(self.get_object(), data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        return Response({"success": True, "data": DailyHelpSerializer(ser.save()).data})

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return Response({"success": True, "message": "Daily help record removed."})


class MyFlatsView(APIView):
    """
    GET /api/resident/profile/my-flats/
    Returns all flats linked to the authenticated resident, primary flat first.
    """
    permission_classes = [IsResident]

    def get(self, request):
        profile = request.user.profile
        qs = (
            ResidentFlat.objects
            .filter(profile=profile)
            .select_related("flat__building", "society__city")
            .order_by("-is_primary", "-created_at")
        )
        return Response({
            "success": True,
            "count": qs.count(),
            "results": ResidentFlatSerializer(qs, many=True).data,
        })


class AddFlatView(APIView):
    """
    POST /api/resident/profile/my-flats/add/
    Body: { "society_id": <int>, "flat_number": "<str>" }
    Creates a pending ResidentFlat link. First flat added is set as primary.
    """
    permission_classes = [IsResident]

    def post(self, request):
        ser = AddFlatSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        profile = request.user.profile
        flat    = ser.validated_data["flat"]
        society = ser.validated_data["society"]

        if ResidentFlat.objects.filter(profile=profile, flat=flat).exists():
            return Response(
                {"success": False, "message": "You have already linked this flat."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_primary = not ResidentFlat.objects.filter(profile=profile).exists()
        link = ResidentFlat.objects.create(
            profile=profile,
            flat=flat,
            society=society,
            is_primary=is_primary,
            status=ResidentFlat.Status.PENDING,
        )
        logger.info("FLAT_LINK_REQUEST | profile=%s flat=%s primary=%s", profile.pk, flat.pk, is_primary)
        return Response(
            {"success": True, "message": "Flat link request submitted.", "data": ResidentFlatSerializer(link).data},
            status=status.HTTP_201_CREATED,
        )


class SwitchFlatView(APIView):
    """
    POST /api/resident/profile/my-flats/<id>/switch/
    Sets the given ResidentFlat as the primary (active) flat for this resident.
    Only active flat links can be switched to.
    """
    permission_classes = [IsResident]

    def post(self, request, pk):
        profile = request.user.profile
        try:
            link = ResidentFlat.objects.get(pk=pk, profile=profile)
        except ResidentFlat.DoesNotExist:
            return Response({"success": False, "message": "Flat not found."}, status=status.HTTP_404_NOT_FOUND)

        if link.status != ResidentFlat.Status.ACTIVE:
            return Response(
                {"success": False, "message": "Only active flat links can be set as primary."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ResidentFlat.objects.filter(profile=profile, is_primary=True).update(is_primary=False)
        link.is_primary = True
        link.save(update_fields=["is_primary"])
        logger.info("FLAT_SWITCH | profile=%s new_primary_link=%s", profile.pk, link.pk)
        return Response({"success": True, "message": "Active flat switched.", "data": ResidentFlatSerializer(link).data})


class RemoveFlatView(APIView):
    """
    DELETE /api/resident/profile/my-flats/<id>/remove/
    Unlinks the given flat from this resident.
    Cannot remove the primary flat if other active flats exist — switch first.
    """
    permission_classes = [IsResident]

    def delete(self, request, pk):
        profile = request.user.profile
        try:
            link = ResidentFlat.objects.get(pk=pk, profile=profile)
        except ResidentFlat.DoesNotExist:
            return Response({"success": False, "message": "Flat not found."}, status=status.HTTP_404_NOT_FOUND)

        if link.is_primary:
            other_active = ResidentFlat.objects.filter(
                profile=profile, status=ResidentFlat.Status.ACTIVE
            ).exclude(pk=pk).exists()
            if other_active:
                return Response(
                    {"success": False, "message": "Switch to another flat before removing the primary flat."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        link.delete()
        logger.info("FLAT_UNLINK | profile=%s link=%s", profile.pk, pk)
        return Response({"success": True, "message": "Flat removed from your profile."})