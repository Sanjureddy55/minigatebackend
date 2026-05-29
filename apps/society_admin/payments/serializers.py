from decimal import Decimal

from rest_framework import serializers


class PaymentOverviewItemSerializer(serializers.Serializer):
    """One row in the Payments Overview table: FLAT | RESIDENT | AMOUNT | DUE DATE | STATUS."""
    due_id         = serializers.IntegerField()
    flat_number    = serializers.CharField()
    building       = serializers.CharField()
    resident       = serializers.CharField()
    amount         = serializers.DecimalField(max_digits=10, decimal_places=2)
    due_date       = serializers.DateField()
    month          = serializers.DateField()
    status         = serializers.CharField()
    status_display = serializers.CharField()


class PaymentOverviewSerializer(serializers.Serializer):
    """4 stat cards + dues table."""
    collected_this_month = serializers.DecimalField(max_digits=14, decimal_places=2)
    outstanding          = serializers.DecimalField(max_digits=14, decimal_places=2)
    defaulters           = serializers.IntegerField()
    avg_collection_pct   = serializers.FloatField()
    dues                 = PaymentOverviewItemSerializer(many=True)
    month                = serializers.CharField()


class GenerateDuesSerializer(serializers.Serializer):
    """
    POST /api/society-admin/payments/generate/

    Generates a MaintenanceDue for every occupied flat in the society.

    Fields (all matching the 'Generate' form):
      month    — billing month  e.g. "2026-05"
      amount   — amount per flat (₹)
      due_date — payment deadline  e.g. "2026-05-10"
      description — optional label e.g. "May 2026 Maintenance"
    """
    month       = serializers.CharField(
        max_length=7,
        help_text="Billing month in YYYY-MM format e.g. '2026-05'",
    )
    amount      = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("1"),
        help_text="Amount per flat in ₹",
    )
    due_date    = serializers.DateField(
        help_text="Payment deadline e.g. '2026-05-10'",
    )
    description = serializers.CharField(
        max_length=255, required=False, allow_blank=True, default="",
        help_text="Optional label e.g. 'May 2026 Maintenance'",
    )

    def validate_month(self, value):
        try:
            parts = value.strip().split("-")
            if len(parts) != 2:
                raise ValueError
            year, month = int(parts[0]), int(parts[1])
            if not (1 <= month <= 12 and 2000 <= year <= 2100):
                raise ValueError
            return value.strip()
        except (ValueError, AttributeError):
            raise serializers.ValidationError("month must be YYYY-MM e.g. '2026-05'.")


class UpdateDueStatusSerializer(serializers.Serializer):
    """Body for approve (paid) / reject (overdue) a single due."""
    status = serializers.ChoiceField(choices=["paid", "pending", "overdue"])
    notes  = serializers.CharField(required=False, allow_blank=True, default="")
