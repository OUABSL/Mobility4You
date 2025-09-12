# utils/__init__.py
"""
Utilidades del sistema - Configuración simplificada
"""
import logging

logger = logging.getLogger(__name__)

# Exportar funciones principales si están disponibles
try:
    from .smart_static_versioning import (auto_version_static_files,
                                          validate_static_mappings)
    from .static_hooks import StaticVersioningHooks
    
    __all__ = [
        'auto_version_static_files',
        'validate_static_mappings', 
        'StaticVersioningHooks'
    ]
    
    logger.debug("✅ Funciones de versionado disponibles")
    
except ImportError as e:
    logger.debug(f"⚠️ Funciones de versionado no disponibles: {e}")
    __all__ = []