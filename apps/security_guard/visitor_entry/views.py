import logging

from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSecurityGuard
from apps.society_admin.visitors.models import Visitor
from apps.society_admin.visitors.serializers import VisitorSerializer

from .serializers import RegisterVisitorSerializer, VisitorSearchResultSerializer

logger = logging.getLogger(__name__)


class RegisterVisitorView(APIView):
    """
    POST /api/security-guard/visitor-entry/

    Guard registers a new visitor at the gate.
    Visitor is created directly as APPROVED (guard is physically present
    and verifying identity — no separate approval needed).

    GET  /api/security-guard/visitor-entry/
    List today's approved/inside visitors for the society (Approved Visitors tab).
    """
    permission_classes = [IsSecurityGuard]

    def _sid(self, request):
        try:
            return request.user.profile.society_id
        except Exception:
            return None

    def get(self, request):
        """Return today's visitor entries — powers the Approved Visitors list."""
        society_id = self._sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        today = timezone.localdate()
        qs = (
            Visitor.objects
            .filter(
                society_id=society_id,
                status__in=[Visitor.Status.APPROVED, Visitor.Status.INSIDE, Visitor.Status.EXITED],
                created_at__date=today,
            )
            .select_related("flat", "flat__building", "approved_by")
            .order_by("-created_at")
        )

        visit_type = request.query_params.get("visit_type")
        if visit_type:
            qs = qs.filter(visit_type=visit_type)

        return Response({
            "success": True,
            "count":   qs.count(),
            "results": VisitorSerializer(qs, many=True).data,
        })

    def post(self, request):
        society_id = self._sid(request)
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        ser = RegisterVisitorSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        flat_id = data.pop("flat", None)

        visitor = Visitor.objects.create(
            society_id=society_id,
            flat_id=flat_id,
            status=Visitor.Status.APPROVED,
            approved_by=request.user.profile,
            **data,
        )

        logger.info(
            "VISITOR_REGISTER | id=%s society=%s name='%s' type=%s flat=%s by=%s",
            visitor.pk, society_id, visitor.full_name,
            visitor.visit_type, flat_id, request.user.profile.pk,
        )
        return Response(
            {"success": True, "message": "Visitor registered.", "data": VisitorSerializer(visitor).data},
            status=status.HTTP_201_CREATED,
        )


class GateLogView(APIView):
    """
    GET /api/security-guard/visitor-entry/gate-log/

    Today's gate log — APPROVED + INSIDE visitors ordered by arrival.
    Powers the "Today's Gate Log" right panel on the Visitor Entry page.
    Each row includes: initials, name, flat, status, checked_in_at.

    Actions the guard can take from this panel:
      Reject  → PATCH visitor to REJECTED  (only APPROVED rows)
      CheckOut → PATCH visitor to EXITED   (only INSIDE rows)
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        society_id = request.user.profile.society_id if hasattr(request.user, "profile") else None
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        today = timezone.localdate()
        qs = (
            Visitor.objects
            .filter(
                society_id=society_id,
                created_at__date=today,
                status__in=[Visitor.Status.APPROVED, Visitor.Status.INSIDE],
            )
            .select_related("flat", "flat__building")
            .order_by("-created_at")
        )

        rows = []
        for v in qs:
            flat_display = ""
            if v.flat:
                flat_display = v.flat.flat_number
                if v.flat.building:
                    flat_display = f"{v.flat.building.name} – {v.flat.flat_number}"
            elif v.host_name:
                flat_display = v.host_name

            words = v.full_name.strip().split()
            initials = (words[0][0] + (words[-1][0] if len(words) > 1 else "")).upper()

            rows.append({
                "id":             v.pk,
                "full_name":      v.full_name,
                "initials":       initials,
                "flat_display":   flat_display,
                "visit_type":     v.visit_type,
                "visit_type_display": v.get_visit_type_display(),
                "status":         v.status,
                "status_display": v.get_status_display(),
                "checked_in_at":  v.checked_in_at,
                "mobile":         v.mobile,
            })

        return Response({"success": True, "count": len(rows), "results": rows})


class VisitorSearchView(APIView):
    """
    GET /api/security-guard/visitor-entry/search/?q=<query>&limit=20

    Global gate search — searches today's visitors by name or mobile.
    Used by the top search bar: "Search residents, visitors, approvals..."
    """
    permission_classes = [IsSecurityGuard]

    def get(self, request):
        society_id = request.user.profile.society_id if hasattr(request.user, "profile") else None
        if not society_id:
            return Response({"success": False, "message": "No linked society."}, status=400)

        q     = request.query_params.get("q", "").strip()
        limit = min(int(request.query_params.get("limit", 20)), 50)

        if len(q) < 2:
            return Response({"success": True, "results": []})

        today = timezone.localdate()
        qs = (
            Visitor.objects
            .filter(society_id=society_id)
            .filter(Q(full_name__icontains=q) | Q(mobile__icontains=q) | Q(vehicle_number__icontains=q))
            .select_related("flat", "flat__building")
            .order_by("-created_at")
        )

        # Prioritise today first
        today_qs  = qs.filter(created_at__date=today)[:limit]
        older_qs  = qs.exclude(created_at__date=today)[: max(0, limit - today_qs.count())]
        combined  = list(today_qs) + list(older_qs)

        results = []
        for v in combined:
            results.append({
                "id":            v.pk,
                "type":          "visitor",
                "full_name":     v.full_name,
                "mobile":        v.mobile,
                "flat_number":   v.flat.flat_number   if v.flat else None,
                "building":      v.flat.building.name if v.flat and v.flat.building else None,
                "status":        v.status,
                "visit_type":    v.visit_type,
                "checked_in_at":  v.checked_in_at,
                "checked_out_at": v.checked_out_at,
            })

        return Response({"success": True, "count": len(results), "results": results})
