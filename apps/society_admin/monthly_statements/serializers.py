from rest_framework import serializers

from .models import MonthlyStatement, StatementProofDocument


class ProofDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.CharField(read_only=True)

    class Meta:
        model  = StatementProofDocument
        fields = ["id", "original_name", "file_url", "file_size", "uploaded_at"]
        read_only_fields = fields


class MonthlyStatementSerializer(serializers.ModelSerializer):
    title          = serializers.CharField(read_only=True)
    month_label    = serializers.CharField(read_only=True)
    society_name   = serializers.CharField(source="society.name", read_only=True)
    published_date = serializers.SerializerMethodField()
    uploaded_proofs = ProofDocumentSerializer(many=True, read_only=True)

    class Meta:
        model  = MonthlyStatement
        fields = [
            "id",
            "society", "society_name",
            "month", "month_label", "title",
            "opening_balance",
            "total_collected",
            "total_expenses",
            "closing_balance",
            "proof_documents",   # auto-collected from expense proof_urls
            "uploaded_proofs",   # manually uploaded PDF files
            "summary",
            "notes",
            "is_published",
            "published_at",
            "published_date",
            "generated_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "closing_balance", "summary", "proof_documents",
            "published_at", "created_at", "updated_at",
        ]

    def get_published_date(self, obj) -> str | None:
        if obj.published_at:
            return obj.published_at.strftime("%Y-%m-%d")
        return None


class GenerateStatementSerializer(serializers.Serializer):
    """
    POST /generate/ — compute financials for a month and save as draft.

    Society is auto-injected from the logged-in admin (not required in body).
    opening_balance defaults to previous month's closing balance (auto).
    total_collected / total_expenses can be overridden if needed.
    """
    year             = serializers.IntegerField(min_value=2020, max_value=2100)
    month            = serializers.IntegerField(min_value=1, max_value=12)
    opening_balance  = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, allow_null=True,
        help_text="Leave blank to auto-fetch from previous month."
    )
    total_collected  = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, allow_null=True,
        help_text="Leave blank to compute from paid MaintenanceDues."
    )
    total_expenses   = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, allow_null=True,
        help_text="Leave blank to compute from MaintenanceExpenses."
    )
    notes            = serializers.CharField(required=False, allow_blank=True, default="")
