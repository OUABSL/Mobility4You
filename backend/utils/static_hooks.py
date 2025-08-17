# utils/static_hooks.py
"""
Sistema de hooks automáticos para versionado de archivos estáticos
Se ejecuta automáticamente en varios puntos del ciclo de vida de la aplicación
"""
import logging
import os

from django.apps import AppConfig
from django.core.management import call_command
from django.db.models.signals import post_migrate
from django.dispatch import receiver

logger = logging.getLogger(__name__)

class StaticVersioningHooks:
    """
    Maneja hooks automáticos para el versionado de archivos estáticos
    """
    
    @staticmethod
    def run_auto_versioning():
        """Ejecuta el versionado automático de forma segura"""
        try:
            from utils.smart_static_versioning import auto_version_static_files
            success = auto_version_static_files()
            
            if success:
                logger.info("✅ Auto-versionado de archivos estáticos completado")
            else:
                logger.warning("⚠️ Auto-versionado falló, usando fallbacks")
                
        except Exception as e:
            logger.error(f"❌ Error en auto-versionado: {e}")
            # En caso de error, asegurar que el sistema siga funcionando
            StaticVersioningHooks.ensure_fallback_mapping()
    
    @staticmethod
    def ensure_fallback_mapping():
        """Asegura que existe un mapeo de fallback funcional"""
        try:
            mapping_file = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "utils", "static_mapping.py"
            )
            
            # Si no existe el archivo de mapeo, crear uno básico
            if not os.path.exists(mapping_file):
                fallback_content = '''# Mapeo de fallback para archivos estáticos
# Generado automáticamente como fallback de emergencia

VERSIONED_ASSETS = {
    "css": "admin/css/custom_admin.css",
    "js_vehiculos": "admin/js/vehiculos_admin.js",
    "js_politicas": "admin/js/politicas_admin.js",
    "js_usuarios": "admin/js/usuarios_admin.js",
    "js_payments": "admin/js/payments_admin.js",
    "js_reservas": "admin/js/reservas_admin.js",
    "js_comunicacion": "admin/js/comunicacion_admin.js",
    "js_lugares": "admin/js/lugares_admin.js",
}

def get_versioned_asset(asset_key, fallback=None):
    """Obtiene la ruta del asset versionado o fallback si no existe"""
    return VERSIONED_ASSETS.get(asset_key, fallback or asset_key)

GENERATED_AT = 'fallback'
'''
                
                with open(mapping_file, 'w', encoding='utf-8') as f:
                    f.write(fallback_content)
                
                logger.info(f"✅ Archivo de mapeo de fallback creado: {mapping_file}")
                
        except Exception as e:
            logger.error(f"❌ Error creando mapeo de fallback: {e}")


# Hooks de señales Django

@receiver(post_migrate)
def auto_version_after_migrate(sender, **kwargs):
    """
    Se ejecuta automáticamente después de migraciones
    Útil para despliegues en producción
    """
    # Solo ejecutar para la app principal para evitar ejecuciones múltiples
    if sender.name == 'config':
        logger.info("🔄 Ejecutando auto-versionado después de migración...")
        StaticVersioningHooks.run_auto_versioning()


def setup_static_versioning_hooks():
    """Configura todos los hooks de versionado"""
    # Asegurar mapeo de fallback al inicializar
    StaticVersioningHooks.ensure_fallback_mapping()
    
    # En desarrollo, ejecutar auto-versionado si es necesario
    if os.environ.get('DJANGO_DEVELOPMENT', False):
        StaticVersioningHooks.run_auto_versioning()


# Hook para collectstatic
def post_collectstatic_hook():
    """Se ejecuta después de collectstatic"""
    logger.info("🔄 Ejecutando auto-versionado después de collectstatic...")
    StaticVersioningHooks.run_auto_versioning()


# Hook para inicio de servidor
def server_startup_hook():
    """Se ejecuta al iniciar el servidor"""
    logger.info("🔄 Verificando archivos estáticos al iniciar servidor...")
    
    try:
        from utils.smart_static_versioning import validate_static_mappings
        errors = validate_static_mappings()
        
        if errors:
            logger.warning("⚠️ Problemas detectados en archivos estáticos, ejecutando auto-reparación...")
            StaticVersioningHooks.run_auto_versioning()
        else:
            logger.info("✅ Archivos estáticos validados correctamente")
            
    except Exception as e:
        logger.error(f"❌ Error en validación de startup: {e}")
        StaticVersioningHooks.ensure_fallback_mapping()
