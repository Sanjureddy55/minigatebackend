from rest_framework import serializers

from .models import Complaint


class ComplaintSerializer(serializers.ModelSerializer):
    complaint_number = serializers.CharField(read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display   = serializers.CharField(source="get_status_display",   read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    raised_display   = serializers.SerializerMethodField()

    class Meta:
        model  = Complaint
        fields = [
            "id", "complaint_number", "resident", "flat", "society",
            "title", "description", "category", "category_display",
            "priority", "priority_display", "status", "status_display",
            "photo_url", "assigned_to",
            "resolution_notes", "resolved_at",
            "raised_display", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "complaint_number", "resolved_at", "created_at", "updated_at"]

    def get_raised_display(self, obj) -> str:
        from django.utils import timezone
        delta = timezone.now() - obj.created_at
        days  = delta.days
        if days == 0:
            return "Today"
        if days == 1:
            return "Yesterday"
        return f"{days} days ago"
