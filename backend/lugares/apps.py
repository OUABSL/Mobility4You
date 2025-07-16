from django.apps import AppConfig


class LugaresConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lugares"
    verbose_name = "Gestión de Lugares y Direcciones"

    def ready(self):
        """Inicialización cuando la app está lista"""
        try:
            # Importar señales si las hay
            # import lugares.signals
            pass
        except ImportError:
            pass
