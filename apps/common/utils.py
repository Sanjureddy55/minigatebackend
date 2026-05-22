"""
apps/common/utils.py
Shared helper utilities used across multiple apps.
"""


def get_society_id(request):
    """
    Resolve the society ID for the current authenticated request.

    Resolution order:
      1. ?society=<id> query param (allows super admin to view any society)
      2. request.user.profile.society_id (auto-detects for society/resident users)
      3. None — caller decides whether to reject or allow
    """
    society_id = request.query_params.get("society")
    if not society_id:
        try:
            society_id = request.user.profile.society_id
        except Exception:
            pass
    return society_id


def get_flat_id(request):
    """
    Resolve the flat UUID for the current authenticated resident.

    Resolution order:
      1. ?flat=<uuid> query param
      2. Primary ResidentFlat link for this profile (flat-switcher feature)
      3. Looks up via profile.flat_number + profile.society (legacy fallback)
      4. None — caller decides whether to reject or allow
    """
    flat_id = request.query_params.get("flat")
    if flat_id:
        return flat_id
    try:
        profile = request.user.profile

        # Check primary flat from the flat-switcher table first
        from apps.resident.profile.models import ResidentFlat
        primary = (
            ResidentFlat.objects
            .filter(profile=profile, is_primary=True, status=ResidentFlat.Status.ACTIVE)
            .select_related("flat")
            .first()
        )
        if primary:
            return str(primary.flat_id)

        # Legacy fallback: flat_number stored on UserProfile
        flat_number = profile.flat_number
        society_id  = profile.society_id
        if flat_number:
            from apps.society_admin.flats.models import Flat
            qs = Flat.objects.filter(flat_number=flat_number)
            if society_id:
                qs = qs.filter(building__society_id=society_id)
            flat = qs.first()
            if flat:
                return str(flat.pk)
    except Exception:
        pass
    return None
