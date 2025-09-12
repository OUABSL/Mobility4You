"""
Configuración de producción para Render.com
Este archivo está optimizado para el deployment en Render
"""

import os

import dj_database_url

from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

# Hosts permitidos - Render
ALLOWED_HOSTS = [
    '.onrender.com',
    'localhost',
    '127.0.0.1'
]

# Base de datos - Render proporciona DATABASE_URL automáticamente
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Configuración de archivos estáticos para Render
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# ===========================================
# CONFIGURACIÓN DE STORAGE - B2 (BACKBLAZE)
# ===========================================

# Verificar si están configuradas las credenciales de B2
if all([
    os.environ.get('B2_APPLICATION_KEY_ID'),
    os.environ.get('B2_APPLICATION_KEY'),
    os.environ.get('B2_BUCKET_NAME'),
    os.environ.get('B2_S3_ENDPOINT')
]):
    # Configuración de B2 para archivos media
    AWS_ACCESS_KEY_ID = os.environ.get('B2_APPLICATION_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('B2_APPLICATION_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('B2_BUCKET_NAME')
    AWS_S3_ENDPOINT_URL = f'https://{os.environ.get("B2_S3_ENDPOINT")}'
    
    # Configuración de storages con backend personalizado para B2
    STORAGES = {
        "default": {
            "BACKEND": "config.storage_backends.B2Storage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
    
    # Configuración específica de S3/B2
    AWS_S3_FILE_OVERWRITE = True  # Evita HEAD_OBJECT para verificar existencia
    AWS_DEFAULT_ACL = 'public-read'
    AWS_S3_CUSTOM_DOMAIN = None
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
        'ContentDisposition': 'inline',
    }
    
    # Configuración de región y SSL
    AWS_S3_REGION_NAME = 'eu-central-003'
    AWS_S3_USE_SSL = True
    AWS_S3_VERIFY = True
    
    # Configuraciones para optimizar B2 operations
    AWS_QUERYSTRING_AUTH = False  # URLs públicas sin autenticación
    AWS_S3_MAX_MEMORY_SIZE = 1024 * 1024 * 50  # 50MB en memoria máximo
    AWS_S3_SIGNATURE_VERSION = 's3v4'  # Signature version 4
    AWS_S3_ADDRESSING_STYLE = 'virtual'  # Virtual-hosted style URLs
    AWS_S3_USE_SSL = True
    
    # URL para archivos media en B2
    MEDIA_URL = f'{AWS_S3_ENDPOINT_URL}/{AWS_STORAGE_BUCKET_NAME}/'
    
    print(f"[PRODUCTION B2] Configuración de media en B2:")
    print(f"[B2] Bucket: {AWS_STORAGE_BUCKET_NAME}")
    print(f"[B2] Media URL: {MEDIA_URL}")
    
else:
    # Fallback: Configuración local de archivos media
    MEDIA_URL = '/media/'
    MEDIA_ROOT = os.path.join(BASE_DIR, 'mediafiles')
    
    print("[PRODUCTION] Usando almacenamiento local para archivos media")
    print("[WARNING] Variables B2 no configuradas - revisa las variables de entorno")

# Configuración de archivos estáticos adicional
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# Middleware para WhiteNoise (servir archivos estáticos)
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # WhiteNoise para archivos estáticos
] + MIDDLEWARE[1:]  # Agregar el resto del middleware existente


# Configuración de seguridad para producción
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = 'DENY'

# CSRF y Session configuración
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_HTTPONLY = True

# Configuración de CORS para frontend
CORS_ALLOWED_ORIGINS = [
    "https://tu-frontend.onrender.com",  # Cambiar por la URL real del frontend
]

CORS_ALLOW_CREDENTIALS = True

# Configuración de logs para producción
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'config.storage_backends': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'storages': {
            'handlers': ['console'],
            'level': 'WARNING',  # Solo warnings y errores de storages
            'propagate': False,
        },
        'botocore': {
            'handlers': ['console'],
            'level': 'WARNING',  # Reducir ruido de boto3
            'propagate': False,
        },
        'boto3': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

# Configuración de email para producción (Brevo)
if os.environ.get('BREVO_API_KEY'):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = 'smtp-relay.brevo.com'
    EMAIL_PORT = 587
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = os.environ.get('BREVO_EMAIL')
    EMAIL_HOST_PASSWORD = os.environ.get('BREVO_API_KEY')
    DEFAULT_FROM_EMAIL = os.environ.get('BREVO_EMAIL')

# Configuración de Redis para producción (si está disponible)
REDIS_URL = os.environ.get('REDIS_URL')
if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            }
        }
    }

# Configuración de Stripe para producción
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')

# Timezone
TIME_ZONE = os.environ.get('TIME_ZONE', 'Europe/Madrid')
USE_TZ = True
