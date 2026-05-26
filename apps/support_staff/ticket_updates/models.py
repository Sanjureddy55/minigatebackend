from django.db import models


class TicketUpdate(models.Model):
    ticket      = models.ForeignKey(
        "support_staff_assigned_tickets.SupportTicket",
        on_delete=models.CASCADE,
        related_name="updates",
    )
    update_note = models.TextField()
    status      = models.CharField(max_length=20, blank=True, default="")
    updated_by  = models.ForeignKey(
        "roles_permissions.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="ticket_updates_made",
    )
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "support_staff_ticket_updates"
        ordering  = ["-created_at"]

    def __str__(self):
        return f"Update for {self.ticket_id} @ {self.created_at:%Y-%m-%d %H:%M}"
