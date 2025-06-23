# backend/payments/admin.py
import json
import logging
from typing import Any, Optional

from django.contrib import admin, messages
from django.contrib.admin import SimpleListFilter
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.http import HttpRequest, HttpResponse
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _
from utils.static_mapping import get_versioned_asset

from .models import PagoStripe, ReembolsoStripe, WebhookStripe

logger = logging.getLogger("admin_operations")

try:
    from .services import StripePaymentService, StripeWebhookService
except ImportError:
    logger.warning("Servicios de Stripe no disponibles")
    StripePaymentService = None
    StripeWebhookService = None


# ======================
# FILTROS PERSONALIZADOS
# ======================

class EstadoPagoFilter(SimpleListFilter):
    """Filtro personalizado para estados de pago"""
    title = _("Estado del Pago")
    parameter_name = "estado_pago"

    def lookups(self, request, model_admin):
        return (
            ("exitosos", _("Pagos Exitosos")),
            ("fallidos", _("Pagos Fallidos")),
            ("pendientes", _("Pagos Pendientes")),
            ("reembolsados", _("Pagos Reembolsados")),
            ("problemas", _("Con Problemas")),
        )

    def queryset(self, request, queryset):
        if self.value() == "exitosos":
            return queryset.filter(estado="COMPLETADO")
        elif self.value() == "fallidos":
            return queryset.filter(estado="FALLIDO")
        elif self.value() == "pendientes":
            return queryset.filter(estado__in=["PENDIENTE", "PROCESANDO"])
        elif self.value() == "reembolsados":
            return queryset.filter(estado__in=["REEMBOLSADO", "REEMBOLSO_PARCIAL"])
        elif self.value() == "problemas":
            return queryset.filter(
                Q(estado="FALLIDO") | 
                Q(mensaje_error__isnull=False) | 
                Q(codigo_error_stripe__isnull=False)
            )


class RangoImporteFilter(SimpleListFilter):
    """Filtro por rango de importe"""
    title = _("Rango de Importe")
    parameter_name = "rango_importe"

    def lookups(self, request, model_admin):
        return (
            ("bajo", _("Hasta 100€")),
            ("medio", _("100€ - 500€")),
            ("alto", _("500€ - 1000€")),
            ("muy_alto", _("Más de 1000€")),
        )

    def queryset(self, request, queryset):
        if self.value() == "bajo":
            return queryset.filter(importe__lte=100)
        elif self.value() == "medio":
            return queryset.filter(importe__gt=100, importe__lte=500)
        elif self.value() == "alto":
            return queryset.filter(importe__gt=500, importe__lte=1000)
        elif self.value() == "muy_alto":
            return queryset.filter(importe__gt=1000)


