from rest_framework import serializers

from apps.resident.complaints.models import Complaint

# ── Society-admin status labels (different wording from resident side) ─────────
_ADMIN_STATUS_LABELS = {
    Complaint.Status.OPEN:        "Pending",
    Complaint.Status.IN_PROGRESS: "In Review",
    Complaint.Status.RESOLVED:    "Approved",
    Complaint.Status.CLOSED:      "Closed",
}

_ADMIN_PRIORITY_LABELS = {
    Complaint.Priority.LOW:    "Low",
    Complaint.Priority.MEDIUM: "Medium",
    Complaint.Priority.HIGH:   "High",
    Complaint.Priority.URGENT: "Urgent",
}


class SocietyComplaintSerializer(serializers.ModelSerializer):
    """
    Society Admin read / manage view of resident-raised complaints.

    UI column mapping:
      ID       → complaint_number  (CMP-1042)
      ISSUE    → title
      FLAT     → flat_display      (A-402 / Tower B)
      PRIORITY → priority_display  (High / Low badge)
      STATUS   → status_display    (Pending / In Review / Approved / Closed badge)
    """
    complaint_number = serializers.CharField(read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    priority_display = serializers.SerializerMethodField()
    status_display   = serializers.SerializerMethodField()

    # Resident info
    resident_name    = serializers.CharField(source="resident.full_name",     read_only=True, allow_null=True)

    # Flat info — flat_display is the short label shown in the FLAT column
    flat_display     = serializers.SerializerMethodField()
    flat_number      = serializers.CharField(source="flat.flat_number",       read_only=True, allow_null=True)
    building_name    = serializers.CharField(source="flat.building.name",     read_only=True, allow_null=True)

    # Assignment
    assigned_to_name = serializers.CharField(source="assigned_to.full_name",  read_only=True, allow_null=True)

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
            "status",   "status_display",
            "photo_url",
            "assigned_to", "assigned_to_name",
            "resolution_notes", "resolved_at",
            "raised_display", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "complaint_number", "resident", "flat", "society",
            "title", "description", "category",
            "photo_url", "resolved_at", "created_at", "updated_at",
        ]

    def get_status_display(self, obj) -> str:
        return _ADMIN_STATUS_LABELS.get(obj.status, obj.status.replace("_", " ").title())

    def get_priority_display(self, obj) -> str:
        return _ADMIN_PRIORITY_LABELS.get(obj.priority, obj.priority.title())

    def get_flat_display(self, obj) -> str:
        if not obj.flat_id:
            return "Common"
        flat_number = obj.flat.flat_number
        if obj.flat.building_id and obj.flat.building:
            return f"{obj.flat.building.name} - {flat_number}"
        return flat_number

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
    Body for POST /api/society-admin/complaints/log/
    Society admin logs a complaint on behalf of a resident.
    """
    society     = serializers.IntegerField()
    flat        = serializers.UUIDField()
    resident    = serializers.IntegerField(help_text="UserProfile pk of the resident.")
    title       = serializers.CharField(max_length=255)
    description = serializers.CharField()
    category    = serializers.ChoiceField(choices=Complaint.Category.choices)
    priority    = serializers.ChoiceField(
        choices=Complaint.Priority.choices,
        default=Complaint.Priority.MEDIUM,
    )
    photo_url   = serializers.CharField(required=False, allow_blank=True, default="")


class ComplaintAssignSerializer(serializers.Serializer):
    assigned_to = serializers.IntegerField(help_text="UserProfile pk of the staff to assign.")
    notes       = serializers.CharField(required=False, allow_blank=True, default="")


class ComplaintResolveSerializer(serializers.Serializer):
    resolution_notes = serializers.CharField(min_length=1)


class ComplaintStatsSerializer(serializers.Serializer):
    """Matches exactly the KPI cards shown in the UI."""
    open          = serializers.IntegerField()   # "Pending" in table, "Open" in KPI card
    in_progress   = serializers.IntegerField()   # "In Review" in table, "In Progress" in KPI card
    resolved_30d  = serializers.IntegerField()   # "Approved" last 30 days — "Resolved (30d)" KPI
    closed        = serializers.IntegerField()
    total         = serializers.IntegerField()
    high_priority = serializers.IntegerField()   # High + Urgent open/in-review complaints
