# Mapeo automático de archivos estáticos versionados
# Generado automáticamente - NO EDITAR MANUALMENTE
# Última actualización: 2025-08-17 16:26:50.097575

import logging
import os
from datetime import datetime

logger = logging.getLogger(__name__)

VERSIONED_ASSETS = {
    "css": "admin/css/custom_admin.c5880bb26f05.css",
    "js_vehiculos": "admin/js/vehiculos_admin_vfd3d29f9.js",
    "js_politicas": "admin/js/politicas_admin_v0d04259b.js",
    "js_usuarios": "admin/js/usuarios_admin_vc5b6f7e1.js",
    "js_payments": "admin/js/payments_admin_v74cfa735.js",
    "js_reservas": "admin/js/reservas_admin_v74440271.js",
    "js_comunicacion": "admin/js/comunicacion_admin_v9f784c33.js",
    "js_lugares": "admin/js/lugares_admin_v24eafaad.js",
}

# Función helper para obtener asset versionado
def get_versioned_asset(asset_key, fallback=None):
    """Obtiene la ruta del asset versionado o fallback si no existe"""
    try:
        asset_path = VERSIONED_ASSETS.get(asset_key, fallback or asset_key)
        
        # Validación en tiempo real (solo en desarrollo)
        from django.conf import settings
        if settings.DEBUG:
            # Validar que el archivo existe
            from django.contrib.staticfiles import finders
            if not finders.find(asset_path):
                logger.warning(f"⚠️ Asset no encontrado: {asset_path}, intentando auto-reparación...")
                
                # Auto-reparar si es posible
                try:
                    from utils.static_hooks import StaticVersioningHooks
                    StaticVersioningHooks.run_auto_versioning()
                    
                    # Recargar mapeo después de auto-reparación
                    import importlib
                    import sys
                    current_module = sys.modules[__name__]
                    importlib.reload(current_module)
                    
                    # Intentar obtener asset nuevamente
                    asset_path = current_module.VERSIONED_ASSETS.get(asset_key, fallback or asset_key)
                    
                except Exception as e:
                    logger.error(f"Error en auto-reparación: {e}")
                    # Usar fallback como último recurso
                    asset_path = fallback or asset_key
        
        return asset_path
        
    except Exception as e:
        logger.error(f"Error obteniendo asset {asset_key}: {e}")
        return fallback or asset_key

# Timestamp de generación
GENERATED_AT = '2025-08-17T16:26:50.097595'

# Función de auto-validación
def validate_assets():
    """Valida que todos los assets existen en el sistema de archivos"""
    errors = []
    
    try:
        from django.conf import settings
        from django.contrib.staticfiles import finders
        
        for key, path in VERSIONED_ASSETS.items():
            if not finders.find(path):
                errors.append(f"Asset faltante: {key} -> {path}")
                
    except Exception as e:
        errors.append(f"Error validando assets: {e}")
    
    return errors

# Función de auto-reparación
def auto_repair_assets():
    """Auto-repara assets faltantes usando el sistema inteligente"""
    try:
        from utils.smart_static_versioning import SmartStaticVersioning
        
        versioning = SmartStaticVersioning()
        return versioning.auto_version_all_files()
        
    except Exception as e:
        logger.error(f"Error en auto-reparación: {e}")
        return False
