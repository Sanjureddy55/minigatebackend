import logging
import uuid

from django.db import models

logger = logging.getLogger(__name__)


class Flat(models.Model):
    """A single dwelling unit inside a Building."""

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    flat_number = models.CharField(max_length=20)
    building    = models.ForeignKey(
        "society_admin_buildings.Building",
        on_delete=models.CASCADE,
        related_name="flats",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label       = "society_admin_flats"
        unique_together = [("building", "flat_number")]
        ordering        = ["building__name", "flat_number"]
        indexes         = [models.Index(fields=["building"], name="flat_building_idx")]

    def __str__(self) -> str:
        return f"{self.flat_number} ({self.building.name})"
