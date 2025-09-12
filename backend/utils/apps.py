# utils/apps.py
"""
Configuración de la aplicación utils
Auto-inicializa el sistema de archivos estáticos optimizado
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
        Auto-configura el sistema de archivos estáticos
        """
        try:
            # Importar y ejecutar auto-configuración
            from .static_mapping import auto_configure_on_startup
            auto_configure_on_startup()
            logger.info("✅ Sistema de archivos estáticos inicializado")
                
        except Exception as e:
            logger.warning(f"⚠ Error inicializando sistema estático: {e}")
