"""
Lightweight helper — call log_action() from any view to record an audit event.

Usage:
    from apps.platform_admin.audit_logs.utils import log_action

    log_action(
        request=request,
        action="created society",
        action_type="create",
        target="Greenwood Heights",
        target_type="society",
        target_id=str(society.pk),
    )
"""
import logging

logger = logging.getLogger(__name__)


def log_action(
    *,
    request=None,
    actor=None,
    action: str,
    action_type: str = "system",
    target: str,
    target_type: str = "",
    target_id: str = "",
    metadata: dict | None = None,
):
    from .models import AuditLog  # local import avoids circular import at module load

    try:
        if request is not None and actor is None:
            actor = request.user if request.user.is_authenticated else None

        if actor is not None:
            actor_name = (
                getattr(actor, "get_full_name", lambda: "")()
                or getattr(actor, "username", "")
                or str(actor)
            )
            actor_role = "Super Admin" if getattr(actor, "is_superuser", False) else "Admin"
        else:
            actor_name = "System"
            actor_role = "System"

        AuditLog.objects.create(
            actor=actor,
            actor_role=actor_role,
            actor_name=actor_name,
            action=action,
            action_type=action_type,
            target=target,
            target_type=target_type,
            target_id=str(target_id),
            metadata=metadata or {},
        )
    except Exception:
        logger.exception("Failed to write audit log (action=%s, target=%s)", action, target)
