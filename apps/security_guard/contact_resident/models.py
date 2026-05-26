from django.db import models

# No own models.
# Reads from:
#   - ResidentFlat  (apps.resident.profile)   — links resident → flat → society
#   - UserProfile   (apps.roles_permissions)  — resident name + mobile
#   - Flat          (apps.society_admin.flats) — flat number + building
