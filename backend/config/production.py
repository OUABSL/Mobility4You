# config/settings/production.py
from .base import *
import os
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

# Hosts permitidos
ALLOWED_HOSTS = [
    os.environ.get('ALLOWED_HOST', 'mobility4you.com'),
    'www.mobility4you.com',
]

# Database - MySQL/MariaDB
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT', '3306'),
        'OPTIONS': {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
            'charset': 'utf8mb4',
        },
    }
}

# Seguridad
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 año
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Archivos estáticos y media
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Cache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://redis:6379/1'),
    }
}

# Email
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
EMAIL_USE_TLS = True
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'info@mobility4you.com')
CONTACT_EMAIL = os.environ.get('CONTACT_EMAIL', 'contacto@mobility4you.com')

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs/django.log'),
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'WARNING',
            'propagate': True,
        },
        'api': {
            'handlers': ['file'],
            'level': 'WARNING',
            'propagate': True,
        },
        'redsys': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
        'emails': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

# Sentry para monitoreo de errores
sentry_sdk.init(
    dsn=os.environ.get('SENTRY_DSN'),
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.2,
    send_default_pii=True
)

# REST Framework
REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
    'rest_framework.renderers.JSONRenderer',
]

# Redsys
REDSYS_MERCHANT_CODE = os.environ.get('REDSYS_MERCHANT_CODE')
REDSYS_TERMINAL = os.environ.get('REDSYS_TERMINAL', '001')
REDSYS_SECRET_KEY = os.environ.get('REDSYS_SECRET_KEY')
REDSYS_ENVIRONMENT = os.environ.get('REDSYS_ENVIRONMENT', 'production')

# URL frontend
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://mobility4you.com')