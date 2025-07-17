# Mapeo automático de archivos estáticos versionados
# Generado automáticamente - NO EDITAR MANUALMENTE
# Última actualización: 2025-07-17 17:20:46.662054

from datetime import datetime

VERSIONED_ASSETS = {
    "css": "admin/css/custom_admin_veeb3cfb9.css",
    "js_vehiculos": "admin/js/vehiculos_admin_vfd3d29f9.js",
    "js_politicas": "admin/js/politicas_admin_v0d04259b.js",
    "js_usuarios": "admin/js/usuarios_admin_vc5b6f7e1.js",
    "js_payments": "admin/js/payments_admin_v74cfa735.js",
    "js_reservas": "admin/js/reservas_admin_v74440271.js",
    "js_comunicacion": "admin/js/comunicacion_admin_v9f784c33.js",
    "js_lugares": "admin/js/lugares_admin_v6ba3dda2.js",
}

# Función helper para obtener asset versionado
def get_versioned_asset(asset_key, fallback=None):
    """
    Obtiene la ruta del asset versionado o fallback si no existe
    Versión robusta para manejar archivos faltantes en producción
    """
    try:
        # Primero intentar obtener el asset versionado
        versioned_path = VERSIONED_ASSETS.get(asset_key)
        if versioned_path:
            return versioned_path
        
        # Si no hay versión, usar fallback explícito
        if fallback:
            return fallback
            
        # Generar fallback automático basado en el asset_key
        if asset_key.startswith('js_'):
            # Para archivos JS: js_vehiculos -> admin/js/vehiculos_admin.js
            app_name = asset_key.replace('js_', '')
            return f"admin/js/{app_name}_admin.js"
        elif asset_key == 'css':
            return "admin/css/custom_admin.css"
        else:
            # Fallback genérico - devolver como está para compatibilidad
            return asset_key
            
    except Exception as e:
        # En caso de cualquier error, devolver fallback seguro
        print(f"[ERROR] get_versioned_asset({asset_key}): {e}")
        
        if fallback:
            return fallback
            
        # Fallback de emergencia
        if asset_key.startswith('js_'):
            app_name = asset_key.replace('js_', '')
            return f"admin/js/{app_name}_admin.js"
        elif asset_key == 'css':
            return "admin/css/custom_admin.css"
        else:
            return f"admin/static/{asset_key}"

# Timestamp de generación
GENERATED_AT = '2025-07-17T17:20:46.662075'
