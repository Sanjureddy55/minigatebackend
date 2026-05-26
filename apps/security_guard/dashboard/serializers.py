from rest_framework import serializers


# ── Live Entry / Exit row ────────────────────────────────────────────────────

class LiveEntrySerializer(serializers.Serializer):
    id             = serializers.IntegerField()
    visitor_name   = serializers.CharField()
    flat_number    = serializers.CharField()
    gate           = serializers.CharField()
    time           = serializers.CharField(help_text="HH:MM local time")
    entry_type     = serializers.CharField()
    entry_type_display = serializers.CharField()
    direction      = serializers.CharField()     # "in" | "out"


# ── Gate Status card ─────────────────────────────────────────────────────────

class GateStatusSerializer(serializers.Serializer):
    id         = serializers.IntegerField()
    name       = serializers.CharField()
    status     = serializers.CharField()         # "open" | "closed"
    guard_name = serializers.CharField(allow_null=True)


# ── Active Alerts row ────────────────────────────────────────────────────────

class AlertBriefSerializer(serializers.Serializer):
    id           = serializers.IntegerField()
    alert_type   = serializers.CharField()
    description  = serializers.CharField()
    gate         = serializers.CharField()
    time_ago     = serializers.CharField()
    status       = serializers.CharField()       # "active" | "acknowledged"


# ── Full Dashboard payload ────────────────────────────────────────────────────

class SecurityDashboardSerializer(serializers.Serializer):
    # ── 4 KPI cards ──────────────────────────────────────────────────────────
    in_today       = serializers.IntegerField()
    out_today      = serializers.IntegerField()
    at_gate        = serializers.IntegerField()
    active_alerts  = serializers.IntegerField()

    # ── Guard shift context ───────────────────────────────────────────────────
    pending_approvals = serializers.IntegerField()
    shift_status      = serializers.CharField()
    shift_start       = serializers.TimeField(allow_null=True)
    gate_assigned     = serializers.CharField(allow_null=True)

    # ── Live Entry/Exit table (last 10 rows) ──────────────────────────────────
    live_entries = LiveEntrySerializer(many=True)

    # ── Gate status panel ─────────────────────────────────────────────────────
    gate_status = GateStatusSerializer(many=True)

    # ── Active/Acknowledged alerts panel ─────────────────────────────────────
    active_alerts_list = AlertBriefSerializer(many=True)
