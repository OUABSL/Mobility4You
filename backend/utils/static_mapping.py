# Configuración de archivos estáticos para Render
# Fallback robusto cuando VERSIONED_ASSETS no está disponible

import os
from datetime import datetime

# Mapeo de archivos versionados (generado automáticamente en desarrollo)
# En producción (Render), usamos archivos base sin versionado
VERSIONED_ASSETS = {
    "css": "admin/css/custom_admin.css",
    "js_vehiculos": "admin/js/vehiculos_admin.js", 
    "js_politicas": "admin/js/politicas_admin.js",
    "js_usuarios": "admin/js/usuarios_admin.js",
    "js_payments": "admin/js/payments_admin.js",
    "js_reservas": "admin/js/reservas_admin.js",
    "js_comunicacion": "admin/js/comunicacion_admin.js",
    "js_lugares": "admin/js/lugares_admin.js",
    "js_facturas_contratos": "admin/js/facturas_contratos_admin.js",
}

# Fallbacks seguros para cuando los archivos versionados no están disponibles
SAFE_FALLBACKS = {
    "css": "admin/css/custom_admin.css",
    "js_vehiculos": "admin/js/vehiculos_admin.js",
    "js_politicas": "admin/js/politicas_admin.js", 
    "js_usuarios": "admin/js/usuarios_admin.js",
    "js_payments": "admin/js/payments_admin.js",
    "js_reservas": "admin/js/reservas_admin.js",
    "js_comunicacion": "admin/js/comunicacion_admin.js",
    "js_lugares": "admin/js/lugares_admin.js",
    "js_facturas_contratos": "admin/js/facturas_contratos_admin.js",
}

def get_versioned_asset(asset_key, fallback=None):
    """
    Obtiene la ruta del asset versionado con fallbacks robustos para producción
    
    Args:
        asset_key: Clave del asset (ej: 'js_usuarios', 'css')
        fallback: Ruta de fallback personalizada
    
    Returns:
        str: Ruta del archivo estático
    """
    try:
        # 1. Intentar obtener asset versionado
        if VERSIONED_ASSETS and asset_key in VERSIONED_ASSETS:
            return VERSIONED_ASSETS[asset_key]
        
        # 2. Usar fallback explícito si se proporciona
        if fallback:
            return fallback
            
        # 3. Usar fallback seguro predefinido
        if asset_key in SAFE_FALLBACKS:
            return SAFE_FALLBACKS[asset_key]
            
        # 4. Generar fallback dinámico
        if asset_key.startswith('js_'):
            app_name = asset_key.replace('js_', '')
            return f"admin/js/{app_name}_admin.js"
        elif asset_key == 'css':
            return "admin/css/custom_admin.css"
        else:
            # Último recurso - devolver tal como está
            return asset_key
            
    except Exception as e:
        # Manejo de errores robusto - importante para producción
        error_msg = f"[ERROR] get_versioned_asset({asset_key}): {e}"
        
        # En desarrollo, mostrar el error
        if os.environ.get('DEBUG', '').lower() == 'true':
            print(error_msg)
            
        # Devolver fallback de emergencia - SIEMPRE archivos base
        if asset_key == 'css':
            return "admin/css/custom_admin.css"
        elif asset_key.startswith('js_'):
            app_name = asset_key.replace('js_', '')
            return f"admin/js/{app_name}_admin.js"
        elif fallback:
            return fallback
        else:
            return f"admin/css/{asset_key}.css"

# Timestamp de generación 
GENERATED_AT = '2025-07-17T17:45:00.000000'
