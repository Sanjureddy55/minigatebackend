from rest_framework import serializers


class ExportJobSerializer(serializers.Serializer):
    """Response envelope for export requests that return a file download."""
    report_type = serializers.CharField()
    filters     = serializers.DictField()
    row_count   = serializers.IntegerField()
    filename    = serializers.CharField()
