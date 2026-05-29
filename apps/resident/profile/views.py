import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
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
    Family Members — auto-scoped to the logged-in resident.

    GET    /api/resident/profile/family/            List (resident's own members)
    POST   /api/resident/profile/family/            Add member (no resident/flat in body)
    GET    /api/resident/profile/family/stats/      Stats: total, gate_access, no_access
    GET    /api/resident/profile/family/{id}/       Retrieve
    PATCH  /api/resident/profile/family/{id}/       Update
    DELETE /api/resident/profile/family/{id}/       Delete
    """

    serializer_class = FamilyMemberSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["relation", "gate_access"]
    search_fields    = ["name", "phone"]
    ordering_fields  = ["name", "created_at"]
    ordering         = ["name"]

    def _profile_and_flat(self):
        """Returns (UserProfile, Flat) for the logged-in resident."""
        profile = self.request.user.profile
        rf = (
            ResidentFlat.objects
            .filter(profile=profile, status=ResidentFlat.Status.ACTIVE)
            .order_by("-is_primary")
            .first()
        )
        flat = rf.flat if rf else None
        return profile, flat

    def get_queryset(self):
        profile, _ = self._profile_and_flat()
        return (
            FamilyMember.objects
            .filter(resident=profile)
            .select_related("flat")
            .order_by("name")
        )

    # ── Stats (3 cards in UI) ─────────────────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """GET /api/resident/profile/family/stats/ — Total, Gate Access, No Access."""
        profile, _ = self._profile_and_flat()
        qs          = FamilyMember.objects.filter(resident=profile)
        total       = qs.count()
        gate_access = qs.filter(gate_access=True).count()
        no_access   = total - gate_access
        return Response({
            "success": True,
            "data": {
                "total_members": total,
                "gate_access":   gate_access,
                "no_access":     no_access,
            },
        })

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def list(self, request, *args, **kwargs):
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        data = FamilyMemberSerializer(page if page is not None else qs, many=True).data
        if page is not None:
            return self.get_paginated_response(data)
        return Response({"count": len(data), "results": data})

    def create(self, request, *args, **kwargs):
        """
        POST /api/resident/profile/family/
        resident and flat are auto-injected — no need to pass them in body.

        Body: { name, relation, phone (opt), age (opt), gate_access (opt) }
        """
        profile, flat = self._profile_and_flat()
        if not flat:
            return Response(
                {"success": False, "message": "No active flat linked. Please link a flat first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = FamilyMemberSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save(resident=profile, flat=flat)
        logger.info("FAMILY_MEMBER_CREATE | id=%s name='%s' resident=%s", obj.pk, obj.name, profile.pk)
        return Response({"success": True, "data": FamilyMemberSerializer(obj).data}, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "data": FamilyMemberSerializer(self.get_object()).data})

    def partial_update(self, request, *args, **kwargs):
        ser = FamilyMemberSerializer(self.get_object(), data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        return Response({"success": True, "data": FamilyMemberSerializer(obj).data})

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.delete()
        logger.info("FAMILY_MEMBER_DELETE | id=%s by=%s", obj.pk, request.user)
        return Response({"success": True, "message": "Family member removed."})


class VehicleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResident]
    """
    Vehicles — auto-scoped to the logged-in resident.

    GET    /api/resident/profile/vehicles/            List (resident's own vehicles)
    POST   /api/resident/profile/vehicles/            Register vehicle (no resident/flat in body)
    GET    /api/resident/profile/vehicles/stats/      Stats: total, approved, pending
    GET    /api/resident/profile/vehicles/{id}/       Retrieve
    PATCH  /api/resident/profile/vehicles/{id}/       Update
    DELETE /api/resident/profile/vehicles/{id}/       Delete
    """

    serializer_class = VehicleSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["vehicle_type", "status"]
    search_fields    = ["vehicle_name", "plate_number", "parking_slot"]
    ordering_fields  = ["vehicle_name", "created_at"]
    ordering         = ["vehicle_name"]

    def _profile_and_flat(self):
        """Returns (UserProfile, Flat) for the logged-in resident."""
        profile = self.request.user.profile
        rf = (
            ResidentFlat.objects
            .filter(profile=profile, status=ResidentFlat.Status.ACTIVE)
            .order_by("-is_primary")
            .first()
        )
        flat = rf.flat if rf else None
        return profile, flat

    def get_queryset(self):
        profile, _ = self._profile_and_flat()
        return (
            Vehicle.objects
            .filter(resident=profile)
            .select_related("flat")
            .order_by("vehicle_name")
        )

    # ── Stats (3 cards in UI) ─────────────────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """GET /api/resident/profile/vehicles/stats/ — Total, Approved, Pending."""
        profile, _ = self._profile_and_flat()
        qs       = Vehicle.objects.filter(resident=profile)
        total    = qs.count()
        approved = qs.filter(status=Vehicle.Status.APPROVED).count()
        pending  = qs.filter(status=Vehicle.Status.PENDING).count()
        return Response({
            "success": True,
            "data": {
                "total":    total,
                "approved": approved,
                "pending":  pending,
            },
        })

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def list(self, request, *args, **kwargs):
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        data = VehicleSerializer(page if page is not None else qs, many=True).data
        if page is not None:
            return self.get_paginated_response(data)
        return Response({"count": len(data), "results": data})

    def create(self, request, *args, **kwargs):
        """
        POST /api/resident/profile/vehicles/
        resident and flat are auto-injected — no need to pass them in body.

        Body: { vehicle_name, vehicle_type, plate_number, color (opt), parking_slot (opt) }
        """
        profile, flat = self._profile_and_flat()
        if not flat:
            return Response(
                {"success": False, "message": "No active flat linked. Please link a flat first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = VehicleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save(resident=profile, flat=flat)
        logger.info("VEHICLE_CREATE | id=%s plate='%s' resident=%s", obj.pk, obj.plate_number, profile.pk)
        return Response({"success": True, "data": VehicleSerializer(obj).data}, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "data": VehicleSerializer(self.get_object()).data})

    def partial_update(self, request, *args, **kwargs):
        ser = VehicleSerializer(self.get_object(), data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        return Response({"success": True, "data": VehicleSerializer(obj).data})

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.delete()
        logger.info("VEHICLE_DELETE | id=%s by=%s", obj.pk, request.user)
        return Response({"success": True, "message": "Vehicle removed."})


class PetViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResident]
    """
    Pets — auto-scoped to the logged-in resident.

    GET    /api/resident/profile/pets/            List (resident's own pets)
    POST   /api/resident/profile/pets/            Add pet (no resident/flat in body)
    GET    /api/resident/profile/pets/stats/      Stats: total, vaccinated, unvaccinated
    GET    /api/resident/profile/pets/{id}/       Retrieve
    PATCH  /api/resident/profile/pets/{id}/       Update
    DELETE /api/resident/profile/pets/{id}/       Delete
    """

    serializer_class = PetSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["pet_type", "gender", "vaccinated"]
    search_fields    = ["name", "calling_name", "breed", "color"]
    ordering_fields  = ["name", "created_at"]
    ordering         = ["name"]

    def _profile_and_flat(self):
        """Returns (UserProfile, Flat) for the logged-in resident."""
        profile = self.request.user.profile
        rf = (
            ResidentFlat.objects
            .filter(profile=profile, status=ResidentFlat.Status.ACTIVE)
            .order_by("-is_primary")
            .first()
        )
        flat = rf.flat if rf else None
        return profile, flat

    def get_queryset(self):
        profile, _ = self._profile_and_flat()
        return (
            Pet.objects
            .filter(resident=profile)
            .select_related("flat")
            .order_by("name")
        )

    # ── Stats (3 cards in UI) ─────────────────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """GET /api/resident/profile/pets/stats/ — Total, Vaccinated, Unvaccinated."""
        profile, _ = self._profile_and_flat()
        qs          = Pet.objects.filter(resident=profile)
        total       = qs.count()
        vaccinated  = qs.filter(vaccinated=True).count()
        unvaccinated = total - vaccinated
        return Response({
            "success": True,
            "data": {
                "total_pets":   total,
                "vaccinated":   vaccinated,
                "unvaccinated": unvaccinated,
            },
        })

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def list(self, request, *args, **kwargs):
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        data = PetSerializer(page if page is not None else qs, many=True).data
        if page is not None:
            return self.get_paginated_response(data)
        return Response({"count": len(data), "results": data})

    def create(self, request, *args, **kwargs):
        """
        POST /api/resident/profile/pets/
        resident and flat are auto-injected — no need to pass them in body.

        Body: { name, pet_type, breed (opt), gender (opt), color (opt), vaccinated (opt), calling_name (opt) }
        """
        profile, flat = self._profile_and_flat()
        if not flat:
            return Response(
                {"success": False, "message": "No active flat linked. Please link a flat first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = PetSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save(resident=profile, flat=flat)
        logger.info("PET_CREATE | id=%s name='%s' resident=%s", obj.pk, obj.name, profile.pk)
        return Response({"success": True, "data": PetSerializer(obj).data}, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "data": PetSerializer(self.get_object()).data})

    def partial_update(self, request, *args, **kwargs):
        ser = PetSerializer(self.get_object(), data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        return Response({"success": True, "data": PetSerializer(obj).data})

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.delete()
        logger.info("PET_DELETE | id=%s by=%s", obj.pk, request.user)
        return Response({"success": True, "message": "Pet removed."})


class DailyHelpViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResident]
    """
    Daily Help — auto-scoped to the logged-in resident.

    GET    /api/resident/profile/daily-help/            List (resident's own helpers)
    POST   /api/resident/profile/daily-help/            Add helper (no resident/flat in body)
    GET    /api/resident/profile/daily-help/stats/      Stats: total, active, inactive
    GET    /api/resident/profile/daily-help/{id}/       Retrieve
    PATCH  /api/resident/profile/daily-help/{id}/       Update
    DELETE /api/resident/profile/daily-help/{id}/       Delete
    """

    serializer_class = DailyHelpSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["help_type", "status"]
    search_fields    = ["name", "phone", "upi_id"]
    ordering_fields  = ["name", "created_at"]
    ordering         = ["name"]

    def _profile_and_flat(self):
        """Returns (UserProfile, Flat) for the logged-in resident."""
        profile = self.request.user.profile
        rf = (
            ResidentFlat.objects
            .filter(profile=profile, status=ResidentFlat.Status.ACTIVE)
            .order_by("-is_primary")
            .first()
        )
        flat = rf.flat if rf else None
        return profile, flat

    def get_queryset(self):
        profile, _ = self._profile_and_flat()
        return (
            DailyHelp.objects
            .filter(resident=profile)
            .select_related("flat")
            .order_by("name")
        )

    # ── Stats (3 cards in UI) ─────────────────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """GET /api/resident/profile/daily-help/stats/ — Total, Active, Inactive."""
        profile, _ = self._profile_and_flat()
        qs       = DailyHelp.objects.filter(resident=profile)
        total    = qs.count()
        active   = qs.filter(status=DailyHelp.Status.ACTIVE).count()
        inactive = qs.filter(status=DailyHelp.Status.INACTIVE).count()
        return Response({
            "success": True,
            "data": {
                "total_helpers": total,
                "active":        active,
                "inactive":      inactive,
            },
        })

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def list(self, request, *args, **kwargs):
        qs   = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        data = DailyHelpSerializer(page if page is not None else qs, many=True).data
        if page is not None:
            return self.get_paginated_response(data)
        return Response({"count": len(data), "results": data})

    def create(self, request, *args, **kwargs):
        """
        POST /api/resident/profile/daily-help/
        resident and flat are auto-injected — no need to pass them in body.

        Body: { name, help_type, phone (opt), timing (opt), days (opt), upi_id (opt), monthly_salary (opt) }
        """
        profile, flat = self._profile_and_flat()
        if not flat:
            return Response(
                {"success": False, "message": "No active flat linked. Please link a flat first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = DailyHelpSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save(resident=profile, flat=flat)
        logger.info("DAILY_HELP_CREATE | id=%s name='%s' resident=%s", obj.pk, obj.name, profile.pk)
        return Response({"success": True, "data": DailyHelpSerializer(obj).data}, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "data": DailyHelpSerializer(self.get_object()).data})

    def partial_update(self, request, *args, **kwargs):
        ser = DailyHelpSerializer(self.get_object(), data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        return Response({"success": True, "data": DailyHelpSerializer(obj).data})

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.delete()
        logger.info("DAILY_HELP_DELETE | id=%s by=%s", obj.pk, request.user)
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