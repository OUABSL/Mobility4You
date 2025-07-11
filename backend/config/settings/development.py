# config/settings/development.py
"""
Configuración para desarrollo local
"""

from .base import *

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

# Database para desarrollo (MySQL/MariaDB)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": env("MYSQL_DATABASE", default="mobility4you"),
        "USER": env("MYSQL_USER", default="mobility"),
        "PASSWORD": env("MYSQL_PASSWORD", default="miclave"),
        "HOST": env("DB_HOST", default="db"),  # 'db' para Docker Compose
        "PORT": env("DB_PORT", default="3306"),
        "OPTIONS": {
            "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
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
            "format": "[{asctime}] {levelname:<8} | {name:<20} | {module:<15} | {funcName:<15} | Line {lineno:<4} | {message}",
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
            "encoding": "utf-8",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# Cache para desarrollo (en memoria)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "unique-snowflake",
    }
}

# CSRF configuración menos estricta para desarrollo
CSRF_COOKIE_SECURE = False
CSRF_COOKIE_SAMESITE = "Lax"
