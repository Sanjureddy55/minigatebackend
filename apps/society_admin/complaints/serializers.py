from rest_framework import serializers

from apps.resident.complaints.models import Complaint

# ── Society-admin status labels (different wording from resident side) ─────────
_ADMIN_STATUS_LABELS = {
    Complaint.Status.OPEN:        "Pending",
    Complaint.Status.IN_PROGRESS: "In Review",
    Complaint.Status.RESOLVED:    "Approved",
    Complaint.Status.CLOSED:      "Closed",
}


class SocietyComplaintSerializer(serializers.ModelSerializer):
    """
    Society Admin read / manage view of resident-raised complaints.

    UI column mapping:
      ID       → complaint_number  (CMP-1042)
      ISSUE    → title
      FLAT     → flat_display      (A-402 / Tower B)
      PRIORITY → priority_display  (High / Low badge)
      STATUS   → status_display    (Pending / In Review / Approved / Closed)
    """
    complaint_number = serializers.CharField(read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    status_display   = serializers.SerializerMethodField()

    resident_name    = serializers.CharField(source="resident.full_name",    read_only=True, allow_null=True)
    flat_display     = serializers.SerializerMethodField()
    flat_number      = serializers.CharField(source="flat.flat_number",      read_only=True, allow_null=True)
    building_name    = serializers.CharField(source="flat.building.name",    read_only=True, allow_null=True)
    assigned_to_name = serializers.CharField(source="assigned_to.full_name", read_only=True, allow_null=True)
    raised_display   = serializers.SerializerMethodField()

    class Meta:
        model  = Complaint
        fields = [
            "id", "complaint_number",
            "resident", "resident_name",
            "flat", "flat_display", "flat_number", "building_name",
            "society",
            "title", "description",
            "category", "category_display",
            "priority", "priority_display",
            "status", "status_display",
            "photo_url",
            "assigned_to", "assigned_to_name",
            "resolution_notes", "resolved_at",
            "raised_display", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "complaint_number", "resident", "flat", "society",
            "photo_url", "resolved_at", "created_at", "updated_at",
        ]

    def get_status_display(self, obj) -> str:
        return _ADMIN_STATUS_LABELS.get(obj.status, obj.status.replace("_", " ").title())

    def get_flat_display(self, obj) -> str:
        if not obj.flat_id:
            return "Common"
        flat_number   = obj.flat.flat_number
        building_name = obj.flat.building.name if obj.flat.building_id and obj.flat.building else ""
        return f"{flat_number} / {building_name}" if building_name else flat_number

    def get_raised_display(self, obj) -> str:
        from django.utils import timezone
        delta = timezone.now() - obj.created_at
        days  = delta.days
        if days == 0:
            return "Today"
        if days == 1:
            return "Yesterday"
        return f"{days} days ago"


class LogComplaintSerializer(serializers.Serializer):
    """
    POST /api/society-admin/complaints/log/

    Society admin logs a complaint on behalf of a resident.
    Society is auto-injected — not needed in the body.
    Flat accepted by flat_number (e.g. 'A-402') — no UUID needed.
    Resident accepted by mobile number OR profile ID.
    """
    flat_number = serializers.CharField(
        max_length=20,
        help_text="Flat number e.g. 'A-402'. Use 'common' for common-area complaints.",
    )
    resident_mobile = serializers.CharField(
        max_length=20, required=False, allow_blank=True,
        help_text="Resident mobile number (preferred over resident_id).",
    )
    resident_id = serializers.IntegerField(
        required=False, allow_null=True,
        help_text="Resident UserProfile pk (fallback if mobile not provided).",
    )
    title       = serializers.CharField(max_length=255)
    description = serializers.CharField()
    category    = serializers.ChoiceField(choices=Complaint.Category.choices)
    priority    = serializers.ChoiceField(
        choices=Complaint.Priority.choices,
        default=Complaint.Priority.MEDIUM,
    )
    photo_url   = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if not attrs.get("resident_mobile") and not attrs.get("resident_id"):
            raise serializers.ValidationError(
                "Provide either 'resident_mobile' or 'resident_id'."
            )
        return attrs


class ComplaintAssignSerializer(serializers.Serializer):
    assigned_to = serializers.IntegerField(help_text="UserProfile pk of the staff to assign.")
    notes       = serializers.CharField(required=False, allow_blank=True, default="")


class ComplaintResolveSerializer(serializers.Serializer):
    resolution_notes = serializers.CharField(min_length=1)


class ComplaintStatsSerializer(serializers.Serializer):
    """Matches the 3 KPI cards in the UI: Open, In Progress, Resolved (30d)."""
    open          = serializers.IntegerField()
    in_progress   = serializers.IntegerField()
    resolved_30d  = serializers.IntegerField()
    closed        = serializers.IntegerField()
    total         = serializers.IntegerField()
    high_priority = serializers.IntegerField()
