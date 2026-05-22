from django.contrib import admin

from .models import SubscriptionPlan


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display  = ["name", "slug", "monthly_price", "annual_price", "status", "is_popular", "sort_order"]
    list_filter   = ["status", "is_popular"]
    search_fields = ["name", "slug"]
    ordering      = ["sort_order", "monthly_price"]
