# utils/static_mapping.py
"""
Sistema único y optimizado de versionado de archivos estáticos
Compatible con WhiteNoise y CompressedManifestStaticFilesStorage
Aplicando principios DRY y buenas prácticas
"""
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from django.conf import settings
from django.contrib.staticfiles import finders
from django.contrib.staticfiles.storage import staticfiles_storage
from django.core.management import call_command

logger = logging.getLogger(__name__)

# Mapeo base de archivos estáticos (rutas originales)
BASE_STATIC_ASSETS = {
    "css": "admin/css/custom_admin.css",
    "js_vehiculos": "admin/js/vehiculos_admin.js",
    "js_politicas": "admin/js/politicas_admin.js",
    "js_usuarios": "admin/js/usuarios_admin.js",
    "js_payments": "admin/js/payments_admin.js",
    "js_reservas": "admin/js/reservas_admin.js",
    "js_comunicacion": "admin/js/comunicacion_admin.js",
    "js_lugares": "admin/js/lugares_admin.js",
    "js_facturas": "admin/js/facturas_contratos_admin.js",
}

def get_versioned_asset(asset_key: str, fallback: Optional[str] = None) -> str:
    """
    Función principal para obtener rutas de archivos estáticos versionados
    
    Args:
        asset_key: Clave del asset en BASE_STATIC_ASSETS
        fallback: Ruta de fallback si el asset no se encuentra
        
    Returns:
        Ruta del archivo estático (versionada en producción, directa en desarrollo)
    """
    try:
        base_path = BASE_STATIC_ASSETS.get(asset_key)
        
        if not base_path:
            logger.warning(f"Asset key not found: {asset_key}")
            return fallback or asset_key
        
        # En desarrollo, usar la ruta directa
        if settings.DEBUG:
            return base_path
        
        # En producción, usar el URL del storage para obtener versión automáticamente
        try:
            # Intentar obtener la URL versionada del storage
            versioned_url = staticfiles_storage.url(base_path)
            # Extraer solo la parte de la ruta (sin dominio)
            if versioned_url.startswith('/'):
                return versioned_url.lstrip('/')
            return versioned_url
        except Exception as storage_error:
            # Si falla, intentar buscar el archivo directamente
            try:
                if hasattr(staticfiles_storage, 'stored_name'):
                    return staticfiles_storage.stored_name(base_path)
            except Exception:
                pass
            logger.warning(f"Error getting versioned asset {asset_key}: {storage_error}")
            return base_path
            
    except Exception as e:
        logger.error(f"Error in get_versioned_asset for {asset_key}: {e}")
        return fallback or base_path or asset_key

def validate_static_files() -> Dict[str, str]:
    """
    Valida que todos los archivos estáticos existan
    
    Returns:
        Diccionario con archivos encontrados {key: path}
    """
    found_files = {}
    
    for key, path in BASE_STATIC_ASSETS.items():
        if finders.find(path):
            found_files[key] = path
            logger.debug(f"✓ Found: {key} -> {path}")
        else:
            logger.warning(f"✗ Missing: {key} -> {path}")
            
    return found_files

def setup_static_system(force_collectstatic: bool = False) -> bool:
    """
    Configura el sistema completo de archivos estáticos
    
    Args:
        force_collectstatic: Forzar ejecución de collectstatic
        
    Returns:
        True si la configuración fue exitosa
    """
    try:
        logger.info("🚀 Configurando sistema de archivos estáticos...")
        
        # 1. Validar archivos
        found_files = validate_static_files()
        logger.info(f"✓ Archivos validados: {len(found_files)}/{len(BASE_STATIC_ASSETS)}")
        
        # 2. Ejecutar collectstatic si es necesario
        if force_collectstatic or not settings.DEBUG:
            static_root = getattr(settings, 'STATIC_ROOT', None)
            if static_root and not os.path.exists(static_root):
                logger.info("📁 Ejecutando collectstatic...")
                call_command('collectstatic', '--noinput', verbosity=0)
                logger.info("✓ Collectstatic completado")
        
        # 3. Verificar sistema en producción
        if not settings.DEBUG:
            try:
                # Test del storage system
                test_asset = next(iter(BASE_STATIC_ASSETS.values()))
                if hasattr(staticfiles_storage, 'stored_name'):
                    staticfiles_storage.stored_name(test_asset)
                logger.info("✓ WhiteNoise storage funcionando correctamente")
            except Exception as e:
                logger.warning(f"⚠ Storage test failed: {e}")
        
        logger.info("✅ Sistema de archivos estáticos configurado")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error configurando sistema estático: {e}")
        return False

