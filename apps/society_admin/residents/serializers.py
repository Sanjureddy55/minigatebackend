from rest_framework import serializers

from apps.roles_permissions.models import UserProfile


class ResidentListSerializer(serializers.ModelSerializer):
    """
    Society Admin view of a resident's profile.
    Includes status, flat, society, and role.
    """

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    role_name      = serializers.CharField(source="role.name",    read_only=True, allow_null=True)
    society_name   = serializers.CharField(source="society.name", read_only=True, allow_null=True)
    email          = serializers.CharField(source="user.email",   read_only=True, allow_null=True)
    joined_at      = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model  = UserProfile
        fields = [
            "id", "full_name", "mobile", "email",
            "status", "status_display",
            "role", "role_name", "society", "society_name",
            "flat_number", "description", "joined_at",
        ]
        read_only_fields = fields


class ResidentApproveSerializer(serializers.Serializer):
    """Body for approve action — optional flat assignment."""
    flat_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    role        = serializers.PrimaryKeyRelatedField(
        queryset=__import__("apps.roles_permissions.models", fromlist=["Role"]).Role.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )


class ResidentRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
