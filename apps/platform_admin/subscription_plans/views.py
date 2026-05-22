import logging

from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from apps.common.permissions import IsSuperAdmin

from apps.platform_admin.audit_logs.utils import log_action
from apps.platform_admin.create_society.models import Society
from apps.platform_admin.dashboard.models import PlatformPayment

from .models import SubscriptionPlan
from .serializers import SubscriptionPlanSerializer, SubscriptionPlanStatsSerializer

logger = logging.getLogger(__name__)


def _build_society_maps():
    """Return (counts_by_slug, flats_by_slug) dicts from a single Society scan."""
    counts = {}
    flats  = {}
    for row in Society.objects.values("plan").annotate(cnt=Count("id"), fl=Coalesce(Sum("total_flats"), 0)):
        counts[row["plan"]] = row["cnt"]
        flats[row["plan"]]  = row["fl"]
    return counts, flats


class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    """
    ┌──────────────────────────────────────────────────────────────┐
    │ GET    /              List all plans with tenants count       │
    │ POST   /              Create a new plan                       │
    │ GET    /<id>/         Plan detail                             │
    │ PUT    /<id>/         Full update                             │
    │ PATCH  /<id>/         Partial update                          │
    │ DELETE /<id>/         Delete (blocked if societies are on it) │
    │ GET    /stats/        MRR, Active Plans, Trial, Churn (90d)  │
    └──────────────────────────────────────────────────────────────┘

    Search:   ?search=   (name, description)
    Ordering: ?ordering= name | monthly_price | sort_order
    Filter:   ?status=   active | inactive
    """
    permission_classes = [IsSuperAdmin]

    serializer_class = SubscriptionPlanSerializer
    filter_backends  = [SearchFilter, OrderingFilter]
    search_fields    = ["name", "description"]
    ordering_fields  = ["name", "monthly_price", "annual_price", "sort_order", "created_at"]
    ordering         = ["sort_order", "monthly_price"]

    def get_queryset(self):
        qs = SubscriptionPlan.objects.all()
        if s := self.request.query_params.get("status"):
            qs = qs.filter(status=s)
        return qs

    def _enrich(self, plan, counts, flats):
        """Inject tenants + total_flats into a serialized plan dict."""
        data = SubscriptionPlanSerializer(plan).data
        data["tenants"]     = counts.get(plan.slug, 0)
        data["total_flats"] = flats.get(plan.slug, 0)
        return data

    # ── List ──────────────────────────────────────────────────────────────────

    def list(self, request, *args, **kwargs):
        qs      = self.filter_queryset(self.get_queryset())
        counts, flats = _build_society_maps()
        page    = self.paginate_queryset(qs)
        items   = page if page is not None else qs
        results = [self._enrich(p, counts, flats) for p in items]

        if page is not None:
            return self.get_paginated_response(results)
        return Response({"success": True, "count": len(results), "results": results})

    # ── Retrieve ──────────────────────────────────────────────────────────────

    def retrieve(self, request, *args, **kwargs):
        plan = self.get_object()
        counts, flats = _build_society_maps()
        return Response({"success": True, "data": self._enrich(plan, counts, flats)})

    # ── Create ────────────────────────────────────────────────────────────────

    def create(self, request, *args, **kwargs):
        ser = SubscriptionPlanSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        plan = ser.save()
        logger.info("PLAN_CREATE | id=%s name=%s by=%s", plan.pk, plan.name, request.user)
        log_action(request=request, action="created plan", action_type="create",
                   target=plan.name, target_type="plan", target_id=str(plan.pk))
        return Response(
            {"success": True, "data": SubscriptionPlanSerializer(plan).data},
            status=status.HTTP_201_CREATED,
        )

    # ── Update / Partial Update ───────────────────────────────────────────────

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        plan = self.get_object()
        old_name = plan.name
        ser  = SubscriptionPlanSerializer(plan, data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        plan = ser.save()
        logger.info("PLAN_UPDATE | id=%s name=%s by=%s", plan.pk, plan.name, request.user)
        target = f"{old_name} → {plan.name}" if old_name != plan.name else plan.name
        log_action(request=request, action="updated plan", action_type="update",
                   target=target, target_type="plan", target_id=str(plan.pk))
        counts, flats = _build_society_maps()
        return Response({"success": True, "data": self._enrich(plan, counts, flats)})

    # ── Delete ────────────────────────────────────────────────────────────────

    def destroy(self, request, *args, **kwargs):
        plan = self.get_object()
        on_plan = Society.objects.filter(plan=plan.slug).count()
        if on_plan > 0:
            return Response(
                {"detail": f"Cannot delete — {on_plan} {'society' if on_plan == 1 else 'societies'} "
                           f"are on this plan. Move them first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = plan.name
        plan.delete()
        logger.info("PLAN_DELETE | name=%s by=%s", name, request.user)
        log_action(request=request, action="deleted plan", action_type="delete",
                   target=name, target_type="plan")
        return Response({"success": True, "message": f"Plan '{name}' deleted."}, status=status.HTTP_200_OK)

    # ── Stats — 4 KPI cards ───────────────────────────────────────────────────

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """
        GET /stats/

        Returns the 4 KPI cards shown in the UI:
          MRR        — sum of paid subscription payments this month
          active_plans — active plan count
          trial      — societies on plans marked is_trial=True
          churn_90d  — % of societies that went inactive in last 90 days
        """
        today = timezone.localdate()

        # MRR — paid subscription payments this month
        mrr = PlatformPayment.objects.filter(
            status=PlatformPayment.Status.PAID,
            payment_type=PlatformPayment.PaymentType.SUBSCRIPTION,
            payment_date__year=today.year,
            payment_date__month=today.month,
        ).aggregate(total=Sum("amount"))["total"] or 0

        plans = SubscriptionPlan.objects.all()

        # Trial — societies on any plan flagged is_trial=True
        trial_slugs = list(plans.filter(is_trial=True).values_list("slug", flat=True))
        trial = Society.objects.filter(plan__in=trial_slugs).count() if trial_slugs else 0

        # Churn (90d) — societies that became inactive in last 90 days
        cutoff_90d  = timezone.now() - timezone.timedelta(days=90)
        total_soc   = Society.objects.count()
        churned     = Society.objects.filter(
            status=Society.Status.INACTIVE,
            updated_at__gte=cutoff_90d,
        ).count()
        churn_90d = round(churned / total_soc * 100, 1) if total_soc > 0 else 0.0

        # Per-plan breakdown
        counts, flats = _build_society_maps()
        breakdown = []
        for p in plans.order_by("sort_order", "monthly_price"):
            ser_data = SubscriptionPlanSerializer(p).data
            breakdown.append({
                "id":            p.pk,
                "name":          p.name,
                "slug":          p.slug,
                "price_display": ser_data["price_display"],
                "monthly_price": float(p.monthly_price),
                "tenants":       counts.get(p.slug, 0),
                "total_flats":   flats.get(p.slug, 0),
                "status":        p.status,
                "status_display": p.get_status_display(),
                "is_popular":    p.is_popular,
                "is_trial":      p.is_trial,
            })

        data = {
            "mrr":           mrr,
            "active_plans":  plans.filter(status=SubscriptionPlan.Status.ACTIVE).count(),
            "trial":         trial,
            "churn_90d":     churn_90d,
            "total_plans":   plans.count(),
            "plan_breakdown": breakdown,
        }
        return Response({"success": True, "data": SubscriptionPlanStatsSerializer(data).data})