from django.apps import AppConfig


class VehiculosConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "vehiculos"
    verbose_name = "Gestión de Vehículos y Ubicaciones"

    def ready(self):
        # Importar señales si las hay
        pass
