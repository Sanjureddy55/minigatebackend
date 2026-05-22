"""
Society-scoped audit log helper.

Usage inside any society_admin view:
    from apps.society_admin.audit_logs.utils import log_society_action

    log_society_action(
        request=request,
        society_id=approval.society_id,
        action="approved",
        action_type="approve",
        target="Tenant onboarding B-101",
        target_type="approval",
        target_id=str(approval.pk),
    )
"""
import logging

logger = logging.getLogger(__name__)


def _actor_info(request, actor=None) -> dict:
    """Extract role · name from request user or explicit actor."""
    from apps.roles_permissions.models import UserProfile

    user = actor or (request.user if request else None)
    if not user or not getattr(user, "is_authenticated", False):
        return {"actor": None, "actor_role": "System", "actor_name": "System"}

    try:
        profile = UserProfile.objects.select_related("role").get(user=user)
        role_name = profile.role.name if profile.role_id else "User"
        full_name = profile.full_name or user.get_full_name() or user.username
    except UserProfile.DoesNotExist:
        role_name = "Admin" if user.is_superuser else "User"
        full_name = user.get_full_name() or user.username

    return {
        "actor":      user,
        "actor_role": role_name,
        "actor_name": full_name,
    }


def log_society_action(
    *,
    request=None,
    actor=None,
    society_id: int,
    action: str,
    action_type: str = "system",
    target: str,
    target_type: str = "",
    target_id: str = "",
    metadata: dict | None = None,
):
    from .models import SocietyAuditLog

    try:
        info = _actor_info(request, actor)
        SocietyAuditLog.objects.create(
            society_id  = society_id,
            actor       = info["actor"],
            actor_role  = info["actor_role"],
            actor_name  = info["actor_name"],
            action      = action,
            action_type = action_type,
            target      = target,
            target_type = target_type,
            target_id   = str(target_id),
            metadata    = metadata or {},
        )
    except Exception:
        logger.exception(
            "Failed to write society audit log (society=%s action=%s target=%s)",
            society_id, action, target,
        )
