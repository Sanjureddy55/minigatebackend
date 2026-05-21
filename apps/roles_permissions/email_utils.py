import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_welcome_email(*, email: str, full_name: str, password: str, role) -> None:
    """
    Send login credentials to a newly assigned user via Gmail SMTP.
    Falls back gracefully (logs error) if SMTP is not configured.
    """

    role_name = role.name if role else "Platform User"
    subject   = f"Welcome to MiniGate — Your {role_name} Account"
    body      = (
        f"Hello {full_name},\n\n"
        f"Your account has been created on MiniGate Society Management Platform.\n\n"
        f"Role     : {role_name}\n"
        f"Email    : {email}\n"
        f"Password : {password}\n\n"
        f"Please log in and change your password immediately.\n"
        f"Login URL: http://localhost:3000/login\n\n"
        f"For security, do not share these credentials.\n\n"
        f"— MiniGate Platform Team"
    )
    from_email = getattr(settings, "EMAIL_HOST_USER", None) or "noreply@minigate.in"

    try:
        send_mail(subject, body, from_email, [email], fail_silently=False)
        logger.info("WELCOME_EMAIL sent | to=%s role=%s", email, role_name)
    except Exception as exc:
        logger.error("WELCOME_EMAIL failed | to=%s | error=%s", email, exc)
