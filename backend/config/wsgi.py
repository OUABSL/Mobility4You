"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

# Determinar el entorno y configurar el módulo de settings apropiado
environment = os.environ.get("DJANGO_ENV", "development")

if environment == "production":
    settings_module = "config.settings.render"
elif environment == "development":
    settings_module = "config.settings.development"
else:
    settings_module = "config.settings.development"

os.environ.setdefault("DJANGO_SETTINGS_MODULE", settings_module)

application = get_wsgi_application()
