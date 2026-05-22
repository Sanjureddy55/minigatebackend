from rest_framework import serializers


class DashboardKPISerializer(serializers.Serializer):
    active_residents     = serializers.IntegerField()
    residents_change_pct = serializers.FloatField()
    today_visitors       = serializers.IntegerField()
    visitors_change_pct  = serializers.FloatField()
    pending_approvals    = serializers.IntegerField()
    approvals_change_pct = serializers.FloatField()
    security_alerts      = serializers.IntegerField()
    alerts_change_pct    = serializers.FloatField()


class RecentActivitySerializer(serializers.Serializer):
    actor      = serializers.CharField()
    action     = serializers.CharField()
    subject    = serializers.CharField()
    time_ago   = serializers.CharField()
    event_type = serializers.CharField()


class PendingApprovalWidgetSerializer(serializers.Serializer):
    id         = serializers.IntegerField()
    title      = serializers.CharField()
    priority   = serializers.CharField()
    stage      = serializers.CharField()
    requester  = serializers.CharField()
    flat_info  = serializers.CharField()


class LiveVisitorWidgetSerializer(serializers.Serializer):
    id         = serializers.IntegerField()
    full_name  = serializers.CharField()
    visit_type = serializers.CharField()
    flat_info  = serializers.CharField()
    time       = serializers.CharField()
    status     = serializers.CharField()


class VisitorFlowEntrySerializer(serializers.Serializer):
    date        = serializers.DateField()
    guest       = serializers.IntegerField()
    delivery    = serializers.IntegerField()
    cab         = serializers.IntegerField()
    service     = serializers.IntegerField()
    other       = serializers.IntegerField()
    total       = serializers.IntegerField()


class StaffSummarySerializer(serializers.Serializer):
    total_staff  = serializers.IntegerField()
    guards       = serializers.IntegerField()
    housekeeping = serializers.IntegerField()
    maintenance  = serializers.IntegerField()
    on_leave     = serializers.IntegerField()


class ComplaintSummarySerializer(serializers.Serializer):
    open          = serializers.IntegerField()
    in_progress   = serializers.IntegerField()
    resolved_30d  = serializers.IntegerField()
    high_priority = serializers.IntegerField()


class SocietyDashboardSerializer(serializers.Serializer):
    kpis              = DashboardKPISerializer()
    staff_summary     = StaffSummarySerializer()
    complaint_summary = ComplaintSummarySerializer()
    recent_activity   = RecentActivitySerializer(many=True)
    pending_approvals = PendingApprovalWidgetSerializer(many=True)
    live_visitors     = LiveVisitorWidgetSerializer(many=True)
    visitor_flow      = VisitorFlowEntrySerializer(many=True)
