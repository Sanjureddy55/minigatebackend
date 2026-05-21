"""
Development settings — extends base.py.

Activates verbose logging, Django Debug Toolbar, and relaxed security.
All secrets come from the .env file at project root.

    python manage.py runserver --settings=config.settings.development
"""

from .base import *  # noqa: F401, F403
from .base import env  # noqa: F401 — re-export so env() is available below

# =============================================================================
# CORE OVERRIDES
# =============================================================================
DEBUG = True
ALLOWED_HOSTS = ["*"]   # Accept any host — local dev only, never production

# =============================================================================
# DJANGO DEBUG TOOLBAR
#
# Install: pip install django-debug-toolbar
#
# DebugToolbarMiddleware is inserted at index 1 (right after SecurityMiddleware)
# so it intercepts responses before any encoding or compression middleware.
# Appending with += would place it last, breaking toolbar injection on
# HTML pages such as the Django admin.
# =============================================================================
INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405
MIDDLEWARE.insert(1, "debug_toolbar.middleware.DebugToolbarMiddleware")  # noqa: F405

# IPs from which the toolbar is rendered.
# If running inside Docker, add the bridge IP (e.g. "172.17.0.1").
INTERNAL_IPS = ["127.0.0.1"]

DEBUG_TOOLBAR_CONFIG = {
    # Always show the toolbar when DEBUG=True, regardless of INTERNAL_IPS.
    # Swap for the default check in staging/shared dev environments.
    "SHOW_TOOLBAR_CALLBACK": lambda _: DEBUG,  # noqa: F405

    # Panels to display (defaults are shown; comment out any you don't need)
    "DISABLE_PANELS": {
        "debug_toolbar.panels.redirects.RedirectsPanel",
    },
}

# =============================================================================
# EMAIL
# Print all outgoing email to the console instead of actually sending it.
# =============================================================================
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# =============================================================================
# LOGGING — Development overrides
#
# Differences from base.py:
#   • apps.*  → DEBUG (show every log line from project code)
#   • django  → INFO  (show request logs, not just warnings)
#   • console uses "simple" formatter — compact, no timestamps for readability
#
# Set DB_LOG_LEVEL=DEBUG in .env to print every SQL query to the console.
# =============================================================================
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {
            "format": "{levelname:<8} {name} — {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
    "loggers": {
        # Full DEBUG visibility for all project app code
        "apps": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
        # INFO shows incoming requests (200/404/500 lines) in the dev console
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        # SQL query log — activate with DB_LOG_LEVEL=DEBUG in .env
        "django.db.backends": {
            "handlers": ["console"],
            "level": env("DB_LOG_LEVEL", default="WARNING"),
            "propagate": False,
        },
    },
}
