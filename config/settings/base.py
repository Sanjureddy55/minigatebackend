"""
Base Django settings for MiniGate — Society Management Platform.

Shared across all environments. Do NOT add secrets or environment-specific
values here; those belong in development.py / production.py or the .env file.

Usage:
    DJANGO_SETTINGS_MODULE=config.settings.development   ← local
    DJANGO_SETTINGS_MODULE=config.settings.production    ← server
"""

import os
from pathlib import Path

import environ

# =============================================================================
# PATHS
# =============================================================================
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# =============================================================================
# ENVIRONMENT
# Reads values from .env at project root.  Every env.() call below is
# type-cast and has a safe default so the project starts without a .env file.
# =============================================================================
env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    CORS_ALLOWED_ORIGINS=(list, []),
)
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

# =============================================================================
# SECURITY
# =============================================================================
# Never commit a real SECRET_KEY.  Generate one with:
#   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
SECRET_KEY = env("SECRET_KEY", default="django-insecure-change-me-before-first-run")

DEBUG = env("DEBUG")

ALLOWED_HOSTS = env("ALLOWED_HOSTS")

# =============================================================================
# INSTALLED APPS
# Grouped into three layers so adding/removing an app is unambiguous.
# =============================================================================

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",      # Django REST Framework — core API layer
    "django_filters",      # Querystring filtering (?status=active, ?plan=pro)
    "corsheaders",         # Cross-Origin Resource Sharing headers
]

# Cross-cutting shared apps (no role-specific business logic)
LOCAL_FLAT_APPS = [
    "apps.accounts",            # OTP onboarding, login, Country/City lookup
    "apps.roles_permissions",   # RBAC: role & permission registry
    "apps.notifications",       # Platform-wide notification engine
    "apps.common",              # Shared base models, mixins, utilities
]

