from django.db import models

# Resident notices app has no models of its own.
# It provides resident-scoped read-only views of society_admin_notice_board.Notice
# and allows fundraiser contributions via resident_payments.ResidentPayment.
