from rest_framework import serializers

from apps.society_admin.notice_board.models import Notice, NoticeRead


class ResidentNoticeSerializer(serializers.ModelSerializer):
    """Read-only notice view for residents, including fundraiser progress."""

    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display   = serializers.CharField(source="get_status_display",   read_only=True)
    audience_display = serializers.CharField(source="get_audience_display", read_only=True)
    society_name     = serializers.CharField(source="society.name",         read_only=True, allow_null=True)
    fundraiser_progress_pct = serializers.SerializerMethodField()
    is_read          = serializers.SerializerMethodField()

    class Meta:
        model  = Notice
        fields = [
            "id", "title", "description", "category", "category_display",
            "event_date", "audience", "audience_display", "status", "status_display",
            "society", "society_name",
            "contribution_per_flat", "target_amount", "raised_amount",
            "fundraiser_progress_pct", "is_read",
            "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_fundraiser_progress_pct(self, obj) -> float:
        if obj.target_amount and obj.target_amount > 0:
            return round(float(obj.raised_amount / obj.target_amount) * 100, 1)
        return 0.0

    def get_is_read(self, obj) -> bool:
        resident_id = self.context.get("resident_id")
        if not resident_id:
            return False
        return NoticeRead.objects.filter(notice=obj, resident_id=resident_id).exists()


class FundraiserContributeSerializer(serializers.Serializer):
    amount         = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=1)
    payment_method = serializers.ChoiceField(choices=["cash", "upi", "bank_transfer", "cheque"], default="upi")
