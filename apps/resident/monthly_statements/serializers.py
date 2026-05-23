from rest_framework import serializers

from apps.society_admin.monthly_statements.models import MonthlyStatement, StatementProofDocument


class ResidentProofDocSerializer(serializers.ModelSerializer):
    file_url = serializers.CharField(read_only=True)

    class Meta:
        model  = StatementProofDocument
        fields = ["id", "original_name", "file_url", "file_size", "uploaded_at"]
        read_only_fields = fields


class ResidentStatementSerializer(serializers.ModelSerializer):
    """
    Read-only view of a published MonthlyStatement for residents.
    Exposes financials + proof documents so residents can verify fund usage.
    """
    month_label     = serializers.CharField(read_only=True)
    title           = serializers.CharField(read_only=True)
    society_name    = serializers.CharField(source="society.name", read_only=True)
    uploaded_proofs = ResidentProofDocSerializer(many=True, read_only=True)
    published_date  = serializers.SerializerMethodField()

    class Meta:
        model  = MonthlyStatement
        fields = [
            "id",
            "society_name",
            "month", "month_label", "title",
            "opening_balance",
            "total_collected",
            "total_expenses",
            "closing_balance",
            "proof_documents",   # list of proof_url strings from linked expenses
            "uploaded_proofs",   # uploaded PDF/image files
            "summary",
            "is_published",
            "published_date",
        ]
        read_only_fields = fields

    def get_published_date(self, obj):
        if obj.published_at:
            return obj.published_at.strftime("%Y-%m-%d")
        return None
