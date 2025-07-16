# config/settings/render.py
"""
Configuración simplificada para despliegue en Render
"""

import os

import dj_database_url
import environ

from .base import *

# Inicializar environ
env = environ.Env(DEBUG=(bool, False))

DEBUG = False

# Hosts permitidos en Render
ALLOWED_HOSTS = [
    ".onrender.com",
    "localhost", 
    "127.0.0.1",
]

# Obtener ALLOWED_HOSTS adicionales desde variable de entorno
if "RENDER_EXTERNAL_HOSTNAME" in os.environ:
    ALLOWED_HOSTS.append(os.environ["RENDER_EXTERNAL_HOSTNAME"])

# Database - PostgreSQL en Render
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Fallback para desarrollo
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# CONFIGURACIÓN HÍBRIDA: WhiteNoise para estáticos + B2 para media
# Archivos estáticos (CSS, JS) se sirven desde el repositorio con WhiteNoise
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

# WhiteNoise configuración optimizada para archivos estáticos
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = False

# CONFIGURACIÓN DE BACKBLAZE B2 PARA ARCHIVOS MEDIA
# Solo para archivos subidos por el admin (imágenes de vehículos, avatares, etc.)
if os.environ.get('USE_S3') == 'TRUE':
    # Credenciales de B2 para archivos media
    AWS_ACCESS_KEY_ID = os.environ.get('B2_APPLICATION_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('B2_APPLICATION_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('B2_BUCKET_NAME')
    AWS_S3_ENDPOINT_URL = f'https://{os.environ.get("B2_S3_ENDPOINT")}'
    
    # Configuración para Django 4.2+ - Solo configurar el almacenamiento de media
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
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
    
    print(f"🔧 [B2] Configuración de media activada:")
    print(f"🔧 Bucket: {AWS_STORAGE_BUCKET_NAME}")
    print(f"🔧 Endpoint: {AWS_S3_ENDPOINT_URL}")
    print(f"🔧 Media URL: {MEDIA_URL}")
    
else:
    # Fallback: archivos media locales
    MEDIA_URL = "/media/"
    MEDIA_ROOT = os.path.join(BASE_DIR, "staticfiles", "media")
    print("🔧 [LOCAL] Usando almacenamiento local para media")
# CORS simplificado
CORS_ALLOWED_ORIGINS = [
    env("FRONTEND_URL", default="https://mobility4you-ydav.onrender.com"),
]
CORS_ALLOW_CREDENTIALS = True

# Configuración básica de seguridad para HTTPS
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)

# Logging simplificado
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}

# Variables de aplicación para URLs parametrizadas
FRONTEND_URL = env("FRONTEND_URL", default="https://mobility4you-ydav.onrender.com")
BACKEND_URL = env("BACKEND_URL", default="https://mobility4you.onrender.com")

print(f"🔧 [RENDER] Configuración cargada:")
print(f"🔧 DEBUG: {DEBUG}")
print(f"🔧 FRONTEND_URL: {FRONTEND_URL}")
print(f"🔧 BACKEND_URL: {BACKEND_URL}")
print(f"🔧 ALLOWED_HOSTS: {ALLOWED_HOSTS}")
print(f"🔧 Database configured: {'Yes' if DATABASE_URL else 'No (using SQLite)'}")
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

# CORS para producción - URLs completamente parametrizadas
CORS_ALLOWED_ORIGINS = [
    env("FRONTEND_URL", default="https://mobility4you-ydav.onrender.com"),
    env("FRONTEND_URL_SECONDARY", default=""),  # URL secundaria opcional
]

# Filtrar URLs vacías
CORS_ALLOWED_ORIGINS = [url for url in CORS_ALLOWED_ORIGINS if url]

# Permitir credenciales CORS
CORS_ALLOW_CREDENTIALS = True

# Headers permitidos
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

CSRF_TRUSTED_ORIGINS = [
    env("FRONTEND_URL", default="https://mobility4you-ydav.onrender.com"),
    env("FRONTEND_URL_SECONDARY", default=""),  # URL secundaria opcional
]

# Filtrar URLs vacías
CSRF_TRUSTED_ORIGINS = [url for url in CSRF_TRUSTED_ORIGINS if url]

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
