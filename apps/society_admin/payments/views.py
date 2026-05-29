import datetime
import logging

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsSocietyAdmin
from apps.platform_admin.create_society.models import Society
from apps.resident.payments.models import MaintenanceDue
from apps.resident.profile.models import ResidentFlat
from apps.society_admin.flats.models import Flat

from .serializers import (
    GenerateDuesSerializer,
    PaymentOverviewSerializer,
    UpdateDueStatusSerializer,
)

logger = logging.getLogger(__name__)

_STATUS_LABELS = {
    MaintenanceDue.Status.PENDING: "Pending",
    MaintenanceDue.Status.PAID:    "Approved",
    MaintenanceDue.Status.OVERDUE: "Rejected",
}


def _admin_society(request):
    try:
        sid = request.user.profile.society_id
        if not sid:
            raise ValueError
        return Society.objects.get(pk=sid)
    except Exception:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Your account is not linked to any society.")


def _build_dues_list(dues_qs):
    """Convert a MaintenanceDue queryset into the list needed by PaymentOverviewSerializer."""
    # Build flat_id → resident name from ResidentFlat (active primary resident)
    flat_ids = [d.flat_id for d in dues_qs if d.flat_id]
    rf_map = {
        str(rf.flat_id): rf.profile.full_name
        for rf in (
            ResidentFlat.objects
            .filter(flat_id__in=flat_ids, is_primary=True, status=ResidentFlat.Status.ACTIVE)
            .select_related("profile")
        )
    }

    result = []
    for due in dues_qs:
        flat_num  = due.flat.flat_number if due.flat else ""
        building  = due.flat.building.name if due.flat and due.flat.building_id else ""
        result.append({
            "due_id":         due.pk,
            "flat_number":    flat_num,
            "building":       building,
            "resident":       rf_map.get(str(due.flat_id), ""),
            "amount":         due.amount,
            "due_date":       due.due_date,
            "month":          due.month,
            "status":         due.status,
            "status_display": _STATUS_LABELS.get(due.status, due.status.title()),
        })
    return result


class PaymentsOverviewView(APIView):
    permission_classes = [IsSocietyAdmin]

    def get(self, request):
        """
        GET /api/society-admin/payments/overview/
        No params needed — auto-scoped to admin's society.

        Optional: ?month=YYYY-MM  (default: current month)

        Returns the 4 stat cards + dues table:
          Collected (May) | Outstanding | Defaulters | Avg Collection %
        """
        society = _admin_society(request)
        today   = timezone.localdate()

        month_str = request.query_params.get("month", "")
        if month_str:
            try:
                year, mon = month_str.strip().split("-")
                target_year, target_month = int(year), int(mon)
            except (ValueError, AttributeError):
                return Response({"success": False, "message": "month must be YYYY-MM."}, status=400)
        else:
            target_year, target_month = today.year, today.month

        dues_qs = (
            MaintenanceDue.objects
            .filter(society=society, month__year=target_year, month__month=target_month)
            .select_related("flat", "flat__building")
            .order_by("flat__building__name", "flat__flat_number")
        )

        agg = dues_qs.aggregate(
            collected   = Sum("amount", filter=Q(status=MaintenanceDue.Status.PAID)),
            outstanding = Sum("amount", filter=Q(status__in=[
                MaintenanceDue.Status.PENDING, MaintenanceDue.Status.OVERDUE,
            ])),
            defaulters  = Count("flat_id", filter=Q(status=MaintenanceDue.Status.OVERDUE), distinct=True),
        )

        collected   = float(agg["collected"]   or 0)
        outstanding = float(agg["outstanding"] or 0)
        defaulters  = agg["defaulters"] or 0
        total       = collected + outstanding
        avg_pct     = round((collected / total * 100), 1) if total > 0 else 0.0

        data = {
            "collected_this_month": collected,
            "outstanding":          outstanding,
            "defaulters":           defaulters,
            "avg_collection_pct":   avg_pct,
            "dues":                 _build_dues_list(dues_qs),
            "month":                f"{target_year}-{target_month:02d}",
        }

        logger.info(
            "PAYMENTS_OVERVIEW | society=%s month=%s-%02d collected=%.0f outstanding=%.0f",
            society.pk, target_year, target_month, collected, outstanding,
        )
        return Response({"success": True, "data": PaymentOverviewSerializer(data).data})


