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

    def each_context(self, request):
        """
        Agregar contexto adicional para todos los templates del admin
        """
        context = super().each_context(request)
        from utils.static_mapping import get_versioned_asset
        
        context.update({
            'custom_css': get_versioned_asset("css", "admin/css/custom_admin_v78b65000.css"),
            'logo_url': "admin/img/logo_home_horizontal.png",
            'site_logo_title': _("Mobility4You"),
        })
        return context

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

# Importar y registrar todos los admin classes manualmente
from comunicacion.admin import ContactoAdmin, ContenidoAdmin
from comunicacion.models import Contacto, Contenido
from facturas_contratos.admin import ContratoAdmin, FacturaAdmin
from facturas_contratos.models import Contrato, Factura
from lugares.admin import DireccionAdmin, LugarAdmin
from lugares.models import Direccion, Lugar
from payments.admin import (PagoStripeAdmin, ReembolsoStripeAdmin,
                            WebhookStripeAdmin)
from payments.models import PagoStripe, ReembolsoStripe, WebhookStripe
from politicas.admin import (PoliticaIncluyeAdmin, PoliticaPagoAdmin,
                             PoliticaPenalizacionAdmin, PromocionAdmin,
                             TipoPenalizacionAdmin)
from politicas.models import (PoliticaIncluye, PoliticaPago,
                              PoliticaPenalizacion, Promocion,
                              TipoPenalizacion)
from reservas.admin import (ExtrasAdmin, PenalizacionAdmin, ReservaAdmin,
                            ReservaConductorAdmin, ReservaExtraAdmin)
from reservas.models import (Extras, Penalizacion, Reserva, ReservaConductor,
                             ReservaExtra)
from usuarios.admin import UsuarioAdmin
from usuarios.models import Usuario
from vehiculos.admin import (CategoriaAdmin, GrupoCocheAdmin,
                             ImagenVehiculoAdmin, MantenimientoAdmin,
                             TarifaVehiculoAdmin, VehiculoAdmin)
from vehiculos.models import (Categoria, GrupoCoche, ImagenVehiculo,
                              Mantenimiento, TarifaVehiculo, Vehiculo)

# Registrar todos los modelos en nuestro admin personalizado
mobility_admin_site.register(Usuario, UsuarioAdmin)
mobility_admin_site.register(Direccion, DireccionAdmin)
mobility_admin_site.register(Lugar, LugarAdmin)
mobility_admin_site.register(Categoria, CategoriaAdmin)
mobility_admin_site.register(GrupoCoche, GrupoCocheAdmin)
mobility_admin_site.register(Vehiculo, VehiculoAdmin)
mobility_admin_site.register(ImagenVehiculo, ImagenVehiculoAdmin)
mobility_admin_site.register(TarifaVehiculo, TarifaVehiculoAdmin)
mobility_admin_site.register(Mantenimiento, MantenimientoAdmin)
mobility_admin_site.register(Reserva, ReservaAdmin)
mobility_admin_site.register(ReservaConductor, ReservaConductorAdmin)
mobility_admin_site.register(Penalizacion, PenalizacionAdmin)
mobility_admin_site.register(Extras, ExtrasAdmin)
mobility_admin_site.register(ReservaExtra, ReservaExtraAdmin)
mobility_admin_site.register(PoliticaPago, PoliticaPagoAdmin)
mobility_admin_site.register(PoliticaIncluye, PoliticaIncluyeAdmin)
mobility_admin_site.register(TipoPenalizacion, TipoPenalizacionAdmin)
mobility_admin_site.register(PoliticaPenalizacion, PoliticaPenalizacionAdmin)
mobility_admin_site.register(Promocion, PromocionAdmin)
mobility_admin_site.register(Contrato, ContratoAdmin)
mobility_admin_site.register(Factura, FacturaAdmin)
mobility_admin_site.register(Contenido, ContenidoAdmin)
mobility_admin_site.register(Contacto, ContactoAdmin)
mobility_admin_site.register(PagoStripe, PagoStripeAdmin)
mobility_admin_site.register(ReembolsoStripe, ReembolsoStripeAdmin)
mobility_admin_site.register(WebhookStripe, WebhookStripeAdmin)
