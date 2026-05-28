from rest_framework import serializers

from .models import Vendor


class VendorSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display   = serializers.CharField(source="get_status_display",   read_only=True)
    society_name     = serializers.CharField(source="society.name",         read_only=True)

    class Meta:
        model  = Vendor
        fields = [
            "id", "society", "society_name",
            "name", "category", "category_display",
            "contact_name", "contact_phone", "contact_email",
            "status", "status_display",
            "contract_start", "contract_end", "monthly_cost",
            "notes", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "society", "created_at", "updated_at"]

    def validate_name(self, value):
        return value.strip()

    def validate_contact_phone(self, value):
        return value.strip().replace(" ", "").replace("-", "")


class VendorKPISerializer(serializers.Serializer):
    """Maps to the 3 stat cards: Total, Active, Pending Renewal."""
    total           = serializers.IntegerField()
    active          = serializers.IntegerField()
    pending_renewal = serializers.IntegerField()
    inactive        = serializers.IntegerField()
