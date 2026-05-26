from django.db import models

# No own models.
# Reads from:
#   - GuestPass  (apps.resident.visitors)    — pre-approved by resident before arrival
#   - Visitor    (apps.society_admin.visitors) — real-time approvals today
