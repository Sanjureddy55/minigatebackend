from django.contrib import admin

from .models import DailyHelp, FamilyMember, Pet, ResidentFlat, Vehicle


@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display  = ["name", "relation", "phone", "flat", "resident"]
    list_filter   = ["relation"]
    search_fields = ["name", "phone"]


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display  = ["plate_number", "vehicle_name", "vehicle_type", "status", "flat"]
    list_filter   = ["vehicle_type", "status"]
    search_fields = ["plate_number", "vehicle_name", "parking_slot"]


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    list_display  = ["name", "calling_name", "pet_type", "gender", "flat"]
    list_filter   = ["pet_type", "gender"]
    search_fields = ["name", "calling_name"]


@admin.register(DailyHelp)
class DailyHelpAdmin(admin.ModelAdmin):
    list_display  = ["name", "help_type", "status", "monthly_salary", "flat"]
    list_filter   = ["help_type", "status"]
    search_fields = ["name", "upi_id"]


@admin.register(ResidentFlat)
class ResidentFlatAdmin(admin.ModelAdmin):
    list_display  = ["profile", "flat", "society", "is_primary", "status", "created_at"]
    list_filter   = ["status", "is_primary"]
    search_fields = ["profile__full_name", "flat__flat_number", "society__name"]
    readonly_fields = ["created_at", "updated_at"]
