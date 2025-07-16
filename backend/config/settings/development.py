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

# CONFIGURACIÓN HÍBRIDA PARA DESARROLLO: Local estáticos + B2 para media (opcional)
STATIC_URL = "/django-static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

# CONFIGURACIÓN DE BACKBLAZE B2 PARA ARCHIVOS MEDIA (OPCIONAL EN DESARROLLO)
# Solo si se habilita USE_S3=TRUE en .env para pruebas
if os.environ.get('USE_S3') == 'TRUE':
    import environ
    env = environ.Env()
    
    # Credenciales de B2 para archivos media
    AWS_ACCESS_KEY_ID = os.environ.get('B2_APPLICATION_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('B2_APPLICATION_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('B2_BUCKET_NAME')
    AWS_S3_ENDPOINT_URL = f'https://{os.environ.get("B2_S3_ENDPOINT")}'
    
    # Configuración para Django 4.2+ - Solo media en B2, estáticos locales
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
    
    # Configuración específica de S3/B2
    AWS_S3_FILE_OVERWRITE = False
    AWS_DEFAULT_ACL = 'public-read'
    AWS_S3_CUSTOM_DOMAIN = None
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }
    AWS_S3_REGION_NAME = 'eu-central-003'
    AWS_S3_USE_SSL = True
    AWS_S3_VERIFY = True
    
    # URL para archivos media en B2
    MEDIA_URL = f'{AWS_S3_ENDPOINT_URL}/{AWS_STORAGE_BUCKET_NAME}/'
    
    print(f"🔧 [DEVELOPMENT B2] Configuración de media en B2:")
    print(f"🔧 Bucket: {AWS_STORAGE_BUCKET_NAME}")
    print(f"🔧 Media URL: {MEDIA_URL}")
    
else:
    # Configuración local por defecto
    MEDIA_URL = "/media/"
    MEDIA_ROOT = os.path.join(BASE_DIR, "staticfiles", "media")
    print("🔧 [DEVELOPMENT LOCAL] Usando almacenamiento local para media")

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
