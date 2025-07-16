# config/settings/base.py
"""
Configuración base para Mobility4You
Contiene configuraciones comunes para desarrollo y producción
"""

import os
from pathlib import Path

import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Initialize environment and load .env file
env = environ.Env()

# Load .env file from backend directory
env_file = BASE_DIR / '.env'
if env_file.exists():
    environ.Env.read_env(env_file)
    print(f"🔧 [CONFIG] Archivo .env cargado desde: {env_file}")
else:
    print(f"⚠️ [CONFIG] No se encontró archivo .env en: {env_file}")

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env("SECRET_KEY", default="claveprivadatemporal")

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",  # Para CORS
    "django_filters",
    "storages",  # Para Backblaze B2 Storage
    # Aplicaciones modulares
    "config",
    "usuarios",
    "lugares",
    "vehiculos",
    "reservas",
    "politicas",
    "facturas_contratos",
    "comunicacion",
    "payments",
    "utils",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # Para servir archivos estáticos en producción
    "corsheaders.middleware.CorsMiddleware",  # CORS - Debe ir al principio
    "config.middleware.RequestTrackingMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "config.middleware.SecurityHeadersMiddleware",
    "config.middleware.RequestSizeMiddleware",
    "config.middleware.HealthCheckMiddleware",
    "config.middleware.GlobalExceptionMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Europe/Madrid"
USE_I18N = True
USE_TZ = True

# User model personalizado
AUTH_USER_MODEL = "usuarios.Usuario"

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Configuración de archivos estáticos y media (desarrollo)
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "staticfiles", "media")

# REST Framework
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.BasicAuthentication",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "config.middleware.custom_exception_handler",
}

# Email configuración base
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@mobility4you.com")
CONTACT_EMAIL = env("CONTACT_EMAIL", default="info@mobility4you.com")

# URL del frontend para redirecciones
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")

# Configuración de Brevo (Email Service)
BREVO_API_KEY = env("BREVO_API_KEY", default=None)
BREVO_EMAIL = env("BREVO_EMAIL", default=None)
BREVO_SENDER_NAME = env("BREVO_SENDER_NAME", default="Mobility4You")
ADMIN_EMAIL = env("ADMIN_EMAIL", default="admin@mobility4you.com")

# Configuración de Stripe
STRIPE_PUBLISHABLE_KEY = env("STRIPE_PUBLISHABLE_KEY", default="pk_test_placeholder")
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="sk_test_placeholder")
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", default="whsec_placeholder")

# URLs para redirecciones de Stripe
STRIPE_SUCCESS_URL = env("STRIPE_SUCCESS_URL", default=f"{FRONTEND_URL}/reservation-confirmation/exito")
STRIPE_CANCEL_URL = env("STRIPE_CANCEL_URL", default=f"{FRONTEND_URL}/reservation-confirmation/error")

# Configuración específica de Stripe
STRIPE_CONFIG = {
    "api_version": "2024-06-20",
    "automatic_payment_methods": {
        "enabled": True,
        "allow_redirects": "never",
    },
    "capture_method": "automatic",
    "confirmation_method": "automatic",
    "currency": "eur",
    "payment_method_types": ["card"],
    "statement_descriptor": "MOBILITY4YOU",
    "statement_descriptor_suffix": "RENTAL",
}

# CORS configuración
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost",
    "http://127.0.0.1",
]

# CSRF configuración
CSRF_USE_SESSIONS = False
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_HEADER_NAME = "HTTP_X_CSRFTOKEN"
CSRF_COOKIE_NAME = "csrftoken"

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost",
    "http://127.0.0.1",
]
