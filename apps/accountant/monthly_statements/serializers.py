from rest_framework import serializers

from apps.society_admin.monthly_statements.models import MonthlyStatement, StatementProofDocument


class ProofDocSerializer(serializers.ModelSerializer):
    file_url = serializers.CharField(read_only=True)

    class Meta:
        model  = StatementProofDocument
        fields = ["id", "original_name", "file_size", "file_url", "uploaded_at"]
        read_only_fields = fields


class StatementSerializer(serializers.ModelSerializer):
    month_label     = serializers.CharField(read_only=True)
    title           = serializers.CharField(read_only=True)
    society_name    = serializers.CharField(source="society.name", read_only=True)
    uploaded_proofs = ProofDocSerializer(many=True, read_only=True)

    class Meta:
        model  = MonthlyStatement
        fields = [
            "id", "society_name", "month", "month_label", "title",
            "opening_balance", "total_collected", "total_expenses", "closing_balance",
            "proof_documents", "summary", "notes",
            "is_published", "published_at",
            "uploaded_proofs", "created_at", "updated_at",
        ]
        read_only_fields = fields
