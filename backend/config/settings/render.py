# config/settings/render.py
"""
Configuración optimizada para despliegue en Render
"""

import os

import dj_database_url

from .base import *

DEBUG = False

# Hosts permitidos en Render
ALLOWED_HOSTS = [
    ".onrender.com",  # Permitir todos los subdominios de Render
    "localhost",
    "127.0.0.1",
]

# Obtener ALLOWED_HOSTS adicionales desde variable de entorno
if "RENDER_EXTERNAL_HOSTNAME" in os.environ:
    ALLOWED_HOSTS.append(os.environ["RENDER_EXTERNAL_HOSTNAME"])

# Database - PostgreSQL en Render
DATABASES = {
    "default": dj_database_url.parse(
        env("DATABASE_URL"),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Configuración para Backblaze B2
if os.environ.get('USE_S3') == 'TRUE':
    # Credenciales de B2 (leídas desde variables de entorno)
    AWS_ACCESS_KEY_ID = os.environ.get('B2_APPLICATION_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('B2_APPLICATION_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('B2_BUCKET_NAME')
    
    # Endpoint de S3 de tu bucket de B2
    AWS_S3_ENDPOINT_URL = f'https://{os.environ.get("B2_S3_ENDPOINT")}'
    
    # Configuración de almacenamiento
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'
    
    AWS_S3_FILE_OVERWRITE = False
    AWS_DEFAULT_ACL = 'public-read'
    AWS_S3_CUSTOM_DOMAIN = None
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }
    
    # URLs para acceder a los archivos
    STATIC_URL = f'{AWS_S3_ENDPOINT_URL}/{AWS_STORAGE_BUCKET_NAME}/static/'
    MEDIA_URL = f'{AWS_S3_ENDPOINT_URL}/{AWS_STORAGE_BUCKET_NAME}/media/'
    
else:
    # Fallback: usar WhiteNoise para archivos estáticos
    STATIC_URL = "/static/"
    STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
    
    # WhiteNoise configuración optimizada
    STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
    WHITENOISE_USE_FINDERS = True
    WHITENOISE_AUTOREFRESH = False
    
    # Media files con WhiteNoise (no recomendado para producción)
    MEDIA_URL = "/media/"
    MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# Seguridad mejorada
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 año
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

# CORS para producción
CORS_ALLOWED_ORIGINS = [
    env("FRONTEND_URL", default="https://your-frontend.onrender.com"),
]

CSRF_TRUSTED_ORIGINS = [
    env("FRONTEND_URL", default="https://your-frontend.onrender.com"),
]

# Email configuración
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")

# Cache con Redis (si está disponible)
if "REDIS_URL" in os.environ:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": os.environ["REDIS_URL"],
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
            },
            "KEY_PREFIX": "mobility4you",
            "TIMEOUT": 300,
        }
    }
else:
    # Fallback a cache en memoria
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "unique-snowflake",
        }
    }

# Logging optimizado para producción
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
        "file": {
            "level": "ERROR",
            "class": "logging.FileHandler",
            "filename": "/tmp/django_errors.log",
            "formatter": "verbose",
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
            "level": "ERROR",
            "propagate": False,
        },
        "": {
            "handlers": ["console"],
            "level": "INFO",
        },
    },
}

# Validaciones específicas para producción
if not SECRET_KEY or SECRET_KEY == "claveprivadatemporal":
    raise ValueError("SECRET_KEY debe configurarse en producción")

if STRIPE_SECRET_KEY == "sk_test_placeholder":
    raise ValueError("STRIPE_SECRET_KEY debe configurarse en producción")

if STRIPE_WEBHOOK_SECRET == "whsec_placeholder":
    raise ValueError("STRIPE_WEBHOOK_SECRET debe configurarse en producción")

# Configuración adicional para Render
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