class FechaFilter(SimpleListFilter):
    """Filtro por fecha de creación"""
    title = _("Fecha de Creación")
    parameter_name = "fecha_creacion"

    def lookups(self, request, model_admin):
        return (
            ("hoy", _("Hoy")),
            ("semana", _("Esta semana")),
            ("mes", _("Este mes")),
            ("trimestre", _("Este trimestre")),
        )

    def queryset(self, request, queryset):
        now = timezone.now()
        if self.value() == "hoy":
            return queryset.filter(fecha_creacion__date=now.date())
        elif self.value() == "semana":
            start_week = now - timezone.timedelta(days=now.weekday())
            return queryset.filter(fecha_creacion__gte=start_week)
        elif self.value() == "mes":
            return queryset.filter(
                fecha_creacion__year=now.year,
                fecha_creacion__month=now.month
            )
        elif self.value() == "trimestre":
            quarter_start = now.replace(month=((now.month-1)//3)*3+1, day=1)
            return queryset.filter(fecha_creacion__gte=quarter_start)


# ======================
# ADMIN PRINCIPAL
# ======================

@admin.register(PagoStripe)
class PagoStripeAdmin(admin.ModelAdmin):
    """Admin avanzado para pagos de Stripe"""

    # Media para archivos CSS y JS personalizados
    class Media:
        css = {
            'all': (get_versioned_asset("css", "admin/css/custom_admin_v211d00a2.css"),)
        }
        js = (get_versioned_asset("js_payments", "admin/js/payments_admin_va2ab12d0.js"),)

    list_display = [
        "numero_pedido_link",
        "cliente_info",
        "importe_display", 
        "estado_display",
        "tipo_pago_display",
        "metodo_pago_display",
        "fecha_creacion_display",
        "reserva_display",
        "acciones_admin",
    ]

    list_filter = [
        EstadoPagoFilter,
        RangoImporteFilter,
        FechaFilter,
        "tipo_pago",
        "moneda",
        "metodo_pago",
        "marca_tarjeta",
    ]

    search_fields = [
        "numero_pedido",
        "stripe_payment_intent_id",
        "stripe_charge_id",
        "email_cliente",
        "nombre_cliente",
        "ultimos_4_digitos",
        "reserva__id",
    ]

    readonly_fields = [
        "numero_pedido",
        "stripe_payment_intent_id",
        "stripe_charge_id",
        "stripe_client_secret",
        "stripe_status",
        "stripe_metadata_display",
        "fecha_creacion",
        "fecha_actualizacion",
        "fecha_confirmacion",
        "es_exitoso_display",
        "puede_reembolsar_display",
        "importe_disponible_reembolso_display",
        "reserva_info_display",
        "datos_reserva_display",
        "estadisticas_display",
        "historial_reembolsos_display",
    ]

    fieldsets = [
        (
            "📋 Información del Pago",
            {
                "fields": [
                    "numero_pedido", 
                    ("importe", "moneda"), 
                    ("estado", "tipo_pago"),
                    "estadisticas_display"
                ],
                "classes": ["wide"]
            },
        ),
        (
            "🔗 Stripe Integration",
            {
                "fields": [
                    "stripe_payment_intent_id",
                    "stripe_charge_id",
                    ("stripe_status", "stripe_client_secret"),
                    "stripe_metadata_display",
                ],
                "classes": ["collapse", "wide"],
            },
        ),
        (
            "👤 Información del Cliente", 
            {
                "fields": [
                    ("email_cliente", "nombre_cliente")
                ],
                "classes": ["wide"]
            }
        ),
        (
            "💳 Detalles del Pago",
            {
                "fields": [
                    ("metodo_pago", "marca_tarjeta", "ultimos_4_digitos")
                ],
                "classes": ["wide"]
            },
        ),
        (
            "💰 Reembolsos",
            {
                "fields": [
                    "importe_reembolsado",
                    "puede_reembolsar_display",
                    "importe_disponible_reembolso_display",
                    "historial_reembolsos_display",
                ],
                "classes": ["wide"]
            },
        ),
        (
            "⚠️ Información de Error",
            {
                "fields": [
                    "mensaje_error", 
                    "codigo_error_stripe"
                ],
                "classes": ["collapse", "wide"],
            },
        ),
        (
            "📅 Fechas",
            {
                "fields": [
                    ("fecha_creacion", "fecha_actualizacion"),
                    ("fecha_confirmacion", "fecha_vencimiento"),
                ],
                "classes": ["wide"]
            },
        ),
        (
            "🚗 Reserva Asociada", 
            {
                "fields": [
                    "reserva", 
                    "reserva_info_display"
                ],
                "classes": ["wide"]
            }
        ),
        (
            "📄 Datos de Reserva (JSON)",
            {
                "fields": ["datos_reserva_display"], 
                "classes": ["collapse", "wide"]
            },
        ),
    ]

    ordering = ["-fecha_creacion"]
    date_hierarchy = "fecha_creacion"
    list_per_page = 25
    list_max_show_all = 100
    save_on_top = True
    actions_on_top = True
    actions_on_bottom = True

    # Filtros avanzados
    list_select_related = ["reserva", "reserva__vehiculo"]
    list_prefetch_related = ["reembolsos"]    
    # ======================
    # MÉTODOS DE DISPLAY MEJORADOS
    # ======================

    def numero_pedido_link(self, obj):
        """Muestra el número de pedido como enlace con estado visual"""
        if obj.reserva:
            try:
                url = reverse("admin:reservas_reserva_change", args=[obj.reserva.id])
                icon = "✅" if obj.es_exitoso else "⚠️" if obj.estado == "PENDIENTE" else "❌"
                return format_html(
                    '{} <a href="{}" style="font-weight: bold; color: #007bff;">{}</a>',
                    icon, url, obj.numero_pedido
                )
            except Exception:
                pass
        
        icon = "✅" if obj.es_exitoso else "⚠️" if obj.estado == "PENDIENTE" else "❌"
        return format_html('{} {}', icon, obj.numero_pedido)


    def cliente_info(self, obj):
        """Muestra información completa del cliente"""
        return format_html(
            '<div class="cliente-info">'
            '<strong style="color: #2c3e50;">{}</strong><br/>'
            '<small style="color: #7f8c8d;">{}</small>'
            '</div>',
            obj.nombre_cliente or "Sin nombre",
            obj.email_cliente,
        )


    @admin.display(description="Importe")
    def importe_display(self, obj):
        """Muestra el importe con formato avanzado y estadísticas"""
        color_map = {
            "COMPLETADO": "#27ae60",
            "FALLIDO": "#e74c3c", 
            "CANCELADO": "#95a5a6",
            "PENDIENTE": "#f39c12",
            "PROCESANDO": "#3498db",
            "REEMBOLSADO": "#9b59b6",
            "REEMBOLSO_PARCIAL": "#8e44ad"
        }
        color = color_map.get(obj.estado, "#2c3e50")
        
        reembolso_info = ""
        if obj.importe_reembolsado > 0:
            reembolso_info = format_html(
                '<br/><small style="color: #9b59b6;">Reemb: €{}</small>',
                "{}".format(float(obj.importe_reembolsado))
            )
        
        return format_html(
            '<div class="importe-display">'
            '<span style="color: {}; font-weight: bold; font-size: 14px;">€{}</span>'
            '<small style="color: #7f8c8d;"> {}</small>'
            '{}'
            '</div>',
            color, "{}".format(float(obj.importe)), obj.moneda.upper(), reembolso_info
        )


    @admin.display(description="Estado")
    def estado_display(self, obj):
        """Muestra el estado con badge visual"""
        badge_map = {
            "COMPLETADO": ("success", "✅"),
            "FALLIDO": ("danger", "❌"),
            "CANCELADO": ("secondary", "🚫"),
            "PENDIENTE": ("warning", "⏳"),
            "PROCESANDO": ("info", "🔄"),
            "REEMBOLSADO": ("purple", "💰"),
            "REEMBOLSO_PARCIAL": ("purple", "💸")
        }
        badge_class, icon = badge_map.get(obj.estado, ("dark", "❓"))
        
        return format_html(
            '<span class="badge badge-{}" style="font-size: 12px;">'
            '{} {}'
            '</span>',
            badge_class, icon, obj.get_estado_display()
        )


    @admin.display(description="Tipo Pago")
    def tipo_pago_display(self, obj):
        """Muestra el tipo de pago con íconos"""
        icon_map = {
            "INICIAL": "🏁",
            "DIFERENCIA": "📊", 
            "EXTRA": "➕",
            "PENALIZACION": "⚠️"
        }
        icon = icon_map.get(obj.tipo_pago, "💳")
        
        return format_html(
            '<span style="font-size: 12px;">{} {}</span>',
            icon, obj.get_tipo_pago_display()
        )


    @admin.display(description="Metodo Pago")
    def metodo_pago_display(self, obj):
        """Muestra información del método de pago con detalles visuales"""
        if obj.metodo_pago == "card" and obj.ultimos_4_digitos:
            marca_icons = {
                "visa": "💳",
                "mastercard": "💳", 
                "amex": "💳",
                "discover": "💳"
            }
            icon = marca_icons.get(obj.marca_tarjeta, "💳")
            
            return format_html(
                '<div class="metodo-pago">'
                '{} <strong>{}</strong><br/>'
                '<small>**** **** **** {}</small>'
                '</div>',
                icon,
                obj.marca_tarjeta.upper() if obj.marca_tarjeta else "CARD",
                obj.ultimos_4_digitos
            )
        
        return format_html(
            '<span style="color: #7f8c8d;">{}</span>',
            obj.metodo_pago or "No especificado"
        )


    @admin.display(description="Fecha Creacion")
    def fecha_creacion_display(self, obj):
        """Muestra la fecha de creación con formato relativo"""
        from django.utils.timesince import timesince
        
        return format_html(
            '<div class="fecha-display">'
            '<strong>{}</strong><br/>'
            '<small style="color: #7f8c8d;">hace {}</small>'
            '</div>',
            obj.fecha_creacion.strftime("%d/%m/%Y %H:%M"),
            timesince(obj.fecha_creacion)
        )


    @admin.display(description="Reserva")
    def reserva_display(self, obj):
        """Muestra información de la reserva asociada"""
        if obj.reserva:
            try:
                url = reverse("admin:reservas_reserva_change", args=[obj.reserva.id])
                return format_html(
                    '<a href="{}" style="color: #007bff;">'
                    'Reserva #{}</a><br/>'
                    '<small style="color: #7f8c8d;">{}</small>',
                    url,
                    obj.reserva.id,
                    obj.reserva.estado
                )
            except Exception:
                return format_html(
                    'Reserva #{}<br/>'
                    '<small style="color: #7f8c8d;">{}</small>',
                    obj.reserva.id,
                    obj.reserva.estado
                )
        return format_html('<span style="color: #95a5a6;">Sin reserva</span>')


    def acciones_admin(self, obj):
        """Muestra acciones disponibles mejoradas"""
        acciones = []

        # Acción de reembolso
        if obj.puede_reembolsar and obj.importe_disponible_reembolso > 0:
            acciones.append(
                '<a href="#" onclick="reembolsarPago({})" '
                'style="background: #9b59b6; color: white; padding: 2px 8px; '
                'border-radius: 3px; text-decoration: none; font-size: 11px;">'
                '💰 Reembolsar (€{})</a>'.format(obj.id, obj.importe_disponible_reembolso)
            )

        # Acción de sincronización
        if obj.estado in ["PENDIENTE", "PROCESANDO"]:
            acciones.append(
                '<a href="#" onclick="sincronizarPago({})" '
                'style="background: #3498db; color: white; padding: 2px 8px; '
                'border-radius: 3px; text-decoration: none; font-size: 11px;">'
                '🔄 Sincronizar</a>'.format(obj.id)
            )

        # Enlace a Stripe Dashboard
        if obj.stripe_payment_intent_id:
            stripe_url = f"https://dashboard.stripe.com/payments/{obj.stripe_payment_intent_id}"
            acciones.append(
                '<a href="{}" target="_blank" '
                'style="background: #6772e5; color: white; padding: 2px 8px; '
                'border-radius: 3px; text-decoration: none; font-size: 11px;">'
                '👁️ Stripe</a>'.format(stripe_url)
            )

        # Ver detalles JSON
        acciones.append(
            '<a href="#" onclick="verDetallesPago({})" '
            'style="background: #2c3e50; color: white; padding: 2px 8px; '
            'border-radius: 3px; text-decoration: none; font-size: 11px;">'
            '📋 Detalles</a>'.format(obj.id)
        )

        return mark_safe(
            f'<div class="acciones-pago">{"<br/>".join(acciones)}</div>'
        ) if acciones else mark_safe('<span style="color: #95a5a6;">Sin acciones</span>')


    @admin.display(description="Stripe Metadata")
    def stripe_metadata_display(self, obj):
        """Muestra los metadatos de Stripe de forma legible"""
        if obj.stripe_metadata:
            return format_html(
                "<pre style='background: #f8f9fa; padding: 8px; border-radius: 4px; font-size: 11px;'>{}</pre>", 
                json.dumps(obj.stripe_metadata, indent=2)
            )
        return format_html('<span style="color: #95a5a6;">Sin metadatos</span>')


    @admin.display(description="Estadisticas")
    def estadisticas_display(self, obj):
        """Muestra estadísticas del pago"""
        stats = []
        
        # Tiempo desde creación
        from django.utils.timesince import timesince
        stats.append(f"Creado: hace {timesince(obj.fecha_creacion)}")
        
        # Estado del pago
        if obj.fecha_confirmacion:
            tiempo_confirmacion = obj.fecha_confirmacion - obj.fecha_creacion
            stats.append(f"Confirmado en: {tiempo_confirmacion}")
        
        # Información de reembolsos
        if obj.importe_reembolsado > 0:
            porcentaje_reembolsado = (obj.importe_reembolsado / obj.importe) * 100
            stats.append(f"Reembolsado: {porcentaje_reembolsado:.1f}%")
        
        return format_html(
            '<div class="estadisticas-pago" style="font-size: 11px; color: #7f8c8d;">{}</div>',
            "<br/>".join(stats)
        )


    @admin.display(description="Historial Reembolsos")
    def historial_reembolsos_display(self, obj):
        """Muestra el historial de reembolsos"""
        reembolsos = obj.reembolsos.all()
        if not reembolsos:
            return format_html('<span style="color: #95a5a6;">Sin reembolsos</span>')
        
        html_reembolsos = []
        for reembolso in reembolsos:
            html_reembolsos.append(
                format_html(
                    '<div style="margin: 4px 0; padding: 4px; background: #f8f9fa; border-radius: 3px;">'
                    '<strong>€{}</strong> - {}<br/>'
                    '<small style="color: #7f8c8d;">{} | {}</small>'
                    '</div>',
                    reembolso.importe,
                    reembolso.get_estado_display(),
                    reembolso.get_motivo_display(),
                    reembolso.fecha_creacion.strftime("%d/%m/%Y")
                )
            )
        
        return mark_safe(''.join(html_reembolsos))



    # ======================
    # MÉTODOS DE DISPLAY RESTANTES
    # ======================

    @admin.display(description="Reserva Info")
    def reserva_info_display(self, obj):
        """Muestra información completa de la reserva asociada"""
        if not obj.reserva:
            return format_html('<span style="color: #95a5a6;">Sin reserva asociada</span>')
        
        try:
            vehiculo_info = "N/A"
            if obj.reserva.vehiculo:
                vehiculo_info = f"{obj.reserva.vehiculo.marca} {obj.reserva.vehiculo.modelo}"
            
            fechas_info = "N/A"
            if obj.reserva.fecha_recogida and obj.reserva.fecha_devolucion:
                fechas_info = f"{obj.reserva.fecha_recogida.strftime('%d/%m/%Y')} - {obj.reserva.fecha_devolucion.strftime('%d/%m/%Y')}"

            return format_html(
                '<div class="reserva-info" style="font-size: 12px;">'
                '<strong style="color: #2c3e50;">Reserva #{}</strong><br/>'
                '<span style="color: #7f8c8d;">Estado: {}</span><br/>'
                '<span style="color: #7f8c8d;">Vehículo: {}</span><br/>'
                '<span style="color: #7f8c8d;">Fechas: {}</span>'
                '</div>',
                obj.reserva.id,
                obj.reserva.estado,
                vehiculo_info,
                fechas_info
            )
        except Exception as e:
            logger.error(f"Error mostrando info de reserva {obj.reserva.id}: {e}")
            return format_html(
                '<span style="color: #e74c3c;">Error cargando reserva #{}</span>',
                obj.reserva.id
            )


    @admin.display(description="Datos Reserva")
    def datos_reserva_display(self, obj):
        """Muestra los datos de reserva de forma legible"""
        if not obj.datos_reserva:
            return format_html('<span style="color: #95a5a6;">Sin datos de reserva</span>')
        
        try:
            return format_html(
                '<pre style="background: #f8f9fa; padding: 8px; border-radius: 4px; '
                'font-size: 10px; max-height: 200px; overflow-y: auto;">{}</pre>',
                json.dumps(obj.datos_reserva, indent=2, default=str, ensure_ascii=False)
            )
        except Exception:
            return format_html('<span style="color: #e74c3c;">Error procesando JSON</span>')


    @admin.display(description="Es Exitoso")
    def es_exitoso_display(self, obj):
        """Muestra si el pago es exitoso con icono"""
        if obj.es_exitoso:
            return format_html(
                '<span style="color: #27ae60; font-weight: bold;">✓ Exitoso</span>'
            )
        return format_html(
            '<span style="color: #e74c3c; font-weight: bold;">✗ No exitoso</span>'
        )


    @admin.display(description="Puede Reembolsar")
    def puede_reembolsar_display(self, obj):
        """Muestra si el pago puede reembolsarse"""
        if obj.puede_reembolsar:
            return format_html(
                '<span style="color: #27ae60; font-weight: bold;">✓ Puede reembolsar</span>'
            )
        return format_html(
            '<span style="color: #95a5a6;">✗ No puede reembolsar</span>'
        )


    @admin.display(description="Importe Disponible Reembolso")
    def importe_disponible_reembolso_display(self, obj):
        """Muestra el importe disponible para reembolso"""
        importe = obj.importe_disponible_reembolso
        if importe > 0:
            return format_html(
                '<span style="color: #27ae60; font-weight: bold; font-size: 14px;">€{}</span>',
                importe
            )
        return format_html('<span style="color: #95a5a6;">€0.00</span>')


    # ======================
    # ACCIONES ADMINISTRATIVAS
    # ======================

    @admin.action(description="🔄 Sincronizar pagos seleccionados con Stripe")
    def sincronizar_con_stripe(self, request, queryset):
        """Sincroniza pagos seleccionados con Stripe"""
        if not StripePaymentService:
            self.message_user(
                request, 
                "Error: Servicio de Stripe no disponible", 
                level=messages.ERROR
            )
            return
        
        service = StripePaymentService()
        actualizados = 0
        errores = 0

        with transaction.atomic():
            for pago in queryset:
                try:
                    if hasattr(service, '_sincronizar_pago_con_stripe'):
                        resultado = service._sincronizar_pago_con_stripe(pago)
                        if resultado:
                            actualizados += 1
                        else:
                            errores += 1
                    else:
                        logger.warning("Método _sincronizar_pago_con_stripe no encontrado")
                        errores += 1
                except Exception as e:
                    logger.error(f"Error sincronizando pago {pago.numero_pedido}: {e}")
                    errores += 1

        if actualizados > 0:
            self.message_user(
                request, 
                f"✅ {actualizados} pagos sincronizados exitosamente.", 
                level=messages.SUCCESS
            )
        
        if errores > 0:
            self.message_user(
                request, 
                f"⚠️ {errores} pagos no pudieron sincronizarse. Revisa los logs.",
                level=messages.WARNING
            )

    @admin.action(description="💰 Crear reembolsos para pagos completados")
    def crear_reembolso_parcial(self, request, queryset):
        """Crea reembolsos parciales para pagos seleccionados"""
        pagos_elegibles = queryset.filter(
            estado="COMPLETADO",
            importe_disponible_reembolso__gt=0
        )
        
        if not pagos_elegibles.exists():
            self.message_user(
                request,
                "❌ No hay pagos elegibles para reembolso (deben estar completados y tener saldo disponible).",
                level=messages.WARNING
            )
            return
        
        # Aquí se implementaría la lógica de reembolso
        # Por ahora solo mostrar información
        total_disponible = sum(p.importe_disponible_reembolso for p in pagos_elegibles)
        
        self.message_user(
            request,
            f"📊 {pagos_elegibles.count()} pagos elegibles para reembolso. "
            f"Total disponible: €{total_disponible:.2f}. "
            f"Usa el panel individual para procesar reembolsos.",
            level=messages.INFO
        )

    @admin.action(description="📊 Generar reporte de pagos")
    def generar_reporte_pagos(self, request, queryset):
        """Genera un reporte estadístico de los pagos seleccionados"""
        stats = {
            'total_pagos': queryset.count(),
            'pagos_exitosos': queryset.filter(estado="COMPLETADO").count(),
            'pagos_fallidos': queryset.filter(estado="FALLIDO").count(),
            'pagos_pendientes': queryset.filter(estado__in=["PENDIENTE", "PROCESANDO"]).count(),
            'importe_total': queryset.aggregate(Sum('importe'))['importe__sum'] or 0,
            'importe_exitoso': queryset.filter(estado="COMPLETADO").aggregate(Sum('importe'))['importe__sum'] or 0,
            'importe_reembolsado': queryset.aggregate(Sum('importe_reembolsado'))['importe_reembolsado__sum'] or 0,
        }
        
        # Calcular estadísticas por tipo de pago
        tipos_pago = queryset.values('tipo_pago').annotate(
            count=Count('id'),
            total=Sum('importe')
        ).order_by('-total')
        
        mensaje_stats = (
            f"📊 REPORTE DE PAGOS:\n"
            f"• Total pagos: {stats['total_pagos']}\n"
            f"• Exitosos: {stats['pagos_exitosos']} ({(stats['pagos_exitosos']/stats['total_pagos']*100):.1f}%)\n"
            f"• Fallidos: {stats['pagos_fallidos']}\n" 
            f"• Pendientes: {stats['pagos_pendientes']}\n"
            f"• Importe total: €{stats['importe_total']:.2f}\n"
            f"• Importe exitoso: €{stats['importe_exitoso']:.2f}\n"
            f"• Importe reembolsado: €{stats['importe_reembolsado']:.2f}\n"
        )
        
        if tipos_pago:
            mensaje_stats += "\n📈 POR TIPO DE PAGO:\n"
            for tipo in tipos_pago:
                mensaje_stats += f"• {tipo['tipo_pago']}: {tipo['count']} pagos, €{tipo['total']:.2f}\n"
        
        self.message_user(
            request,
            mensaje_stats,
            level=messages.INFO
        )

    @admin.action(description="🧹 Limpiar pagos fallidos antiguos")
    def limpiar_pagos_fallidos(self, request, queryset):
        """Marca como cancelados los pagos fallidos antiguos"""
        from datetime import timedelta
        
        fecha_limite = timezone.now() - timedelta(days=30)
        pagos_antiguos = queryset.filter(
            estado="FALLIDO",
            fecha_creacion__lt=fecha_limite
        )
        
        if not pagos_antiguos.exists():
            self.message_user(
                request,
                "ℹ️ No hay pagos fallidos antiguos (más de 30 días) para limpiar.",
                level=messages.INFO
            )
            return
        
        count = pagos_antiguos.update(estado="CANCELADO")
        
        self.message_user(
            request,
            f"🧹 {count} pagos fallidos antiguos marcados como cancelados.",
            level=messages.SUCCESS
        )

    # Configurar acciones
    actions = [
        "sincronizar_con_stripe",
        "crear_reembolso_parcial", 
        "generar_reporte_pagos",
        "limpiar_pagos_fallidos"
    ]

    # ======================
    # MÉTODOS DE OPTIMIZACIÓN
    # ======================

    def get_queryset(self, request):
        """Optimiza las consultas incluyendo relaciones"""
        return (
            super().get_queryset(request)
            .select_related("reserva", "reserva__vehiculo")
            .prefetch_related("reembolsos")
        )

    def get_search_results(self, request, queryset, search_term):
        """Mejora la búsqueda incluyendo campos relacionados"""
        queryset, may_have_duplicates = super().get_search_results(
            request, queryset, search_term
        )
        
        # Búsqueda adicional en campos de reserva
        if search_term:
            queryset |= self.model.objects.filter(
                Q(reserva__id__icontains=search_term) |
                Q(reserva__vehiculo__marca__icontains=search_term) |
                Q(reserva__vehiculo__modelo__icontains=search_term)
            )
            may_have_duplicates = True
        
        return queryset, may_have_duplicates

    def changelist_view(self, request, extra_context=None):
        """Agrega contexto adicional a la vista de lista"""
        extra_context = extra_context or {}
        
        # Agregar estadísticas generales
        queryset = self.get_queryset(request)
        extra_context['total_pagos'] = queryset.count()
        extra_context['pagos_hoy'] = queryset.filter(
            fecha_creacion__date=timezone.now().date()
        ).count()
        extra_context['importe_total'] = queryset.aggregate(
            Sum('importe')
        )['importe__sum'] or 0
        
        return super().changelist_view(request, extra_context)

# ======================
# ADMIN REEMBOLSOS 
# ======================

@admin.register(ReembolsoStripe)
class ReembolsoStripeAdmin(admin.ModelAdmin):
    """Admin avanzado para reembolsos de Stripe"""

    # Media para archivos CSS y JS personalizados
    class Media:
        css = {
            'all': ("admin/css/custom_admin_v211d00a2.css",)
        }
        js = ('admin/js/payments_admin.js',)

    list_display = [
        "refund_id_display",
        "pago_relacionado_display",
        "importe_display", 
        "motivo_display",
        "estado_display",
        "fecha_creacion_display",
        "tiempo_procesamiento_display",
        "acciones_display",
    ]

    list_filter = [
        "motivo", 
        "estado", 
        "fecha_creacion", 
        "fecha_procesamiento",
        "pago_stripe__tipo_pago",
        "pago_stripe__estado",
    ]

    search_fields = [
        "stripe_refund_id",
        "pago_stripe__numero_pedido",
        "pago_stripe__email_cliente",
        "pago_stripe__nombre_cliente",
        "descripcion",
    ]

    readonly_fields = [
        "stripe_refund_id",
        "stripe_status",
        "stripe_failure_reason",
        "fecha_creacion",
        "fecha_procesamiento",
        "pago_info_display",
        "resumen_display",
    ]

    fieldsets = [
        (
            "💰 Información del Reembolso",
            {
                "fields": [
                    "pago_stripe",
                    ("importe", "motivo", "estado"),
                    "resumen_display"
                ],
                "classes": ["wide"]
            },
        ),
        (
            "📝 Descripción y Motivo",
            {
                "fields": ["descripcion"],
                "classes": ["wide"]
            }
        ),
        (
            "🔗 Información de Stripe",
            {
                "fields": [
                    "stripe_refund_id",
                    ("stripe_status", "stripe_failure_reason")
                ],
                "classes": ["wide"]
            },
        ),
        (
            "📅 Fechas",
            {
                "fields": [
                    ("fecha_creacion", "fecha_procesamiento")
                ],
                "classes": ["wide"]
            },
        ),
        (
            "🔗 Información del Pago Original",
            {
                "fields": ["pago_info_display"],
                "classes": ["collapse", "wide"]
            },
        ),
    ]

    ordering = ["-fecha_creacion"]
    date_hierarchy = "fecha_creacion"
    list_per_page = 25
    save_on_top = True
    actions_on_top = True
    actions_on_bottom = True

    # Métodos de display personalizados
    @admin.display(description="Refund Id")
    def refund_id_display(self, obj):
        """Muestra el ID de reembolso con enlace a Stripe"""
        if obj.stripe_refund_id:
            stripe_url = f"https://dashboard.stripe.com/payments/{obj.pago_stripe.stripe_payment_intent_id}"
            return format_html(
                '🔗 <a href="{}" target="_blank" style="font-family: monospace; color: #6772e5;">{}</a>',
                stripe_url,
                obj.stripe_refund_id
            )
        return format_html(
            '<span style="color: #95a5a6;">Sin ID de Stripe</span>'
        )


    @admin.display(description="Pago Relacionado")
    def pago_relacionado_display(self, obj):
        """Muestra información del pago relacionado"""
        try:
            url = reverse("admin:payments_pagostripe_change", args=[obj.pago_stripe.id])
            return format_html(
                '<div class="pago-relacionado">'
                '<a href="{}" style="font-weight: bold; color: #007bff;">📋 {}</a><br/>'
                '<small style="color: #7f8c8d;">{}</small><br/>'
                '<small style="color: #7f8c8d;">€{} | {}</small>'
                '</div>',
                url,
                obj.pago_stripe.numero_pedido,
                obj.pago_stripe.email_cliente,
                obj.pago_stripe.importe,
                obj.pago_stripe.get_estado_display()
            )
        except Exception:
            return format_html(
                '<span style="color: #e74c3c;">Error cargando pago</span>'
            )


    @admin.display(description="Importe")
    def importe_display(self, obj):
        """Muestra el importe del reembolso con formato"""
        return format_html(
            '<span style="color: #9b59b6; font-weight: bold; font-size: 14px;">€{}</span>',
            obj.importe
        )


    @admin.display(description="Motivo")
    def motivo_display(self, obj):
        """Muestra el motivo con íconos"""
        icon_map = {
            "CANCELACION_CLIENTE": "👤",
            "CANCELACION_EMPRESA": "🏢",
            "MODIFICACION_RESERVA": "✏️",
            "ERROR_PAGO": "⚠️",
            "FRAUDE": "🚨",
            "OTRO": "❓"
        }
        icon = icon_map.get(obj.motivo, "💰")
        
        return format_html(
            '<span style="font-size: 12px;">{} {}</span>',
            icon, obj.get_motivo_display()
        )


    @admin.display(description="Estado")
    def estado_display(self, obj):
        """Muestra el estado con colores y badges"""
        badge_map = {
            "COMPLETADO": ("success", "✅"),
            "FALLIDO": ("danger", "❌"),
            "CANCELADO": ("secondary", "🚫"),
            "PENDIENTE": ("warning", "⏳"),
            "PROCESANDO": ("info", "🔄"),
        }
        badge_class, icon = badge_map.get(obj.estado, ("dark", "❓"))
        
        return format_html(
            '<span class="badge badge-{}" style="font-size: 12px;">'
            '{} {}'
            '</span>',
            badge_class, icon, obj.get_estado_display()
        )


    @admin.display(description="Fecha Creacion")
    def fecha_creacion_display(self, obj):
        """Muestra la fecha de creación con tiempo relativo"""
        from django.utils.timesince import timesince
        
        return format_html(
            '<div class="fecha-display">'
            '<strong>{}</strong><br/>'
            '<small style="color: #7f8c8d;">hace {}</small>'
            '</div>',
            obj.fecha_creacion.strftime("%d/%m/%Y %H:%M"),
            timesince(obj.fecha_creacion)
        )


    @admin.display(description="Tiempo Procesamiento")
    def tiempo_procesamiento_display(self, obj):
        """Muestra el tiempo de procesamiento"""
        if obj.fecha_procesamiento:
            tiempo_procesamiento = obj.fecha_procesamiento - obj.fecha_creacion
            return format_html(
                '<span style="color: #27ae60; font-weight: bold;">{}</span>',
                str(tiempo_procesamiento).split('.')[0]  # Remover microsegundos
            )
        elif obj.estado == "PROCESANDO":
            return format_html(
                '<span style="color: #f39c12;">🔄 Procesando...</span>'
            )
        else:
            return format_html(
                '<span style="color: #95a5a6;">Pendiente</span>'
            )


    @admin.display(description="Acciones")
    def acciones_display(self, obj):
        """Muestra acciones disponibles"""
        acciones = []
        
        # Enlace a Stripe
        if obj.stripe_refund_id:
            stripe_url = f"https://dashboard.stripe.com/payments/{obj.pago_stripe.stripe_payment_intent_id}"
            acciones.append(
                format_html(
                    '<a href="{}" target="_blank" '
                    'style="background: #6772e5; color: white; padding: 2px 6px; '
                    'border-radius: 3px; text-decoration: none; font-size: 10px;">'
                    '👁️ Stripe</a>',
                    stripe_url
                )
            )
        
        # Reintento si falló
        if obj.estado == "FALLIDO":
            acciones.append(
                format_html(
                    '<a href="#" class="btn-retry-refund" data-refund-id="{}" '
                    'style="background: #e74c3c; color: white; padding: 2px 6px; '
                    'border-radius: 3px; text-decoration: none; font-size: 10px;">'
                    '🔄 Reintentar</a>',
                    obj.id
                )
            )
        
        return format_html(
            '<div class="acciones-reembolso">{}</div>',
            "<br/>".join(acciones)
        ) if acciones else format_html('<span style="color: #95a5a6;">Sin acciones</span>')


    @admin.display(description="Pago Info")
    def pago_info_display(self, obj):
        """Muestra información detallada del pago original"""
        pago = obj.pago_stripe
        return format_html(
            '<div class="pago-info" style="font-size: 12px;">'
            '<strong>Número de Pedido:</strong> {}<br/>'
            '<strong>Cliente:</strong> {} ({})<br/>'
            '<strong>Importe Original:</strong> €{}<br/>'
            '<strong>Estado:</strong> {}<br/>'
            '<strong>Fecha:</strong> {}<br/>'
            '<strong>Tipo:</strong> {}'
            '</div>',
            pago.numero_pedido,
            pago.nombre_cliente,
            pago.email_cliente,
            pago.importe,
            pago.get_estado_display(),
            pago.fecha_creacion.strftime("%d/%m/%Y %H:%M"),
            pago.get_tipo_pago_display()
        )


    @admin.display(description="Resumen")
    def resumen_display(self, obj):
        """Muestra un resumen del reembolso"""
        porcentaje = (obj.importe / obj.pago_stripe.importe) * 100
        
        return format_html(
            '<div class="resumen-reembolso" style="background: #f8f9fa; padding: 8px; border-radius: 4px;">'
            '<strong>Porcentaje del pago original:</strong> {}%<br/>'
            '<strong>Importe disponible restante:</strong> €{}<br/>'
            '<strong>Stripe ID:</strong> {}'
            '</div>',
            porcentaje,
            obj.pago_stripe.importe_disponible_reembolso,
            obj.stripe_refund_id or "Pendiente"
        )


    # Acciones administrativas
    @admin.action(description="🔄 Reprocesar reembolsos fallidos")
    def reprocesar_reembolsos_fallidos(self, request, queryset):
        """Reprocesa reembolsos que fallaron"""
        reembolsos_fallidos = queryset.filter(estado="FALLIDO")
        
        if not reembolsos_fallidos.exists():
            self.message_user(
                request,
                "ℹ️ No hay reembolsos fallidos en la selección.",
                level=messages.INFO
            )
            return
        
        # Aquí se implementaría la lógica de reprocesamiento
        count = reembolsos_fallidos.count()
        self.message_user(
            request,
            f"📊 Se encontraron {count} reembolsos fallidos. "
            f"Implementar lógica de reprocesamiento con Stripe API.",
            level=messages.WARNING
        )

    actions = ["reprocesar_reembolsos_fallidos"]

    def get_queryset(self, request):
        """Optimiza consultas"""
        return super().get_queryset(request).select_related("pago_stripe")


# ======================
# ADMIN WEBHOOKS
# ======================

@admin.register(WebhookStripe)
class WebhookStripeAdmin(admin.ModelAdmin):
    """Admin avanzado para webhooks de Stripe"""

    # Media para archivos CSS y JS personalizados
    class Media:
        css = {
            'all': ("admin/css/custom_admin_v211d00a2.css",)
        }
        js = ('admin/js/payments_admin.js',)

    list_display = [
        "event_id_display",
        "tipo_evento_display", 
        "procesado_display",
        "intentos_display",
        "fecha_recepcion_display",
        "tiempo_procesamiento_display",
        "acciones_display",
    ]

    list_filter = [
        "tipo_evento",
        "procesado",
        "fecha_recepcion",
        "intentos_procesamiento",
    ]

    search_fields = [
        "stripe_event_id", 
        "tipo_evento", 
        "mensaje_error"
    ]

    readonly_fields = [
        "stripe_event_id",
        "tipo_evento",
        "datos_evento_display",
        "fecha_recepcion",
        "fecha_procesamiento",
        "estadisticas_display",
        "resumen_procesamiento_display",
    ]

    fieldsets = [
        (
            "📡 Información del Webhook",
            {
                "fields": [
                    ("stripe_event_id", "tipo_evento"),
                    "procesado",
                    "estadisticas_display"
                ],
                "classes": ["wide"]
            },
        ),
        (
            "🔄 Procesamiento",
            {
                "fields": [
                    ("intentos_procesamiento", "mensaje_error"),
                    "resumen_procesamiento_display"
                ],
                "classes": ["wide"]
            }
        ),
        (
            "📅 Fechas",
            {
                "fields": [
                    ("fecha_recepcion", "fecha_procesamiento")
                ],
                "classes": ["wide"]
            },
        ),
        (
            "📄 Datos del Evento (JSON)",
            {
                "fields": ["datos_evento_display"],
                "classes": ["collapse", "wide"]
            },
        ),
    ]

    ordering = ["-fecha_recepcion"]
    date_hierarchy = "fecha_recepcion"
    list_per_page = 25
    save_on_top = True
    actions_on_top = True
    actions_on_bottom = True

    # Métodos de display personalizados
    @admin.display(description="Event Id")
    def event_id_display(self, obj):
        """Muestra el ID del evento con enlace a Stripe"""
        if obj.stripe_event_id:
            stripe_url = f"https://dashboard.stripe.com/events/{obj.stripe_event_id}"
            return format_html(
                '🔗 <a href="{}" target="_blank" style="font-family: monospace; color: #6772e5;">{}</a>',
                stripe_url,
                obj.stripe_event_id[:20] + "..." if len(obj.stripe_event_id) > 20 else obj.stripe_event_id
            )
        return format_html('<span style="color: #95a5a6;">Sin ID</span>')


    @admin.display(description="Tipo Evento")
    def tipo_evento_display(self, obj):
        """Muestra el tipo de evento con íconos"""
        icon_map = {
            "payment_intent.succeeded": "✅",
            "payment_intent.payment_failed": "❌",
            "payment_intent.canceled": "🚫",
            "charge.succeeded": "💳",
            "charge.failed": "⚠️",
            "invoice.payment_succeeded": "📄",
            "customer.created": "👤",
            "refund.created": "💰",
        }
        
        # Obtener ícono específico o genérico basado en el tipo
        icon = icon_map.get(obj.tipo_evento, "📡")
        if not icon and obj.tipo_evento:
            if "succeeded" in obj.tipo_evento:
                icon = "✅"
            elif "failed" in obj.tipo_evento:
                icon = "❌"
            elif "canceled" in obj.tipo_evento:
                icon = "🚫"
            else:
                icon = "📡"
        
        return format_html(
            '<span style="font-size: 12px;">{} {}</span>',
            icon, obj.tipo_evento
        )


    @admin.display(description="Procesado")
    def procesado_display(self, obj):
        """Muestra el estado de procesamiento con badges"""
        if obj.procesado:
            return format_html(
                '<span class="badge badge-success" style="font-size: 11px;">✅ Procesado</span>'
            )
        elif obj.intentos_procesamiento > 0:
            return format_html(
                '<span class="badge badge-warning" style="font-size: 11px;">⚠️ {} intentos</span>',
                obj.intentos_procesamiento
            )
        else:
            return format_html(
                '<span class="badge badge-danger" style="font-size: 11px;">✗ Pendiente</span>'
            )


    @admin.display(description="Intentos")
    def intentos_display(self, obj):
        """Muestra los intentos de procesamiento"""
        if obj.intentos_procesamiento == 0:
            return format_html('<span style="color: #95a5a6;">0</span>')
        elif obj.intentos_procesamiento <= 3:
            return format_html(
                '<span style="color: #f39c12; font-weight: bold;">{}</span>',
                obj.intentos_procesamiento
            )
        else:
            return format_html(
                '<span style="color: #e74c3c; font-weight: bold;">🚨 {}</span>',
                obj.intentos_procesamiento
            )


    @admin.display(description="Fecha Recepcion")
    def fecha_recepcion_display(self, obj):
        """Muestra la fecha de recepción con tiempo relativo"""
        from django.utils.timesince import timesince
        
        return format_html(
            '<div class="fecha-display">'
            '<strong>{}</strong><br/>'
            '<small style="color: #7f8c8d;">hace {}</small>'
            '</div>',
            obj.fecha_recepcion.strftime("%d/%m/%Y %H:%M"),
            timesince(obj.fecha_recepcion)
        )


    @admin.display(description="Tiempo Procesamiento")
    def tiempo_procesamiento_display(self, obj):
        """Muestra el tiempo de procesamiento"""
        if obj.fecha_procesamiento:
            tiempo_procesamiento = obj.fecha_procesamiento - obj.fecha_recepcion
            return format_html(
                '<span style="color: #27ae60; font-weight: bold;">{}</span>',
                str(tiempo_procesamiento).split('.')[0]  # Remover microsegundos
            )
        elif obj.procesado:
            return format_html('<span style="color: #27ae60;">✅ Inmediato</span>')
        else:
            return format_html('<span style="color: #95a5a6;">Pendiente</span>')


    @admin.display(description="Acciones")
    def acciones_display(self, obj):
        """Muestra acciones disponibles"""
        acciones = []
        
        # Enlace a Stripe Dashboard
        if obj.stripe_event_id:
            stripe_url = f"https://dashboard.stripe.com/events/{obj.stripe_event_id}"
            acciones.append(
                format_html(
                    '<a href="{}" target="_blank" '
                    'style="background: #6772e5; color: white; padding: 2px 6px; '
                    'border-radius: 3px; text-decoration: none; font-size: 10px;">'
                    '👁️ Stripe</a>',
                    stripe_url
                )
            )
        
        # Botón de reprocesar
        if not obj.procesado:
            acciones.append(
                format_html(
                    '<a href="#" class="btn-reprocess-webhook" data-webhook-id="{}" '
                    'style="background: #3498db; color: white; padding: 2px 6px; '
                    'border-radius: 3px; text-decoration: none; font-size: 10px;">'
                    '🔄 Reprocesar</a>',
                    obj.id
                )
            )
        
        # Ver JSON de datos
        acciones.append(
            format_html(
                '<a href="#" class="btn-view-json" data-webhook-id="{}" '
                'style="background: #2c3e50; color: white; padding: 2px 6px; '
                'border-radius: 3px; text-decoration: none; font-size: 10px;">'
                '📋 JSON</a>',
                obj.id
            )
        )
        
        return format_html(
            '<div class="acciones-webhook">{}</div>',
            "<br/>".join(acciones)
        )


    @admin.display(description="Datos Evento")
    def datos_evento_display(self, obj):
        """Muestra los datos del evento de forma legible"""
        if not obj.datos_evento:
            return format_html('<span style="color: #95a5a6;">Sin datos del evento</span>')
        
        try:
            return format_html(
                '<pre style="background: #f8f9fa; padding: 8px; border-radius: 4px; '
                'font-size: 10px; max-height: 300px; overflow-y: auto;">{}</pre>',
                json.dumps(obj.datos_evento, indent=2, ensure_ascii=False)
            )
        except Exception:
            return format_html('<span style="color: #e74c3c;">Error procesando JSON</span>')


    @admin.display(description="Estadisticas")
    def estadisticas_display(self, obj):
        """Muestra estadísticas del webhook"""
        from django.utils.timesince import timesince
        
        stats = []
        stats.append(f"Recibido: hace {timesince(obj.fecha_recepcion)}")
        
        if obj.fecha_procesamiento:
            tiempo_proc = obj.fecha_procesamiento - obj.fecha_recepcion
            stats.append(f"Procesado en: {tiempo_proc}")
        
        if obj.intentos_procesamiento > 0:
            stats.append(f"Intentos: {obj.intentos_procesamiento}")
        
        return format_html(
            '<div class="estadisticas-webhook" style="font-size: 11px; color: #7f8c8d;">{}</div>',
            "<br/>".join(stats)
        )


    @admin.display(description="Resumen Procesamiento")
    def resumen_procesamiento_display(self, obj):
        """Muestra un resumen del procesamiento"""
        if obj.procesado:
            status_color = "#27ae60"
            status_text = "✅ Procesado exitosamente"
        elif obj.intentos_procesamiento > 0:
            status_color = "#f39c12"
            status_text = f"⚠️ {obj.intentos_procesamiento} intentos fallidos"
        else:
            status_color = "#95a5a6"
            status_text = "⏳ Pendiente de procesamiento"
        
        return format_html(
            '<div class="resumen-procesamiento" style="background: #f8f9fa; padding: 8px; border-radius: 4px;">'
            '<div style="color: {}; font-weight: bold; margin-bottom: 4px;">{}</div>'
            '{}',
            status_color,
            status_text,
            format_html(
            '<div style="color: #e74c3c; font-size: 11px;"><strong>Error:</strong> {}</div>',
            obj.mensaje_error
            ) if obj.mensaje_error else ''
        ) + format_html('</div>')


    # Acciones administrativas
    @admin.action(description="🔄 Reprocesar webhooks seleccionados")
    def reprocesar_webhooks(self, request, queryset):
        """Reprocesa webhooks seleccionados"""
        if not StripeWebhookService:
            self.message_user(
                request,
                "Error: Servicio de webhooks de Stripe no disponible",
                level=messages.ERROR
            )
            return
        
        webhooks_pendientes = queryset.filter(procesado=False)
        
        if not webhooks_pendientes.exists():
            self.message_user(
                request,
                "ℹ️ No hay webhooks pendientes en la selección.",
                level=messages.INFO
            )
            return

        service = StripeWebhookService()
        procesados = 0
        errores = 0

        for webhook in webhooks_pendientes:
            try:
                # Simular el procesamiento del webhook
                evento = webhook.datos_evento
                if hasattr(service, '_procesar_evento'):
                    resultado = service._procesar_evento(evento, webhook)
                    
                    if resultado and resultado.get("success"):
                        webhook.procesado = True
                        webhook.fecha_procesamiento = timezone.now()
                        webhook.save()
                        procesados += 1
                    else:
                        webhook.intentos_procesamiento += 1
                        webhook.mensaje_error = resultado.get("error", "Error desconocido")
                        webhook.save()
                        errores += 1
                else:
                    webhook.intentos_procesamiento += 1
                    webhook.mensaje_error = "Método _procesar_evento no encontrado"
                    webhook.save()
                    errores += 1

            except Exception as e:
                webhook.mensaje_error = str(e)
                webhook.intentos_procesamiento += 1
                webhook.save()
                errores += 1
                logger.error(f"Error reprocesando webhook {webhook.stripe_event_id}: {e}")

        if procesados > 0:
            self.message_user(
                request,
                f"✅ {procesados} webhooks reprocesados exitosamente.",
                level=messages.SUCCESS
            )
        
        if errores > 0:
            self.message_user(
                request,
                f"⚠️ {errores} webhooks fallaron al reprocesar. Revisa los logs.",
                level=messages.WARNING
            )

    @admin.action(description="🧹 Limpiar webhooks procesados antiguos")
    def limpiar_webhooks_antiguos(self, request, queryset):
        """Elimina webhooks procesados antiguos"""
        from datetime import timedelta
        
        fecha_limite = timezone.now() - timedelta(days=90)
        webhooks_antiguos = queryset.filter(
            procesado=True,
            fecha_recepcion__lt=fecha_limite
        )
        
        if not webhooks_antiguos.exists():
            self.message_user(
                request,
                "ℹ️ No hay webhooks procesados antiguos (más de 90 días) para limpiar.",
                level=messages.INFO
            )
            return
        
        count = webhooks_antiguos.count()
        webhooks_antiguos.delete()
        
        self.message_user(
            request,
            f"🧹 {count} webhooks procesados antiguos eliminados.",
            level=messages.SUCCESS
        )

    @admin.action(description="📊 Generar reporte de webhooks")
    def generar_reporte_webhooks(self, request, queryset):
        """Genera un reporte estadístico de los webhooks seleccionados"""
        stats = {
            'total_webhooks': queryset.count(),
            'procesados': queryset.filter(procesado=True).count(),
            'pendientes': queryset.filter(procesado=False).count(),
            'con_errores': queryset.filter(intentos_procesamiento__gt=0, procesado=False).count(),
        }
        
        # Estadísticas por tipo de evento
        tipos_evento = queryset.values('tipo_evento').annotate(
            count=Count('id')
        ).order_by('-count')
        
        mensaje_stats = (
            f"📊 REPORTE DE WEBHOOKS:\n"
            f"• Total webhooks: {stats['total_webhooks']}\n"
            f"• Procesados: {stats['procesados']} "
            f"({(stats['procesados']/stats['total_webhooks']*100):.1f}%)\n"
            f"• Pendientes: {stats['pendientes']}\n"
            f"• Con errores: {stats['con_errores']}\n"
        )
        
        if tipos_evento:
            mensaje_stats += "\n📈 TIPOS DE EVENTO MÁS FRECUENTES:\n"
            for tipo in tipos_evento[:5]:  # Top 5
                mensaje_stats += f"• {tipo['tipo_evento']}: {tipo['count']} webhooks\n"
        
        self.message_user(
            request,
            mensaje_stats,
            level=messages.INFO
        )

    actions = [
        "reprocesar_webhooks",
        "limpiar_webhooks_antiguos",
        "generar_reporte_webhooks"
    ]

    def get_queryset(self, request):
        """Optimiza las consultas"""
        return super().get_queryset(request)

    def changelist_view(self, request, extra_context=None):
        """Agrega contexto adicional a la vista de lista"""
        extra_context = extra_context or {}
        
        # Agregar estadísticas generales
        queryset = self.get_queryset(request)
        extra_context['total_webhooks'] = queryset.count()
        extra_context['webhooks_hoy'] = queryset.filter(
            fecha_recepcion__date=timezone.now().date()
        ).count()
        extra_context['webhooks_pendientes'] = queryset.filter(
            procesado=False
        ).count()
        
        return super().changelist_view(request, extra_context)


# ======================
# PERSONALIZACIÓN DEL ADMIN SITE
# ======================

# Personalización del admin site para payments
admin.site.site_header = "Mobility4You - Sistema de Pagos"
admin.site.site_title = "Mobility4You Payments"
admin.site.index_title = "Panel de Administración de Pagos"

