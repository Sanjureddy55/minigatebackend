from rest_framework import serializers

from apps.society_admin.maintenance_expenses.models import MaintenanceExpense


class MaintenanceExpenseSerializer(serializers.ModelSerializer):
    category_display     = serializers.CharField(source="get_category_display",     read_only=True)
    payment_mode_display = serializers.CharField(source="get_payment_mode_display",  read_only=True)
    created_by_name      = serializers.CharField(source="created_by.full_name",     read_only=True)
    visibility_display   = serializers.SerializerMethodField()
    status_display       = serializers.SerializerMethodField()
    has_proof            = serializers.SerializerMethodField()

    class Meta:
        model  = MaintenanceExpense
        fields = [
            "id",
            "title", "category", "category_display",
            "amount", "vendor_name",
            "payment_mode", "payment_mode_display",
            "invoice_number", "building_area",
            "proof_url", "has_proof",
            "expense_date", "is_published",
            "visibility_display", "status_display",
            "notes",
            "created_by", "created_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by"]

    def get_visibility_display(self, obj):
        return "Visible" if obj.is_published else "Hidden"

    def get_status_display(self, obj):
        return "Published" if obj.is_published else "Draft"

    def get_has_proof(self, obj):
        return bool(obj.proof_url and obj.proof_url.strip())


class ExpenseSummarySerializer(serializers.Serializer):
    total_expenses   = serializers.IntegerField()
    total_published  = serializers.IntegerField()
    total_draft      = serializers.IntegerField()
    amount_total     = serializers.FloatField()
    amount_published = serializers.FloatField()
    by_category      = serializers.ListField(child=serializers.DictField())
