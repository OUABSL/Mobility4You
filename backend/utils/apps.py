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
        Se ejecuta cuando Django carga la aplicación
        Aquí configuramos los hooks automáticos
        """
        try:
            # Importar señales y hooks
            from . import static_hooks
            logger.info("✅ Hooks de versionado estático configurados")
            
        except Exception as e:
            logger.warning(f"⚠️ Error configurando hooks: {e}")
