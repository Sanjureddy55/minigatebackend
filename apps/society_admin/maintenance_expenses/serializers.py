from rest_framework import serializers

from .models import MaintenanceExpense


class MaintenanceExpenseSerializer(serializers.ModelSerializer):
    category_display     = serializers.CharField(source="get_category_display",      read_only=True)
    payment_mode_display = serializers.CharField(source="get_payment_mode_display",   read_only=True)
    society_name         = serializers.CharField(source="society.name",              read_only=True, allow_null=True)
    created_by_name      = serializers.CharField(source="created_by.full_name",      read_only=True, allow_null=True)
    visibility_display   = serializers.SerializerMethodField()
    status_display       = serializers.SerializerMethodField()

    class Meta:
        model  = MaintenanceExpense
        fields = [
            "id", "society", "society_name",
            "title", "category", "category_display",
            "amount", "vendor_name",
            "payment_mode", "payment_mode_display",
            "invoice_number", "building_area",
            "proof_url",
            "expense_date", "is_published",
            "visibility_display", "status_display",
            "created_by", "created_by_name", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_visibility_display(self, obj):
        return "Visible" if obj.is_published else "Hidden"

    def get_status_display(self, obj):
        return "Published" if obj.is_published else "Draft"


class PublishedExpenseSerializer(serializers.ModelSerializer):
    """Resident-facing read-only view — hides internal fields."""

    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model  = MaintenanceExpense
        fields = [
            "id", "title", "category", "category_display",
            "amount", "vendor_name", "proof_url", "expense_date",
        ]
        read_only_fields = fields
