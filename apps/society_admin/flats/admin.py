from django.contrib import admin

from .models import Flat


@admin.register(Flat)
class FlatAdmin(admin.ModelAdmin):
    list_display  = ["flat_number", "building", "society_name", "created_at"]
    list_filter   = ["building__society", "building"]
    search_fields = ["flat_number", "building__name", "building__society__name"]
    ordering      = ["building__name", "flat_number"]

    def society_name(self, obj):
        return obj.building.society.name
    society_name.short_description = "Society"
