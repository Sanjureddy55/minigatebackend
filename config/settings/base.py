"""
Base Django settings for society_platform project.
Environment-specific overrides live in development.py and production.py.
"""
import os
from pathlib import Path

import environ

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------
SECRET_KEY = env("SECRET_KEY", default="django-insecure-change-me-in-production")
DEBUG = env("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
]

# Shared / core apps
LOCAL_FLAT_APPS = [
    "apps.accounts",
    "apps.roles_permissions",
    "apps.notifications",
    "apps.common",
]

# Role-based feature sub-apps (each is an independent Django app)
LOCAL_ROLE_APPS = [
    # ── Super Admin ────────────────────────────────────────────
    "apps.platform_admin.dashboard",
    "apps.platform_admin.society_management",
    "apps.platform_admin.create_society",
    "apps.platform_admin.society_admins",
    "apps.platform_admin.subscription_plans",
    "apps.platform_admin.global_users",
    "apps.platform_admin.global_reports",
    "apps.platform_admin.audit_logs",
    "apps.platform_admin.system_settings",
    # ── Society Admin ──────────────────────────────────────────
    "apps.society_admin.dashboard",
    "apps.society_admin.buildings",
    "apps.society_admin.flats",
    "apps.society_admin.staff_guards",
    "apps.society_admin.vendors",
    "apps.society_admin.notice_board",
    "apps.society_admin.complaints",
    "apps.society_admin.payments",
    "apps.society_admin.fund_dashboard",
    "apps.society_admin.maintenance_expenses",
    "apps.society_admin.monthly_statements",
    "apps.society_admin.analytics",
    "apps.society_admin.roles_access",
    "apps.society_admin.notifications",
    "apps.society_admin.settings",
    "apps.society_admin.residents",        # Resident management
    "apps.society_admin.visitors",         # Visitor management
    "apps.society_admin.approvals",        # Approval workflows
    "apps.society_admin.security",         # Security oversight
    "apps.society_admin.audit_logs",       # Audit trail & logs
    # ── Resident ──────────────────────────────────────────────
    "apps.resident.dashboard",
    "apps.resident.complaints",
    "apps.resident.payments",
    "apps.resident.notices",
    "apps.resident.visitors",
    "apps.resident.profile",
    # ── Security Guard ────────────────────────────────────────
    "apps.security_guard.dashboard",
    "apps.security_guard.gate_entry",
    "apps.security_guard.visitor_log",
    "apps.security_guard.vehicle_tracking",
    "apps.security_guard.emergency_alerts",
    "apps.security_guard.shift_management",
    # ── Accountant ────────────────────────────────────────────
    "apps.accountant.dashboard",
    "apps.accountant.payment_collection",
    "apps.accountant.expense_tracking",
    "apps.accountant.invoices",
    "apps.accountant.financial_reports",
    "apps.accountant.monthly_statements",
    # ── Maintenance Staff ─────────────────────────────────────
    "apps.maintenance_staff.dashboard",
    "apps.maintenance_staff.assigned_tasks",
    "apps.maintenance_staff.task_updates",
    "apps.maintenance_staff.work_history",
    "apps.maintenance_staff.materials_request",
    "apps.maintenance_staff.schedule",
    # ── Support Staff ─────────────────────────────────────────
    "apps.support_staff.dashboard",
    "apps.support_staff.assigned_tickets",
    "apps.support_staff.ticket_updates",
    "apps.support_staff.escalations",
    "apps.support_staff.service_history",
    # ── Delivery Partner ──────────────────────────────────────
    "apps.delivery_partner.dashboard",
    "apps.delivery_partner.delivery_requests",
    "apps.delivery_partner.otp_verification",
    "apps.delivery_partner.delivery_history",
    "apps.delivery_partner.profile",
    # ── Guest User ────────────────────────────────────────────
    "apps.guest_user.dashboard",
    "apps.guest_user.visit_request",
    "apps.guest_user.host_information",
    "apps.guest_user.access_pass",
    "apps.guest_user.profile",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_FLAT_APPS + LOCAL_ROLE_APPS

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": env("DB_ENGINE", default="django.db.backends.sqlite3"),
        "NAME": env("DB_NAME", default=str(BASE_DIR / "db.sqlite3")),
        "USER": env("DB_USER", default=""),
        "PASSWORD": env("DB_PASSWORD", default=""),
        "HOST": env("DB_HOST", default=""),
        "PORT": env("DB_PORT", default=""),
    }
}

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Internationalisation
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static & media
# ---------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

# ---------------------------------------------------------------------------
# Simple JWT
# ---------------------------------------------------------------------------
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("ACCESS_TOKEN_LIFETIME_MINUTES", default=60)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("REFRESH_TOKEN_LIFETIME_DAYS", default=7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True
