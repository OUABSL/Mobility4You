# config/settings/development_render.py
"""
Configuración para desarrollo local compatible con Render PostgreSQL
Esta configuración usa los mismos nombres de base de datos y usuario que Render
"""

from .base import *

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

# Database para desarrollo - PostgreSQL 16 compatible con Render
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB", default="mobility4you_db"),  # Mismo nombre que Render
        "USER": env("POSTGRES_USER", default="mobility4you_db_user"),  # Mismo usuario que Render
        "PASSWORD": env("POSTGRES_PASSWORD", default="superseguro_postgres_render"),
        "HOST": env("POSTGRES_HOST", default="postgres"),  # 'postgres' para Docker Compose
        "PORT": env("POSTGRES_PORT", default="5432"),
        "OPTIONS": {
            "sslmode": "prefer",
        },
    }
}

# Archivos estáticos para desarrollo
STATIC_URL = "/django-static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

# Media files para desarrollo
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "staticfiles", "media")

# Email backend para desarrollo
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# CORS configuración desarrollo
CORS_ALLOWED_ORIGINS.extend([
    "http://localhost:80",
    "http://127.0.0.1:80",
])

CSRF_TRUSTED_ORIGINS.extend([
    "http://localhost:80",
    "http://127.0.0.1:80",
])

# Configuración de logging para desarrollo
LOGS_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "detailed": {
            "format": "{levelname:<8} | {asctime} | {name:<20} | {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "console": {
            "format": "{levelname:<8} | {name:<20} | {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "console",
        },
        "file": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": os.path.join(LOGS_DIR, "django.log"),
            "maxBytes": 10 * 1024 * 1024,  # 10MB
            "backupCount": 5,
            "formatter": "detailed",
        },
    },
    "root": {
        "level": "INFO",
        "handlers": ["console", "file"],
    },
    "loggers": {
        "django": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
        "django.db.backends": {
            "handlers": ["console"],
            "level": "WARNING",  # Solo errores de DB en desarrollo
            "propagate": False,
        },
        "usuarios": {
            "handlers": ["console", "file"],
            "level": "DEBUG",
            "propagate": False,
        },
        "vehiculos": {
            "handlers": ["console", "file"],
            "level": "DEBUG",
            "propagate": False,
        },
        "reservas": {
            "handlers": ["console", "file"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}
