from django.contrib import admin

from .models import City, Country, OTPRecord


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display  = ["name", "code", "phone_code", "is_active"]
    search_fields = ["name", "code"]
    list_filter   = ["is_active"]


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display  = ["name", "state", "country", "is_active"]
    search_fields = ["name", "state"]
    list_filter   = ["is_active", "country"]
    autocomplete_fields = ["country"]


@admin.register(OTPRecord)
class OTPRecordAdmin(admin.ModelAdmin):
    list_display   = ["mobile", "otp_code", "is_verified", "attempts", "expires_at", "created_at"]
    list_filter    = ["is_verified"]
    search_fields  = ["mobile"]
    readonly_fields = ["mobile", "otp_code", "is_verified", "attempts", "expires_at", "created_at"]