# One Django app per feature per role — each is fully self-contained
LOCAL_ROLE_APPS = [
    # ── Platform Admin (Super Admin) ──────────────────────────────────────
    "apps.platform_admin.dashboard",
    "apps.platform_admin.society_management",
    "apps.platform_admin.create_society",
    "apps.platform_admin.society_admins",
    "apps.platform_admin.subscription_plans",
    "apps.platform_admin.global_users",
    "apps.platform_admin.global_reports",
    "apps.platform_admin.audit_logs",
    "apps.platform_admin.system_settings",
    # ── Society Admin ─────────────────────────────────────────────────────
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
    "apps.society_admin.residents",
    "apps.society_admin.visitors",
    "apps.society_admin.approvals",
    "apps.society_admin.security",
    "apps.society_admin.audit_logs",
    "apps.society_admin.staff_accounts",
    # ── Resident ──────────────────────────────────────────────────────────
    "apps.resident.dashboard",
    "apps.resident.complaints",
    "apps.resident.payments",
    "apps.resident.notices",
    "apps.resident.visitors",
    "apps.resident.profile",
    "apps.resident.sos",
    "apps.resident.maintenance_transparency",
    "apps.resident.monthly_statements",
    # ── Security Guard ────────────────────────────────────────────────────
    "apps.security_guard.dashboard",
    "apps.security_guard.gate_entry",
    "apps.security_guard.visitor_log",
    "apps.security_guard.vehicle_tracking",
    "apps.security_guard.emergency_alerts",
    "apps.security_guard.shift_management",
    "apps.security_guard.visitor_entry",
    "apps.security_guard.qr_passcode",
    "apps.security_guard.delivery_verify",
    "apps.security_guard.approved_visitors",
    "apps.security_guard.contact_resident",
    # ── Accountant ────────────────────────────────────────────────────────
    # ── Accountant: BILLING ────────────────────────────────────────────────────
    "apps.accountant.dashboard",
    "apps.accountant.payment_collection",
    "apps.accountant.track_payments",
    # ── Accountant: MAINTENANCE FUNDS ──────────────────────────────────────────
    "apps.accountant.fund_dashboard",
    "apps.accountant.maintenance_expenses",
    "apps.accountant.monthly_statements",
    # ── Accountant: REPORTS ────────────────────────────────────────────────────
    "apps.accountant.generate_receipts",
    "apps.accountant.payment_reports",
    "apps.accountant.export_reports",
    # ── Maintenance Staff ─────────────────────────────────────────────────
    "apps.maintenance_staff.dashboard",
    "apps.maintenance_staff.assigned_tasks",
    "apps.maintenance_staff.task_updates",
    "apps.maintenance_staff.work_history",
    "apps.maintenance_staff.materials_request",
    "apps.maintenance_staff.schedule",
    # ── Support Staff ─────────────────────────────────────────────────────
    "apps.support_staff.dashboard",
    "apps.support_staff.assigned_tickets",
    "apps.support_staff.ticket_updates",
    "apps.support_staff.escalations",
    "apps.support_staff.service_history",
    # ── Delivery Partner ──────────────────────────────────────────────────
    "apps.delivery_partner.dashboard",
    "apps.delivery_partner.delivery_requests",
    "apps.delivery_partner.otp_verification",
    "apps.delivery_partner.delivery_history",
    "apps.delivery_partner.profile",
    # ── Guest User ────────────────────────────────────────────────────────
    "apps.guest_user.dashboard",
    "apps.guest_user.visit_request",
    "apps.guest_user.host_information",
    "apps.guest_user.access_pass",
    "apps.guest_user.profile",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_FLAT_APPS + LOCAL_ROLE_APPS

# =============================================================================
# MIDDLEWARE
# Order matters:
#   1. SecurityMiddleware first (always).
#   2. CorsMiddleware before CommonMiddleware (must see the Origin header first).
#   3. SessionMiddleware before AuthenticationMiddleware.
# =============================================================================
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",         # HTTPS redirects, headers
    "corsheaders.middleware.CorsMiddleware",                 # CORS — must precede CommonMiddleware
    "django.contrib.sessions.middleware.SessionMiddleware",  # Session cookie management
    "django.middleware.common.CommonMiddleware",             # URL normalisation (trailing slash)
    "django.middleware.csrf.CsrfViewMiddleware",            # CSRF token enforcement
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

# =============================================================================
# TEMPLATES
# APP_DIRS=True: Django searches for templates/ inside every installed app.
# =============================================================================
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],   # Project-level templates override app templates
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",  # Required by DRF browsable API
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# =============================================================================
# DATABASE — PostgreSQL
#
# CONN_MAX_AGE: Keep the DB connection alive for N seconds per worker thread.
#   60 s is a safe default for gunicorn/uvicorn workers.
#   Set to 0 to disable persistent connections (useful with PgBouncer).
#
# ATOMIC_REQUESTS: Wrap every HTTP request in a DB transaction.
#   Any unhandled exception triggers a full rollback, preventing partial writes.
#   Disable per-view with @transaction.non_atomic_requests if needed.
#
# OPTIONS / options: Passes server-side PostgreSQL parameters at connection time.
#   statement_timeout=30000 ms aborts any single query that runs over 30 seconds,
#   protecting the DB from runaway queries in production.
# =============================================================================
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB", default="minigatedb"),
        "USER": env("POSTGRES_USER", default="postgres"),
        "PASSWORD": env("POSTGRES_PASSWORD", default=""),
        "HOST": env("POSTGRES_HOST", default="localhost"),
        "PORT": env("POSTGRES_PORT", default="5432"),
        "CONN_MAX_AGE": env.int("POSTGRES_CONN_MAX_AGE", default=60),
        "ATOMIC_REQUESTS": True,
        "OPTIONS": {
            # Set a 30-second server-side query timeout (psycopg2 / psycopg3)
            "options": "-c statement_timeout=30000",
        },
    }
}

# =============================================================================
# PASSWORD VALIDATION
# min_length is explicitly set to 8 (Django default is also 8; explicit is better).
# =============================================================================
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# =============================================================================
# INTERNATIONALISATION
# =============================================================================
LANGUAGE_CODE = "en-us"

# All datetimes are stored as UTC in PostgreSQL.
# Convert to IST (Asia/Kolkata, UTC+5:30) in reports or the frontend layer.
TIME_ZONE = "UTC"

USE_I18N = True     # Activate Django's translation framework
USE_TZ = True       # Store all DateTimeField values as timezone-aware UTC

