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

# Configuración de archivos media
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'mediafiles')

# Configuración de archivos estáticos adicional
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# Middleware para WhiteNoise (servir archivos estáticos)
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # WhiteNoise para archivos estáticos
] + MIDDLEWARE[1:]  # Agregar el resto del middleware existente

# Configuración de WhiteNoise
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

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
