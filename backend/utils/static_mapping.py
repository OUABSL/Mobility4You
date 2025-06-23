# Mapeo automático de archivos estáticos versionados
# Generado automáticamente - NO EDITAR MANUALMENTE
# Última actualización: 2025-06-23 00:42:46.497046

from datetime import datetime

VERSIONED_ASSETS = {
    "css": "admin/css/custom_admin_v211d00a2.css",
    "js_vehiculos": "admin/js/vehiculos_admin_v6b84047c.js",
    "js_politicas": "admin/js/politicas_admin_va4d427e4.js",
    "js_usuarios": "admin/js/usuarios_admin_vc5b6f7e1.js",
    "js_payments": "admin/js/payments_admin_va2ab12d0.js",
    "js_reservas": "admin/js/reservas_admin_va3222537.js",
    "js_comunicacion": "admin/js/comunicacion_admin_v13629419.js",
}

# Función helper para obtener asset versionado
def get_versioned_asset(asset_key, fallback=None):
    """Obtiene la ruta del asset versionado o fallback si no existe"""
    return VERSIONED_ASSETS.get(asset_key, fallback or asset_key)

# Timestamp de generación
GENERATED_AT = '2025-06-23T00:42:46.497063'