# =============================================================================
# STATIC FILES
# collectstatic gathers everything into STATIC_ROOT for WhiteNoise / nginx.
# =============================================================================
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# =============================================================================
# MEDIA FILES
# User-uploaded content: receipts, profile pictures, documents.
# In production, replace with S3/GCS and set DEFAULT_FILE_STORAGE accordingly.
# =============================================================================
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# =============================================================================
# MISCELLANEOUS
# =============================================================================
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# =============================================================================
# DJANGO REST FRAMEWORK
#
# Authentication classes are empty during the scaffolding phase — all endpoints
# are open (AllowAny) so the team can test APIs without tokens.
# To restore JWT auth, add to DEFAULT_AUTHENTICATION_CLASSES:
#   "rest_framework_simplejwt.authentication.JWTAuthentication"
# and change DEFAULT_PERMISSION_CLASSES to IsAuthenticated.
# =============================================================================
REST_FRAMEWORK = {
    # ── Authentication ─────────────────────────────────────────────────────
    # JWT is active: when a Bearer token is present it sets request.user.
    # Global permission is still AllowAny so unauthenticated endpoints work.
    # Individual views that require login set permission_classes = [IsAuthenticated].
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],

    # ── Permissions ────────────────────────────────────────────────────────
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],

    # ── Parsers — what request Content-Types are accepted ──────────────────
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",        # application/json
        "rest_framework.parsers.MultiPartParser",   # multipart/form-data (file uploads)
        "rest_framework.parsers.FormParser",        # application/x-www-form-urlencoded
    ],

    # ── Renderers — what response formats are produced ─────────────────────
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",    # JSON only — no browsable HTML API
    ],

    # ── Filtering — applied globally to all ListAPIView / ModelViewSet list actions
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",  # ?field=value exact match
        "rest_framework.filters.SearchFilter",                # ?search=term (icontains)
        "rest_framework.filters.OrderingFilter",              # ?ordering=field,-other
    ],

    # ── Pagination ─────────────────────────────────────────────────────────
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,    # Default page size; override per view with pagination_class

    # ── Exception handling ─────────────────────────────────────────────────
    "EXCEPTION_HANDLER": "rest_framework.views.exception_handler",

    # ── Throttling (disabled; enable once auth is wired up) ────────────────
    # "DEFAULT_THROTTLE_CLASSES": [
    #     "rest_framework.throttling.AnonRateThrottle",
    #     "rest_framework.throttling.UserRateThrottle",
    # ],
    # "DEFAULT_THROTTLE_RATES": {"anon": "100/day", "user": "1000/day"},
}

# =============================================================================
# SIMPLE JWT
# Access token is short-lived (1 day during dev; use 15 min in production).
# Refresh token is valid for 30 days and can issue new access tokens.
# =============================================================================
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":  timedelta(days=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS":  True,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_OBTAIN_SERIALIZER": "rest_framework_simplejwt.serializers.TokenObtainPairSerializer",
}

# =============================================================================
# CORS
# CORS_ALLOWED_ORIGINS is a comma-separated list in .env, e.g.:
#   CORS_ALLOWED_ORIGINS=http://localhost:3000,https://app.minigate.in
# =============================================================================
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True                   # Allow cookies / auth headers cross-origin
CORS_ALLOW_HEADERS = [                          # Headers the browser may send cross-origin
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# =============================================================================
# SESSION
# =============================================================================
SESSION_ENGINE = "django.contrib.sessions.backends.db"  # Sessions stored in PostgreSQL
SESSION_COOKIE_AGE = 86400 * 7         # 7 days in seconds
SESSION_COOKIE_HTTPONLY = True          # Prevent JavaScript access to session cookie
SESSION_SAVE_EVERY_REQUEST = False      # Only save session when modified (performance)

# =============================================================================
# LOGGING
#
# Two formatters are defined here:
#   verbose — full timestamp + level + logger name (used in production/files)
#   simple  — compact level + name (used in development console)
#
# Log levels per environment:
#   development.py  overrides "apps" → DEBUG, "django" → INFO
#   production.py   adds a rotating file handler for "apps" and an error file
#
# To trace SQL queries locally, set DB_LOG_LEVEL=DEBUG in your .env.
# =============================================================================
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,

    # ── Formatters ─────────────────────────────────────────────────────────
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname:<8} {name} | {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "simple": {
            "format": "{levelname:<8} {name} — {message}",
            "style": "{",
        },
    },

    # ── Filters ────────────────────────────────────────────────────────────
    "filters": {
        "require_debug_false": {"()": "django.utils.log.RequireDebugFalse"},
        "require_debug_true":  {"()": "django.utils.log.RequireDebugTrue"},
    },

    # ── Handlers ───────────────────────────────────────────────────────────
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },

    # ── Root logger — catch-all for anything not explicitly listed below ───
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },

    # ── Named loggers ──────────────────────────────────────────────────────
    "loggers": {
        # All project apps — apps.platform_admin.*, apps.society_admin.*, etc.
        # Set to INFO in base; development.py bumps it to DEBUG.
        "apps": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },

        # Django internals — WARNING suppresses routine request logs.
        # development.py bumps this to INFO for better local visibility.
        "django": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },

        # SQL query log — stays at WARNING unless DB_LOG_LEVEL=DEBUG is set.
        # WARNING: DEBUG level logs every query — use sparingly on busy DBs.
        "django.db.backends": {
            "handlers": ["console"],
            "level": env("DB_LOG_LEVEL", default="WARNING"),
            "propagate": False,
        },

        # Security events — always at WARNING or above.
        "django.security": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}
