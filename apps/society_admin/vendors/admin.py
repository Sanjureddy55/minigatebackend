from django.contrib import admin

from .models import Vendor


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display   = ("name", "society", "category", "contact_phone", "status", "contract_end")
    list_filter    = ("category", "status", "society")
    search_fields  = ("name", "contact_name", "contact_phone", "contact_email")
    readonly_fields = ("created_at", "updated_at")
