import logging
import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


class Building(models.Model):
    """A tower / block inside a Society. Flats hang off buildings."""

    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name    = models.CharField(max_length=100)
    society = models.ForeignKey(
        "platform_admin_create_society.Society",
        on_delete=models.CASCADE,
        related_name="buildings",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label      = "society_admin_buildings"
        unique_together = [("society", "name")]
        ordering        = ["name"]
        indexes         = [models.Index(fields=["society"], name="building_society_idx")]

    def __str__(self) -> str:
        return f"{self.name} — {self.society.name}"
