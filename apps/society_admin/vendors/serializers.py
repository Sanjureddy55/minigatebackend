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
        read_only_fields = ["id", "created_at", "updated_at"]


class VendorKPISerializer(serializers.Serializer):
    total           = serializers.IntegerField()
    active          = serializers.IntegerField()
    pending_renewal = serializers.IntegerField()
    inactive        = serializers.IntegerField()
