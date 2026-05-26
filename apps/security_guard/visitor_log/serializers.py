from rest_framework import serializers

# Re-use the canonical VisitorSerializer; action-specific serializers below.
from apps.society_admin.visitors.serializers import (  # noqa: F401
    VisitorSerializer,
    VisitorApproveSerializer,
    VisitorRejectSerializer,
)


class VisitorCheckInOutSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, default="")
