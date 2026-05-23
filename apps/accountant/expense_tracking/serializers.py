from rest_framework import serializers

from apps.society_admin.maintenance_expenses.models import MaintenanceExpense


class ExpenseSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    created_by_name  = serializers.CharField(source="created_by.full_name", read_only=True, allow_null=True)

    class Meta:
        model  = MaintenanceExpense
        fields = [
            "id", "title", "category", "category_display",
            "amount", "vendor_name", "proof_url",
            "expense_date", "is_published",
            "created_by", "created_by_name", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]
