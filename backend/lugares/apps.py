from django.apps import AppConfig


class LugaresConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lugares"
    verbose_name = "Gestión de Lugares y Direcciones"

    def ready(self):
        # Importar señales si las hay
        pass
