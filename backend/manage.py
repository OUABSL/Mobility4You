#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    # Determinar el entorno y configurar el módulo de settings apropiado
    environment = os.environ.get("DJANGO_ENV", "development")
    
    # Detectar si estamos en Render por la presencia de RENDER_EXTERNAL_HOSTNAME
    if os.environ.get("RENDER_EXTERNAL_HOSTNAME") or environment == "production":
        settings_module = "config.settings.render"
    elif environment == "development":
        settings_module = "config.settings.development"
    else:
        settings_module = "config.settings.development"
    
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", settings_module)
    
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
