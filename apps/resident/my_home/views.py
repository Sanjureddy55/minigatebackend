import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsResident
from apps.resident.profile.models import (
    DailyHelp, FamilyMember, Pet, ResidentFlat, Vehicle,
)

logger = logging.getLogger(__name__)


def _primary_flat(profile):
    """Return the primary (or first active) ResidentFlat for this profile."""
    rf = (
        ResidentFlat.objects
        .filter(profile=profile, status=ResidentFlat.Status.ACTIVE)
        .select_related("flat__building__society__city", "flat__building")
        .order_by("-is_primary", "-created_at")
        .first()
    )
    return rf


def _build_response(profile, rf):
    """Build the full My Home payload from a ResidentFlat."""
    flat     = rf.flat
    building = flat.building
    society  = building.society if building else None
    city     = society.city if society else None

    family_count  = FamilyMember.objects.filter(resident=profile).count()
    vehicle_count = Vehicle.objects.filter(resident=profile, status=Vehicle.Status.ACTIVE).count()
    pet_count     = Pet.objects.filter(resident=profile).count()

    return {
        "success": True,
        "data": {
            # ── Flat card ─────────────────────────────────────────
            "flat_id":          str(flat.pk),
            "flat_number":      flat.flat_number,
            "building_name":    building.name if building else "",
            "floor":            rf.floor,
            "flat_type":        rf.flat_type,
            "resident_type":    "Owner" if rf.is_primary else "Tenant",
            "status":           rf.status,

            # ── Flat profile details ──────────────────────────────
            "area":             rf.area,
            "facing":           rf.facing,
            "parking_slots":    rf.parking_slots,
            "resident_since":   rf.resident_since,

            # ── Society & location ────────────────────────────────
            "society_name":     society.name if society else "",
            "society_id":       society.pk   if society else None,
            "total_flats":      society.total_flats if society else 0,
            "city":             city.name if city else "",

            # ── Counts (stat cards) ───────────────────────────────
            "family_count":     family_count,
            "vehicle_count":    vehicle_count,
            "pet_count":        pet_count,

            # ── Primary resident info ─────────────────────────────
            "resident_name":    profile.full_name,
            "resident_mobile":  profile.mobile,
            "resident_email":   profile.user.email if profile.user else "",

            # ── Utility connections ───────────────────────────────
            "internet_connection": rf.internet_connection,
            "power_connection":    rf.power_connection,
            "water_connection":    rf.water_connection,

            # ── ResidentFlat ID (needed for PATCH) ────────────────
            "resident_flat_id": rf.pk,
        },
    }


class MyHomeView(APIView):
    permission_classes = [IsResident]

    def get(self, request):
        """
        GET /api/resident/my-home/

        Returns the full My Home page data:
          flat details, area/facing/parking, utility connections,
          family/vehicle/pet counts, primary resident info, society details.
        """
        try:
            profile = request.user.profile
        except Exception:
            return Response({"success": False, "message": "Profile not found."}, status=400)

        rf = _primary_flat(profile)
        if not rf:
            return Response(
                {"success": False, "message": "No active flat linked to your account."},
                status=status.HTTP_404_NOT_FOUND,
            )

        logger.info("MY_HOME_GET | profile=%s flat=%s", profile.pk, rf.flat_id)
        return Response(_build_response(profile, rf))

    def patch(self, request):
        """
        PATCH /api/resident/my-home/

        Update Flat Profile — matches the 'Update Flat Profile' form.

        Body (all fields optional):
          {
            "floor":               "3rd Floor",
            "flat_type":           "3 BHK",
            "area":                "1480 sq ft",
            "facing":              "East",
            "parking_slots":       "P1-22 (Car) · B-07 (Bike)",
            "resident_since":      "2020-01-15",
            "internet_connection": "ACT Fibernet · 200 Mbps",
            "power_connection":    "BESCOM · Meter No. 44821",
            "water_connection":    "Borewell + BWSSB supply",
            "full_name":           "Priya Sharma",
            "email":               "priya.sharma@email.com"
          }
        """
        try:
            profile = request.user.profile
        except Exception:
            return Response({"success": False, "message": "Profile not found."}, status=400)

        rf = _primary_flat(profile)
        if not rf:
            return Response(
                {"success": False, "message": "No active flat linked to your account."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = request.data

        # ── Update ResidentFlat fields ─────────────────────────────────────────
        RF_FIELDS = [
            "floor", "flat_type", "area", "facing", "parking_slots",
            "resident_since", "internet_connection", "power_connection", "water_connection",
        ]
        rf_update_fields = []
        for field in RF_FIELDS:
            if field in data:
                setattr(rf, field, data[field])
                rf_update_fields.append(field)

        if rf_update_fields:
            rf_update_fields.append("updated_at")
            rf.save(update_fields=rf_update_fields)

        # ── Update resident profile (name / email) ─────────────────────────────
        profile_updated = False
        if "full_name" in data and data["full_name"].strip():
            profile.full_name = data["full_name"].strip()
            profile_updated = True

        if profile_updated:
            profile.save(update_fields=["full_name", "updated_at"])

        # Update email on the Django User
        if "email" in data and profile.user:
            profile.user.email = data["email"].strip()
            profile.user.save(update_fields=["email"])

        logger.info(
            "MY_HOME_UPDATE | profile=%s flat=%s fields=%s",
            profile.pk, rf.flat_id, rf_update_fields,
        )
        return Response(_build_response(profile, rf))