def validate_assets() -> List[str]:
    """
    Función de validación para compatibilidad
    
    Returns:
        Lista de errores encontrados
    """
    errors = []
    found_files = validate_static_files()
    
    for key in BASE_STATIC_ASSETS:
        if key not in found_files:
            path = BASE_STATIC_ASSETS[key]
            errors.append(f"Asset not found: {key} -> {path}")
    
    return errors

def is_static_asset_error(exception: Exception) -> bool:
    """
    Detecta si una excepción está relacionada con archivos estáticos
    
    Args:
        exception: Excepción a analizar
        
    Returns:
        True si es un error de archivos estáticos
    """
    error_message = str(exception).lower()
    static_error_patterns = [
        'missing staticfiles manifest entry',
        'staticfiles manifest entry',
        'could not find static file',
        'static file not found',
        'manifest staticfiles',
        'whitenoise'
    ]
    return any(pattern in error_message for pattern in static_error_patterns)

def auto_repair_static_assets() -> bool:
    """
    Auto-reparación de archivos estáticos en caso de error
    
    Returns:
        True si la reparación fue exitosa
    """
    try:
        logger.info("🔧 Iniciando auto-reparación de archivos estáticos...")
        success = setup_static_system(force_collectstatic=True)
        
        if success:
            logger.info("✅ Auto-reparación completada")
        else:
            logger.error("❌ Auto-reparación falló")
            
        return success
        
    except Exception as e:
        logger.error(f"❌ Error en auto-reparación: {e}")
        return False

# Middleware integrado en el mismo archivo
class StaticAssetsAutoRepairMixin:
    """
    Mixin para auto-reparación de archivos estáticos
    Puede ser usado en cualquier middleware existente
    """
    
    def __init__(self):
        self.repair_attempted = False
    
    def handle_static_error(self, exception):
        """
        Maneja errores de archivos estáticos
        
        Args:
            exception: Excepción capturada
            
        Returns:
            True si se manejó el error
        """
        if self.repair_attempted or not is_static_asset_error(exception):
            return False
            
        logger.warning(f"Detectado error de archivo estático: {exception}")
        
        try:
            success = auto_repair_static_assets()
            self.repair_attempted = True
            
            if success:
                logger.info("✅ Error de archivos estáticos auto-reparado")
                return True
                
        except Exception as repair_error:
            logger.error(f"❌ Error en auto-reparación: {repair_error}")
            
        return False

# Configuración automática en startup
def auto_configure_on_startup():
    """
    Auto-configuración del sistema al inicio
    Solo se ejecuta en el proceso principal y en producción
    """
    # Solo ejecutar en el proceso principal
    if os.environ.get('RUN_MAIN', None) != 'true':
        return
        
    # Solo en producción para evitar overhead en desarrollo
    if settings.DEBUG:
        logger.debug("Modo DEBUG: omitiendo auto-configuración de archivos estáticos")
        return
        
    try:
        found_files = validate_static_files()
        if found_files:
            logger.info(f"✓ Sistema de archivos estáticos verificado: {len(found_files)} archivos")
        else:
            logger.warning("⚠ Configurando sistema de archivos estáticos...")
            setup_static_system()
            
    except Exception as e:
        logger.warning(f"⚠ Error en auto-configuración: {e}")

# Metadata
GENERATED_AT = datetime.now().isoformat()
VERSION = "2.0.0"

# Funciones de compatibilidad (mantener nombres existentes)
def auto_repair_assets():
    """Alias para compatibilidad"""
    return auto_repair_static_assets()

def setup_static_versioning():
    """Alias para compatibilidad"""
    return setup_static_system()