class GenerateDuesView(APIView):
    permission_classes = [IsSocietyAdmin]

    def post(self, request):
        """
        POST /api/society-admin/payments/generate/

        Generates a MaintenanceDue for every OCCUPIED flat in the society.
        Existing dues for the same flat+month are skipped (no overwrite).

        Body:
          {
            "month":       "2026-05",
            "amount":      2500,
            "due_date":    "2026-05-10",
            "description": "May 2026 Maintenance"
          }
        """
        society = _admin_society(request)
        ser     = GenerateDuesSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        # Parse month string → first day of month
        year, mon = map(int, d["month"].split("-"))
        month_date = datetime.date(year, mon, 1)

        # All occupied flats (have at least one ACTIVE ResidentFlat)
        occupied_flat_ids = set(
            ResidentFlat.objects
            .filter(society=society, status=ResidentFlat.Status.ACTIVE)
            .values_list("flat_id", flat=True)
            .distinct()
        )

        if not occupied_flat_ids:
            return Response(
                {"success": False, "message": "No occupied flats found in this society."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Skip flats that already have a due for this month
        existing_flat_ids = set(
            MaintenanceDue.objects
            .filter(society=society, month=month_date, flat_id__in=occupied_flat_ids)
            .values_list("flat_id", flat=True)
        )

        to_create_ids = occupied_flat_ids - existing_flat_ids
        if not to_create_ids:
            return Response(
                {
                    "success": False,
                    "message": f"Dues for {d['month']} already exist for all {len(existing_flat_ids)} flats.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        dues = [
            MaintenanceDue(
                flat_id     = fid,
                society     = society,
                month       = month_date,
                amount      = d["amount"],
                due_date    = d["due_date"],
                status      = MaintenanceDue.Status.PENDING,
                description = d.get("description", "") or f"{month_date.strftime('%b %Y')} Maintenance",
            )
            for fid in to_create_ids
        ]
        created = MaintenanceDue.objects.bulk_create(dues, ignore_conflicts=True)

        logger.info(
            "DUES_GENERATE | society=%s month=%s amount=%s created=%d skipped=%d by=%s",
            society.pk, d["month"], d["amount"], len(created), len(existing_flat_ids), request.user,
        )
        return Response(
            {
                "success":  True,
                "message":  f"{len(created)} dues generated for {month_date.strftime('%B %Y')}.",
                "generated": len(created),
                "skipped":   len(existing_flat_ids),
                "month":     d["month"],
                "amount":    str(d["amount"]),
                "due_date":  str(d["due_date"]),
            },
            status=status.HTTP_201_CREATED,
        )


class DueDetailView(APIView):
    permission_classes = [IsSocietyAdmin]

    def _get_due(self, pk, society):
        try:
            return MaintenanceDue.objects.select_related(
                "flat", "flat__building"
            ).get(pk=pk, society=society)
        except MaintenanceDue.DoesNotExist:
            return None

    def get(self, request, pk):
        """GET /api/society-admin/payments/dues/{id}/"""
        society = _admin_society(request)
        due     = self._get_due(pk, society)
        if not due:
            return Response({"success": False, "message": "Due not found."}, status=404)
        rows = _build_dues_list([due])
        return Response({"success": True, "data": rows[0]})

    def patch(self, request, pk):
        """
        PATCH /api/society-admin/payments/dues/{id}/
        Update status: paid (Approved) / pending / overdue (Rejected)

        Body: { "status": "paid" }
        """
        society = _admin_society(request)
        due     = self._get_due(pk, society)
        if not due:
            return Response({"success": False, "message": "Due not found."}, status=404)

        ser = UpdateDueStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        due.status = ser.validated_data["status"]
        if due.status == MaintenanceDue.Status.PAID:
            due.paid_at = timezone.now()
        update_fields = ["status"]
        if due.status == MaintenanceDue.Status.PAID:
            update_fields.append("paid_at")
        MaintenanceDue.objects.filter(pk=due.pk).update(
            **{f: getattr(due, f) for f in update_fields}
        )

        logger.info("DUE_STATUS | due=%s status=%s by=%s", due.pk, due.status, request.user)
        rows = _build_dues_list([due])
        return Response({"success": True, "data": rows[0]})
