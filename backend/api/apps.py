from django.apps import AppConfig

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    verbose_name = 'Mobility4You API'
    
    def ready(self):
        # Importar señales si las tienes
        pass