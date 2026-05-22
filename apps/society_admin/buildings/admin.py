from django.contrib import admin

from .models import Building


@admin.register(Building)
class BuildingAdmin(admin.ModelAdmin):
    list_display  = ["name", "society", "flat_count", "created_at"]
    list_filter   = ["society"]
    search_fields = ["name", "society__name"]
    ordering      = ["society__name", "name"]

    def flat_count(self, obj):
        return obj.flats.count()
    flat_count.short_description = "Flats"
