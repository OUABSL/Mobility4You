# config/settings/development.py
"""
Configuración para desarrollo local
"""

import os

from .base import *

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

# Database para desarrollo - PostgreSQL (migrado desde MySQL)
# Para usar PostgreSQL local, instalar: brew install postgresql (macOS) o sudo apt-get install postgresql (Ubuntu)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB") or os.environ.get("DB_NAME", "mobility4you"),
        "USER": os.environ.get("POSTGRES_USER") or os.environ.get("DB_USER", "postgres"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD") or os.environ.get("DB_PASSWORD", "superseguro_postgres"),
        "HOST": os.environ.get("POSTGRES_HOST") or os.environ.get("DB_HOST", "db"),  # 'db' para Docker Compose
        "PORT": os.environ.get("POSTGRES_PORT") or os.environ.get("DB_PORT", "5432"),
        "OPTIONS": {
            "sslmode": "prefer",
        },
    }
}

# Debug de configuración de base de datos
print(f"🔧 [DEVELOPMENT] Database config:")
print(f"🔧 ENGINE: {DATABASES['default']['ENGINE']}")
print(f"🔧 NAME: {DATABASES['default']['NAME']}")
print(f"🔧 USER: {DATABASES['default']['USER']}")
print(f"🔧 HOST: {DATABASES['default']['HOST']}")
print(f"🔧 PORT: {DATABASES['default']['PORT']}")

# Variables de entorno para debug
print(f"📋 Environment variables:")
print(f"   POSTGRES_DB: {os.environ.get('POSTGRES_DB', 'NOT_SET')}")
print(f"   DB_HOST: {os.environ.get('DB_HOST', 'NOT_SET')}")
print(f"   DB_ENGINE: {os.environ.get('DB_ENGINE', 'NOT_SET')}")

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
