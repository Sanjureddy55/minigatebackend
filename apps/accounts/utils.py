import logging
from datetime import timedelta

from django.utils import timezone

from .models import OTP_EXPIRY_MINUTES, OTPRecord

logger = logging.getLogger(__name__)

HARDCODED_OTP = "123456"


def send_otp(mobile: str) -> OTPRecord:
    # Expire any previous unverified OTP for this mobile
    OTPRecord.objects.filter(mobile=mobile, is_verified=False).update(
        expires_at=timezone.now()
    )
    record = OTPRecord.objects.create(
        mobile=mobile,
        otp_code=HARDCODED_OTP,
        expires_at=timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES),
    )
    logger.info("OTP_SENT | mobile=%s | otp=123456", mobile)
    return record


def verify_otp(mobile: str, otp_code: str) -> tuple[bool, str]:
    record = (
        OTPRecord.objects
        .filter(mobile=mobile, is_verified=False)
        .order_by("-created_at")
        .first()
    )
    if record is None:
        return False, "No OTP found for this mobile. Please send OTP first."
    if record.is_expired:
        return False, "OTP has expired. Please request a new one."
    if record.is_exhausted:
        return False, "Too many failed attempts. Please request a new OTP."
    if record.otp_code != otp_code:
        record.attempts += 1
        record.save(update_fields=["attempts"])
        remaining = max(0, 5 - record.attempts)
        logger.warning("OTP_FAIL | mobile=%s | attempts=%s", mobile, record.attempts)
        return False, f"Incorrect OTP. {remaining} attempt(s) remaining."

    record.is_verified = True
    record.save(update_fields=["is_verified"])
    logger.info("OTP_VERIFIED | mobile=%s", mobile)
    return True, "ok"
