import logging

from rest_framework import serializers

from apps.platform_admin.create_society.models import Society
from apps.roles_permissions.models import UserProfile

from .models import ApprovalRequest

logger = logging.getLogger(__name__)


class ApprovalRequestSerializer(serializers.ModelSerializer):
    approval_number  = serializers.CharField(read_only=True)
    # ── Display labels ────────────────────────────────────────────────────────
    status_display   = serializers.CharField(source="get_status_display",   read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    stage_display    = serializers.CharField(source="get_stage_display",    read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    # ── Linked names ──────────────────────────────────────────────────────────
    society_name    = serializers.CharField(source="society.name",           read_only=True)
    requester_name  = serializers.CharField(source="requester.full_name",    read_only=True, allow_null=True)
    requester_email = serializers.EmailField(source="requester.user.email",  read_only=True, allow_null=True)
    reviewer_name   = serializers.CharField(source="reviewer.full_name",     read_only=True, allow_null=True)
    visitor_name    = serializers.CharField(source="visitor.full_name",      read_only=True, allow_null=True)

    class Meta:
        model  = ApprovalRequest
        fields = [
            "id", "approval_number",
            "title", "description",
            "category", "category_display",
            "priority", "priority_display",
            "stage",    "stage_display",
            "status",   "status_display",
            "progress",
            "society",       "society_name",
            "requester",     "requester_name", "requester_email",
            "reviewer",      "reviewer_name",
            "visitor",       "visitor_name",
            "reviewer_notes", "reviewed_at",
            "created_at",    "updated_at",
        ]
        read_only_fields = [
            "id", "reviewer", "reviewer_notes", "reviewed_at",
            "created_at", "updated_at",
        ]

    def validate_progress(self, value: int) -> int:
        if not 0 <= value <= 100:
            raise serializers.ValidationError("Progress must be between 0 and 100.")
        return value

    def validate_society(self, value: Society) -> Society:
        if value.status != Society.Status.ACTIVE:
            raise serializers.ValidationError("This society is inactive.")
        return value


class ApprovalActionSerializer(serializers.Serializer):
    """Body for approve / reject actions."""
    reviewer_notes = serializers.CharField(required=False, allow_blank=True, default="")
    progress       = serializers.IntegerField(min_value=0, max_value=100, required=False)


class ApprovalRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=1, help_text="Reason for rejection (required).")
