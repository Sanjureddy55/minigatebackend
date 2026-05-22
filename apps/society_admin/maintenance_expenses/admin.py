from django.contrib import admin

from .models import MaintenanceExpense


@admin.register(MaintenanceExpense)
class MaintenanceExpenseAdmin(admin.ModelAdmin):
    list_display  = ["title", "category", "amount", "vendor_name", "expense_date", "is_published", "society"]
    list_filter   = ["category", "is_published", "expense_date"]
    search_fields = ["title", "vendor_name", "notes"]
    actions       = ["publish_selected", "unpublish_selected"]

    @admin.action(description="Publish selected expenses to residents")
    def publish_selected(self, request, queryset):
        queryset.update(is_published=True)

    @admin.action(description="Unpublish selected expenses")
    def unpublish_selected(self, request, queryset):
        queryset.update(is_published=False)
