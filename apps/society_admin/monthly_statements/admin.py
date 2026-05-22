from django.contrib import admin

from .models import MonthlyStatement


@admin.register(MonthlyStatement)
class MonthlyStatementAdmin(admin.ModelAdmin):
    list_display    = ["society", "month_label", "total_collected", "total_expenses", "closing_balance", "is_published"]
    list_filter     = ["is_published", "society"]
    search_fields   = ["society__name"]
    readonly_fields = ["closing_balance", "summary", "proof_documents", "published_at", "created_at", "updated_at"]
