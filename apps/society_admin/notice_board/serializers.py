import logging

from rest_framework import serializers

from .models import Notice, NoticeRead

logger = logging.getLogger(__name__)


class NoticeSerializer(serializers.ModelSerializer):
    # ── Display labels ────────────────────────────────────────────────────────
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    audience_display = serializers.CharField(source="get_audience_display", read_only=True)
    status_display   = serializers.CharField(source="get_status_display",   read_only=True)

    # ── Linked names ──────────────────────────────────────────────────────────
    society_name      = serializers.CharField(source="society.name",          read_only=True)
    building_name     = serializers.CharField(source="building.name",         read_only=True, allow_null=True)
    created_by_name   = serializers.CharField(source="created_by.full_name",  read_only=True, allow_null=True)

    # ── Computed ──────────────────────────────────────────────────────────────
    read_count    = serializers.SerializerMethodField()
    is_fundraiser = serializers.SerializerMethodField()

    class Meta:
        model  = Notice
        fields = [
            "id",
            "title", "description",
            "category", "category_display",
            "audience", "audience_display",
            "status",   "status_display",
            "event_date",
            "society",       "society_name",
            "building",      "building_name",
            "created_by",    "created_by_name",
            "contribution_per_flat", "target_amount", "raised_amount",
            "is_fundraiser",
            "read_count",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "society", "created_by", "raised_amount",
            "created_at", "updated_at",
        ]

    def get_read_count(self, obj) -> int:
        return obj.reads.count()

    def get_is_fundraiser(self, obj) -> bool:
        return obj.category == Notice.Category.FUNDRAISER

    def validate(self, attrs):
        category = attrs.get("category", getattr(self.instance, "category", None))
        audience = attrs.get("audience", getattr(self.instance, "audience", None))
        building = attrs.get("building", getattr(self.instance, "building", None))

        if audience == Notice.Audience.TOWER and not building:
            raise serializers.ValidationError(
                {"building": "A building must be selected when audience is 'Specific Tower'."}
            )
        if category == Notice.Category.FUNDRAISER:
            contribution = attrs.get("contribution_per_flat", getattr(self.instance, "contribution_per_flat", None))
            target = attrs.get("target_amount", getattr(self.instance, "target_amount", None))
            if not contribution and not target:
                raise serializers.ValidationError(
                    {"contribution_per_flat": "Fundraisers require at least a contribution_per_flat or target_amount."}
                )
        return attrs


class NoticeReadSerializer(serializers.ModelSerializer):
    notice_title  = serializers.CharField(source="notice.title",         read_only=True)
    resident_name = serializers.CharField(source="resident.full_name",   read_only=True)

    class Meta:
        model  = NoticeRead
        fields = ["id", "notice", "notice_title", "resident", "resident_name", "read_at"]
        read_only_fields = ["id", "read_at"]


class NoticeDashboardSerializer(serializers.Serializer):
    """Shape of the notice board dashboard stats response."""
    active_notices    = serializers.IntegerField()
    live_fundraisers  = serializers.IntegerField()
    upcoming_events   = serializers.IntegerField()
    maintenance_alerts= serializers.IntegerField()
    total_unread      = serializers.IntegerField()
    by_category       = serializers.ListField(child=serializers.DictField())
    by_audience       = serializers.ListField(child=serializers.DictField())
