# config/admin.py
"""
Configuración principal del panel de administración Django
Personaliza la interfaz y agrupa las aplicaciones por funcionalidad
"""
from django.contrib import admin
from django.contrib.admin import AdminSite
from django.utils.translation import gettext_lazy as _


class MobilityAdminSite(AdminSite):
    """
    Sitio de administración personalizado para Mobility-for-you
    """

    site_header = _("Mobility-for-you - Panel de Administración")
    site_title = _("Mobility Admin")
    index_title = _("Gestión del Sistema de Alquiler de Vehículos")

    def get_app_list(self, request, app_label=None):
        """
        Personaliza la lista de aplicaciones en el panel de administración
        Reagrupa las aplicaciones por funcionalidad
        """
        app_list = super().get_app_list(request, app_label)

        # Definir el orden y agrupamiento de aplicaciones
        custom_order = {
            "usuarios": {
                "name": _("👥 Gestión de Usuarios"),
                "order": 1,
                "description": _("Usuarios, perfiles y autenticación"),
            },
            "vehiculos": {
                "name": _("🚗 Vehículos y Ubicaciones"),
                "order": 2,
                "description": _("Vehículos, categorías, lugares y tarifas"),
            },
            "reservas": {
                "name": _("📅 Sistema de Reservas"),
                "order": 3,
                "description": _("Reservas, conductores, extras y penalizaciones"),
            },
            "politicas": {
                "name": _("📋 Políticas y Promociones"),
                "order": 4,
                "description": _("Políticas de pago, promociones y penalizaciones"),
            },
            "facturas_contratos": {
                "name": _("💰 Facturación y Contratos"),
                "order": 5,
                "description": _("Contratos, facturas y documentación"),
            },
            "comunicacion": {
                "name": _("📢 Comunicación"),
                "order": 6,
                "description": _("Contenidos, contacto y comunicación"),
            },
            "payments": {
                "name": _("💳 Pagos"),
                "order": 7,
                "description": _("Sistema de pagos y transacciones"),
            },
            "auth": {
                "name": _("🔐 Autenticación Django"),
                "order": 8,
                "description": _("Grupos y permisos del sistema"),
            },
            "admin": {
                "name": _("⚙️ Administración"),
                "order": 9,
                "description": _("Logs y configuración del sistema"),
            },
        }

        # Reagrupar y reordenar
        ordered_apps = []

        for app in app_list:
            app_label = app.get("app_label", "")
            if app_label in custom_order:
                app["name"] = custom_order[app_label]["name"]
                app["order"] = custom_order[app_label]["order"]
                app["description"] = custom_order[app_label]["description"]
                ordered_apps.append(app)

        # Agregar aplicaciones no personalizadas al final
        for app in app_list:
            app_label = app.get("app_label", "")
            if app_label not in custom_order:
                app["order"] = 999
                ordered_apps.append(app)

        # Ordenar por el campo 'order'
        ordered_apps.sort(key=lambda x: x.get("order", 999))

        return ordered_apps


# Crear una instancia del sitio personalizado
mobility_admin_site = MobilityAdminSite(name="mobility_admin")

# Registrar todas las aplicaciones en el sitio personalizado
from django.apps import apps


def register_all_models():
    """
    Registra automáticamente todos los modelos en el sitio personalizado
    """
    for model in apps.get_models():
        try:
            # Solo registrar si no está ya registrado en el admin por defecto
            if not admin.site.is_registered(model):
                mobility_admin_site.register(model)
            else:
                # Si ya está registrado, copiar la configuración
                admin_class = admin.site._registry.get(model)
                if admin_class:
                    mobility_admin_site.register(model, admin_class.__class__)
        except admin.sites.AlreadyRegistered:
            pass


# Llamar a la función de registro
register_all_models()
