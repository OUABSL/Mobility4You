# utils/__init__.py
"""
Utilidades del sistema con auto-inicialización de hooks
"""
import logging
import os

logger = logging.getLogger(__name__)

# Auto-configurar hooks de versionado estático al importar utils
try:
    from .static_hooks import setup_static_versioning_hooks
    setup_static_versioning_hooks()
except Exception as e:
    logger.warning(f"No se pudieron configurar hooks de versionado estático: {e}")

# Exportar funciones principales
try:
    from .smart_static_versioning import (auto_version_static_files,
                                          validate_static_mappings)
    from .static_hooks import StaticVersioningHooks
    
    __all__ = [
        'auto_version_static_files',
        'validate_static_mappings', 
        'StaticVersioningHooks'
    ]
except ImportError as e:
    logger.warning(f"No se pudieron importar funciones de versionado: {e}")
    __all__ = []