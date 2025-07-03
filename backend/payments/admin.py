# backend/payments/admin.py
"""
Administración de Django para la aplicación de pagos con Stripe - Versión Simplificada
"""
import json
import logging
from typing import Any, Optional

from django.contrib import admin, messages
from django.contrib.admin import SimpleListFilter
from django.db import transaction
from django.utils import timezone
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

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
        return queryset


class TipoPagoFilter(SimpleListFilter):
    """Filtro por tipo de pago"""
    title = _("Tipo de Pago")
    parameter_name = "tipo_pago"

    def lookups(self, request, model_admin):
        return PagoStripe.TIPO_PAGO_CHOICES

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(tipo_pago=self.value())
        return queryset


# ======================
# ADMIN PRINCIPAL
# ======================

@admin.register(PagoStripe)
class PagoStripeAdmin(admin.ModelAdmin):
    """Administración para pagos de Stripe"""
    
    list_display = [
        'numero_pedido', 'nombre_cliente', 'importe_formateado', 'estado_badge',
        'tipo_pago', 'metodo_pago_info', 'fecha_creacion_formateada'
    ]
    
    list_filter = [
        EstadoPagoFilter, TipoPagoFilter, 'estado', 'metodo_pago', 'fecha_creacion'
    ]
    
    search_fields = [
        'numero_pedido', 'stripe_payment_intent_id', 'email_cliente', 
        'nombre_cliente', 'stripe_charge_id'
    ]
    
    readonly_fields = [
        'numero_pedido', 'stripe_payment_intent_id', 'stripe_charge_id',
        'stripe_client_secret', 'fecha_creacion', 'fecha_actualizacion',
        'fecha_confirmacion', 'stripe_metadata_display', 'datos_reserva_display'
    ]
    
    fieldsets = (
        (_('Información Básica'), {
            'fields': ('numero_pedido', 'estado', 'tipo_pago', 'importe', 'moneda')
        }),
        (_('Cliente'), {
            'fields': ('email_cliente', 'nombre_cliente')
        }),
        (_('Stripe'), {
            'fields': (
                'stripe_payment_intent_id', 'stripe_charge_id', 'stripe_client_secret',
                'stripe_status', 'stripe_metadata_display'
            ),
            'classes': ('collapse',)
        }),
        (_('Pago'), {
            'fields': ('metodo_pago', 'ultimos_4_digitos', 'marca_tarjeta')
        }),
        (_('Reembolsos'), {
            'fields': ('importe_reembolsado',)
        }),
        (_('Fechas'), {
            'fields': ('fecha_creacion', 'fecha_actualizacion', 'fecha_confirmacion', 'fecha_vencimiento')
        }),
        (_('Datos Adicionales'), {
            'fields': ('datos_reserva_display', 'mensaje_error', 'codigo_error_stripe'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['cancelar_pagos', 'sincronizar_con_stripe']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('reserva')
    
    # Campos personalizados
    def importe_formateado(self, obj):
        return f"{obj.importe:.2f} {obj.moneda}"
    importe_formateado.short_description = _("Importe")
    
    def estado_badge(self, obj):
        color_map = {
            'PENDIENTE': 'warning',
            'PROCESANDO': 'info',
            'COMPLETADO': 'success',
            'FALLIDO': 'danger',
            'CANCELADO': 'secondary',
            'REEMBOLSADO': 'primary',
            'REEMBOLSO_PARCIAL': 'primary'
        }
        color = color_map.get(obj.estado, 'secondary')
        return format_html(
            '<span class="badge badge-{}">{}</span>',
            color, obj.get_estado_display()
        )
    estado_badge.short_description = _("Estado")
    
    def metodo_pago_info(self, obj):
        if obj.metodo_pago and obj.ultimos_4_digitos:
            return f"{obj.marca_tarjeta or 'Card'} ****{obj.ultimos_4_digitos}"
        return obj.metodo_pago or "-"
    metodo_pago_info.short_description = _("Método de Pago")
    
    def fecha_creacion_formateada(self, obj):
        return obj.fecha_creacion.strftime('%d/%m/%Y %H:%M')
    fecha_creacion_formateada.short_description = _("Fecha Creación")
    
    def stripe_metadata_display(self, obj):
        if obj.stripe_metadata:
            return format_html('<pre>{}</pre>', json.dumps(obj.stripe_metadata, indent=2))
        return "-"
    stripe_metadata_display.short_description = _("Metadatos Stripe")
    
    def datos_reserva_display(self, obj):
        if obj.datos_reserva:
            return format_html('<pre>{}</pre>', json.dumps(obj.datos_reserva, indent=2, ensure_ascii=False))
        return "-"
    datos_reserva_display.short_description = _("Datos Reserva")
    
    # Acciones personalizadas
    def cancelar_pagos(self, request, queryset):
        cancelados = 0
        for pago in queryset.filter(estado__in=['PENDIENTE', 'PROCESANDO']):
            try:
                pago.cancelar_pago("Cancelado desde admin")
                cancelados += 1
            except Exception as e:
                messages.error(request, f'Error cancelando pago {pago.numero_pedido}: {e}')
        
        if cancelados:
            messages.success(request, f'{cancelados} pagos cancelados.')
    cancelar_pagos.short_description = _("Cancelar pagos seleccionados")
    
    def sincronizar_con_stripe(self, request, queryset):
        if not StripePaymentService:
            messages.error(request, 'Servicio de Stripe no disponible.')
            return
        
        sincronizados = 0
        service = StripePaymentService()
        
        for pago in queryset:
            try:
                if service._sincronizar_pago_con_stripe(pago):
                    sincronizados += 1
            except Exception as e:
                messages.error(request, f'Error sincronizando {pago.numero_pedido}: {e}')
        
        if sincronizados:
            messages.success(request, f'{sincronizados} pagos sincronizados.')
    sincronizar_con_stripe.short_description = _("Sincronizar con Stripe")


@admin.register(ReembolsoStripe)
class ReembolsoStripeAdmin(admin.ModelAdmin):
    """Administración para reembolsos de Stripe"""
    
    list_display = [
        'stripe_refund_id', 'pago_stripe', 'importe_formateado', 
        'estado_badge', 'motivo', 'fecha_creacion'
    ]
    
    list_filter = ['estado', 'motivo', 'fecha_creacion']
    
    search_fields = [
        'stripe_refund_id', 'pago_stripe__numero_pedido', 
        'pago_stripe__email_cliente'
    ]
    
    readonly_fields = [
        'stripe_refund_id', 'fecha_creacion', 'fecha_procesamiento',
        'stripe_status', 'stripe_failure_reason'
    ]
    
    def importe_formateado(self, obj):
        return f"{obj.importe:.2f} EUR"
    importe_formateado.short_description = _("Importe")
    
    def estado_badge(self, obj):
        color_map = {
            'PENDIENTE': 'warning',
            'PROCESANDO': 'info',
            'COMPLETADO': 'success',
            'FALLIDO': 'danger',
            'CANCELADO': 'secondary'
        }
        color = color_map.get(obj.estado, 'secondary')
        return format_html(
            '<span class="badge badge-{}">{}</span>',
            color, obj.get_estado_display()
        )
    estado_badge.short_description = _("Estado")


@admin.register(WebhookStripe)
class WebhookStripeAdmin(admin.ModelAdmin):
    """Administración para webhooks de Stripe"""
    
    list_display = [
        'stripe_event_id', 'tipo_evento', 'procesado_badge', 
        'intentos_procesamiento', 'fecha_recepcion'
    ]
    
    list_filter = ['tipo_evento', 'procesado', 'fecha_recepcion']
    
    search_fields = ['stripe_event_id', 'tipo_evento']
    
    readonly_fields = [
        'stripe_event_id', 'tipo_evento', 'datos_evento_display',
        'fecha_recepcion', 'fecha_procesamiento', 'intentos_procesamiento'
    ]
    
    actions = ['reprocesar_webhooks']
    
    def procesado_badge(self, obj):
        if obj.procesado:
            return format_html('<span class="badge badge-success">Procesado</span>')
        else:
            return format_html('<span class="badge badge-danger">Pendiente</span>')
    procesado_badge.short_description = _("Estado")
    
    def datos_evento_display(self, obj):
        if obj.datos_evento:
            return format_html('<pre>{}</pre>', json.dumps(obj.datos_evento, indent=2))
        return "-"
    datos_evento_display.short_description = _("Datos del Evento")
    
    def reprocesar_webhooks(self, request, queryset):
        if not StripeWebhookService:
            messages.error(request, 'Servicio de webhooks no disponible.')
            return
        
        procesados = 0
        service = StripeWebhookService()
        
        for webhook in queryset.filter(procesado=False):
            try:
                resultado = service._procesar_evento(webhook.datos_evento, webhook)
                if resultado.get('success'):
                    webhook.procesado = True
                    webhook.fecha_procesamiento = timezone.now()
                    webhook.save()
                    procesados += 1
            except Exception as e:
                messages.error(request, f'Error reprocesando {webhook.stripe_event_id}: {e}')
        
        if procesados:
            messages.success(request, f'{procesados} webhooks reprocesados.')
    reprocesar_webhooks.short_description = _("Reprocesar webhooks seleccionados")
