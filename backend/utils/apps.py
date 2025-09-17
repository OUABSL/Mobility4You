# utils/apps.py
"""
Configuración de la aplicación utils
"""
import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)

class UtilsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'utils'
    verbose_name = 'Utilidades del Sistema'

    def ready(self):
        """
        Se ejecuta cuando Django ha cargado completamente
        """
        logger.info("✅ Aplicación utils inicializada")
