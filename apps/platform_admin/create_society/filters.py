import django_filters

from .models import Society


class SocietyFilter(django_filters.FilterSet):
    """
    Declarative filter set for the Society model.

    DjangoFilterBackend reads this class and maps incoming query parameters
    to queryset filters automatically — no manual if-param-then-filter blocks.

    Supported query parameters:
        ?status=active          exact match on status field
        ?plan=pro               exact match on plan field
        ?city=mumbai            case-insensitive contains on city
        ?name=sunrise           case-insensitive contains on name
        ?search=<term>          combined name + city search (SearchFilter handles this)
        ?ordering=name          order results (OrderingFilter handles this)
        ?created_after=2026-01-01   societies created on or after this date
        ?created_before=2026-12-31  societies created on or before this date
    """

    # Exact-match filters — values must be valid TextChoices values
    status = django_filters.ChoiceFilter(choices=Society.Status.choices)
    plan = django_filters.ChoiceFilter(choices=Society.Plan.choices)

    # Case-insensitive partial-match filters
    city = django_filters.CharFilter(lookup_expr="icontains")
    name = django_filters.CharFilter(lookup_expr="icontains")

    # Date-range filters on the auto timestamp
    created_after = django_filters.DateFilter(
        field_name="created_at",
        lookup_expr="date__gte",
        label="Created on or after (YYYY-MM-DD)",
    )
    created_before = django_filters.DateFilter(
        field_name="created_at",
        lookup_expr="date__lte",
        label="Created on or before (YYYY-MM-DD)",
    )

    class Meta:
        model = Society
        # Only declare fields here that don't need a custom lookup_expr.
        # Fields above with custom lookups are already handled by explicit declarations.
        fields = ["status", "plan", "city", "name"]

    @property
    def qs(self):
        # Always call select_related so the FK join is not repeated per-row.
        return super().qs.select_related("society_admin")
