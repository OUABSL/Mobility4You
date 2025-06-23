# Mapeo automático de archivos estáticos versionados
# Generado automáticamente - NO EDITAR MANUALMENTE
# Última actualización: 2025-06-23 20:33:13.253138

from datetime import datetime

VERSIONED_ASSETS = {
    "css": "admin/css/custom_admin_v78b65000.css",
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
    """Obtiene la ruta del asset versionado o fallback si no existe"""
    return VERSIONED_ASSETS.get(asset_key, fallback or asset_key)

# Timestamp de generación
GENERATED_AT = '2025-06-23T20:33:13.253154'
