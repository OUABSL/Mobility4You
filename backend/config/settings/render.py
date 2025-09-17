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
    "mobility4you.onrender.com",
    "mobility4you.es",
    "www.mobility4you.es",
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
# En producción, usar B2 por defecto
if os.environ.get('USE_S3', 'TRUE') == 'TRUE':
    # Credenciales de B2 para archivos media
    AWS_ACCESS_KEY_ID = os.environ.get('B2_APPLICATION_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('B2_APPLICATION_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('B2_BUCKET_NAME', 'mobility4you-media-prod')
    B2_S3_ENDPOINT = os.environ.get('B2_S3_ENDPOINT', 's3.eu-central-003.backblazeb2.com')
    AWS_S3_ENDPOINT_URL = f'https://{B2_S3_ENDPOINT}'
    
    print(f"[B2] Configurando Backblaze B2:")
    print(f"[B2] Bucket: {AWS_STORAGE_BUCKET_NAME}")
    print(f"[B2] Endpoint: {AWS_S3_ENDPOINT_URL}")
    print(f"[B2] Key ID: {AWS_ACCESS_KEY_ID[:8]}...")
    
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
    
    # URL para archivos media en B2 - estructura unificada
    MEDIA_URL = f'{AWS_S3_ENDPOINT_URL}/{AWS_STORAGE_BUCKET_NAME}/media/'
    
    print(f"[B2] Media URL: {MEDIA_URL}")
    
else:
    # Fallback: archivos media locales
    MEDIA_URL = "/media/"
    MEDIA_ROOT = os.path.join(BASE_DIR, "staticfiles", "media")
    print("[LOCAL] Usando almacenamiento local para media")
# ========================================
# CONFIGURACIÓN CORS Y CSRF UNIFICADA
# ========================================

# CORS - Extensión de la configuración base para producción
CORS_ALLOWED_ORIGINS.extend([
    "https://mobility4you.es",
    "https://www.mobility4you.es", 
    "https://mobility4you.onrender.com",
    env("FRONTEND_URL", default="https://mobility4you-ydav.onrender.com"),
])

CORS_ALLOWED_ORIGINS = list(set([url for url in CORS_ALLOWED_ORIGINS if url]))

# CORS headers específicos para producción
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

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_EXPOSE_HEADERS = [
    'content-type',
    'x-csrftoken',
]

# CSRF - Configuración específica para dominios cruzados
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS.copy()
CSRF_COOKIE_SAMESITE = "None"  # Necesario para dominios cruzados
CSRF_COOKIE_SECURE = True  # Solo HTTPS en producción
CSRF_COOKIE_DOMAIN = None  # Permitir subdominios
CSRF_FAILURE_VIEW = 'django.views.csrf.csrf_failure'
CSRF_COOKIE_AGE = 31449600  # 1 año para evitar problemas de expiración

# Configuración básica de seguridad para HTTPS
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)

# Configuración unificada de logging
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

# ========================================
# VARIABLES DE APLICACIÓN
# ========================================

FRONTEND_URL = env("FRONTEND_URL", default="https://mobility4you.es")
BACKEND_URL = env("BACKEND_URL", default="https://mobility4you.onrender.com")

print(f"[RENDER] Configuración cargada:")
print(f"[DEBUG]: {DEBUG}")
print(f"[FRONTEND_URL]: {FRONTEND_URL}")
print(f"[BACKEND_URL]: {BACKEND_URL}")
print(f"[ALLOWED_HOSTS]: {ALLOWED_HOSTS}")
print(f"[DATABASE]: {'Yes' if DATABASE_URL else 'No (using SQLite)'}")
print(f"[CORS CONFIG] CORS Origins: {len(CORS_ALLOWED_ORIGINS)} configurados")
print(f"[CORS CONFIG] CSRF Origins: {len(CSRF_TRUSTED_ORIGINS)} configurados")
print(f"[SSL CONFIG] SECURE_SSL_REDIRECT: {SECURE_SSL_REDIRECT}")
print(f"[SSL CONFIG] SESSION_COOKIE_SECURE: {env.bool('SESSION_COOKIE_SECURE', default=True)}")
print(f"[SSL CONFIG] CSRF_COOKIE_SECURE: {env.bool('CSRF_COOKIE_SECURE', default=True)}")
# ========================================
# CONFIGURACIÓN DE SEGURIDAD
# ========================================

# Configuración de seguridad que respeta variables de entorno
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=True)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=True)
# SECURE_SSL_REDIRECT ya está configurado arriba con env.bool()
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)  # 1 año
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

# Configuración específica para debugging CORS en producción
if DEBUG:
    print(f"[CORS DEBUG] ALLOWED_ORIGINS: {CORS_ALLOWED_ORIGINS}")
    print(f"[CORS DEBUG] TRUSTED_ORIGINS: {CSRF_TRUSTED_ORIGINS}")
    print(f"[CORS DEBUG] ALLOWED_HOSTS: {ALLOWED_HOSTS}")

# Forzar headers específicos para todas las respuestas
SESSION_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SECURE = True

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

# Configuración adicional para Render
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

# Headers de seguridad adicionales para CORS
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin-allow-popups"

# ========================================
# VALIDACIONES FINALES
# ========================================

# Validaciones específicas para producción
if not SECRET_KEY or SECRET_KEY == "claveprivadatemporal":
    print("[WARNING] SECRET_KEY usando valor temporal")

if hasattr(globals(), 'STRIPE_SECRET_KEY') and STRIPE_SECRET_KEY == "sk_test_placeholder":
    print("[WARNING] STRIPE_SECRET_KEY usando valor placeholder")

if hasattr(globals(), 'STRIPE_WEBHOOK_SECRET') and STRIPE_WEBHOOK_SECRET == "whsec_placeholder":
    print("[WARNING] STRIPE_WEBHOOK_SECRET usando valor placeholder")

print(f"[RENDER CONFIG] Configuración cargada correctamente")
print(f"[RENDER CONFIG] DEBUG: {DEBUG}")
print(f"[RENDER CONFIG] CORS Origins: {len(CORS_ALLOWED_ORIGINS)} configurados")
print(f"[RENDER CONFIG] CSRF Origins: {len(CSRF_TRUSTED_ORIGINS)} configurados")
