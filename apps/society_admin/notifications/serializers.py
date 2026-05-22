import logging

from rest_framework import serializers

from .models import Notification

logger = logging.getLogger(__name__)


class NotificationSerializer(serializers.ModelSerializer):
    notif_type_display = serializers.CharField(source="get_notif_type_display", read_only=True)
    recipient_name     = serializers.CharField(source="recipient.full_name",    read_only=True, allow_null=True)
    society_name       = serializers.CharField(source="society.name",           read_only=True, allow_null=True)
    notice_title       = serializers.CharField(source="notice.title",           read_only=True, allow_null=True)

    class Meta:
        model  = Notification
        fields = [
            "id",
            "title", "body",
            "notif_type", "notif_type_display",
            "recipient", "recipient_name",
            "society",   "society_name",
            "notice",    "notice_title",
            "is_read",   "read_at",
            "created_at",
        ]
        read_only_fields = ["id", "is_read", "read_at", "created_at"]


class NotificationStatsSerializer(serializers.Serializer):
    total         = serializers.IntegerField()
    unread        = serializers.IntegerField()
    by_type       = serializers.ListField(child=serializers.DictField())
