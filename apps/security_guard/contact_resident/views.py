"""
Contact Resident — Security Guard view.

Guards search residents in their society by flat number, building name, or
resident name. Selecting a flat reveals all occupants and their mobile numbers
so the guard can call them directly (frontend uses tel: links).

Data source:
  ResidentFlat (resident_profile) → UserProfile (roles_permissions) + Flat (society_admin_flats)
  Only ACTIVE flat links are shown — pending or inactive occupants are excluded.
"""

import logging

from django.db.models import Count, Q
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSecurityGuard
from apps.resident.profile.models import FamilyMember, ResidentFlat

from .serializers import (
    ContactResidentStatsSerializer,
    FlatContactDetailSerializer,
    FlatContactSummarySerializer,
)

logger = logging.getLogger(__name__)


def _sid(request):
    try:
        return request.user.profile.society_id
    except Exception:
        return None


def _flat_display(flat) -> str:
    if not flat:
        return ""
    building = flat.building
    if building and building.name:
        parts  = building.name.strip().split()
        prefix = parts[-1] if len(parts) > 1 else parts[0]
        return f"{prefix}-{flat.flat_number}"
    return flat.flat_number


def _family_counts_by_flat(society_id) -> dict:
    """Returns {flat_id_str: count} for FamilyMember records in the society."""
    rows = (
        FamilyMember.objects
        .filter(flat__resident_occupants__society_id=society_id)
        .values("flat_id")
        .annotate(cnt=Count("id"))
    )
    return {str(r["flat_id"]): r["cnt"] for r in rows}


def _group_by_flat(qs, family_counts: dict | None = None):
    """
    Takes a ResidentFlat queryset (with select_related) and returns
    a list of flat-centric dicts, each containing all its residents.
    Preserves the ordering of the queryset (building + flat_number).
    """
    if family_counts is None:
        family_counts = {}

    flats_seen = {}
    flat_order = []

    for rf in qs:
        fid = str(rf.flat.pk)
        if fid not in flats_seen:
            flat = rf.flat
            flats_seen[fid] = {
                "flat_id":             fid,
                "flat_number":         flat.flat_number,
                "flat_display":        _flat_display(flat),
                "building_name":       flat.building.name if flat.building else "",
                "residents":           [],
                "family_member_count": family_counts.get(fid, 0),
            }
            flat_order.append(fid)

        flats_seen[fid]["residents"].append({
            "resident_id":   rf.profile.pk,
            "full_name":     rf.profile.full_name,
            "mobile":        rf.profile.mobile,
            "is_primary":    rf.is_primary,
            "resident_type": "owner" if rf.is_primary else "tenant",
        })

    result = []
    for fid in flat_order:
        entry = flats_seen[fid]
        entry["resident_count"] = len(entry["residents"])
        result.append(entry)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Views
# ─────────────────────────────────────────────────────────────────────────────

class ContactResidentStatsView(APIView):
    """
    GET /api/security-guard/contact-resident/stats/

    Returns KPI totals: total flats occupied, total residents, family members.
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = ResidentFlat.objects.filter(society_id=society_id, status=ResidentFlat.Status.ACTIVE)
        total_residents = qs.count()
        total_flats     = qs.values("flat_id").distinct().count()
        owners          = qs.filter(is_primary=True).count()
        tenants         = qs.filter(is_primary=False).count()
        family_members  = FamilyMember.objects.filter(
            flat__resident_occupants__society_id=society_id
        ).distinct().count()

        data = {
            "total_flats":     total_flats,
            "total_residents": total_residents,
            "owners":          owners,
            "tenants":         tenants,
            "family_members":  family_members,
        }
        return Response({"success": True, "data": ContactResidentStatsSerializer(data).data})


class ContactResidentListView(APIView):
    """
    GET /api/security-guard/contact-resident/

    Returns all occupied flats in the guard's society, each with the list
    of active resident occupants and their contact numbers.

    Query params:
      ?search=<flat number, building name, or resident name / mobile>

    Response:
      { "success": true, "count": N, "results": [ { flat }, ... ] }

    Each flat row:
      flat_id, flat_number, flat_display, building_name, resident_count, family_member_count, residents[]
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = (
            ResidentFlat.objects
            .filter(society_id=society_id, status=ResidentFlat.Status.ACTIVE)
            .select_related("profile", "flat", "flat__building")
            .order_by("flat__building__name", "flat__flat_number", "-is_primary")
        )

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(flat__flat_number__icontains=search)
                | Q(flat__building__name__icontains=search)
                | Q(profile__full_name__icontains=search)
                | Q(profile__mobile__icontains=search)
            )

        family_counts = _family_counts_by_flat(society_id)
        results = _group_by_flat(qs, family_counts)

        logger.info(
            "CONTACT_RESIDENT_LIST | society=%s flats=%d search='%s' by=%s",
            society_id, len(results), search, request.user.pk,
        )
        return Response({
            "success": True,
            "count":   len(results),
            "results": FlatContactSummarySerializer(results, many=True).data,
        })


class ContactResidentDetailView(APIView):
    """
    GET /api/security-guard/contact-resident/<flat_id>/

    Full contact card for one flat: all active occupants with name + mobile.
    The frontend renders a call button for each resident using the mobile number.

    Only residents from the guard's own society are accessible.
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request, flat_id):
        society_id = _sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        qs = (
            ResidentFlat.objects
            .filter(
                flat_id=flat_id,
                society_id=society_id,
                status=ResidentFlat.Status.ACTIVE,
            )
            .select_related("profile", "flat", "flat__building")
            .order_by("-is_primary", "profile__full_name")
        )

        if not qs.exists():
            return Response(
                {"success": False, "message": "Flat not found or no active residents."},
                status=404,
            )

        family_count = FamilyMember.objects.filter(flat_id=flat_id).count()
        family_counts = {str(flat_id): family_count}
        results = _group_by_flat(qs, family_counts)
        flat_data = results[0]

        logger.info(
            "CONTACT_RESIDENT_DETAIL | society=%s flat=%s by=%s",
            society_id, flat_id, request.user.pk,
        )
        return Response({
            "success": True,
            "data":    FlatContactDetailSerializer(flat_data).data,
        })
