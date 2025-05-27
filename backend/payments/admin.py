# backend/payments/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.utils import timezone
from django.db.models import Q
import json
from .models import PagoStripe, ReembolsoStripe, WebhookStripe
from .services import StripePaymentService

@admin.register(PagoStripe)
class PagoStripeAdmin(admin.ModelAdmin):
    """Admin para pagos de Stripe"""
    
    list_display = [
        'numero_pedido_link', 'cliente_info', 'importe_display', 
        'estado_display', 'tipo_pago', 'metodo_pago_display',
        'fecha_creacion', 'acciones_admin'
    ]
    
    list_filter = [
        'estado', 'tipo_pago', 'moneda', 'metodo_pago', 
        'marca_tarjeta', 'fecha_creacion', 'fecha_confirmacion'
    ]
    
    search_fields = [
        'numero_pedido', 'stripe_payment_intent_id', 'stripe_charge_id',
        'email_cliente', 'nombre_cliente', 'ultimos_4_digitos'
    ]
    readonly_fields = [
        'numero_pedido', 'stripe_payment_intent_id', 'stripe_charge_id',
        'stripe_client_secret', 'stripe_status', 'stripe_metadata_display',
        'fecha_creacion', 'fecha_actualizacion', 'fecha_confirmacion',
        'es_exitoso_display', 'puede_reembolsar_display', 'importe_disponible_reembolso_display',
        'reserva_info_display', 'datos_reserva_display'
    ]
    
    fieldsets = [
        ('Información del Pago', {
            'fields': [
                'numero_pedido', 'importe', 'moneda', 'estado', 'tipo_pago'
            ]
        }),
        ('Información de Stripe', {
            'fields': [
                'stripe_payment_intent_id', 'stripe_charge_id', 
                'stripe_client_secret', 'stripe_status', 'stripe_metadata_display'
            ],
            'classes': ['collapse']
        }),
        ('Información del Cliente', {
            'fields': [
                'email_cliente', 'nombre_cliente'
            ]
        }),
        ('Detalles del Pago', {
            'fields': [
                'metodo_pago', 'ultimos_4_digitos', 'marca_tarjeta'
            ]
        }),        
        ('Reembolsos', {
            'fields': [
                'importe_reembolsado', 'puede_reembolsar_display', 
                'importe_disponible_reembolso_display'
            ]
        }),
        ('Información de Error', {
            'fields': [
                'mensaje_error', 'codigo_error_stripe'
            ],
            'classes': ['collapse']
        }),
        ('Fechas', {
            'fields': [
                'fecha_creacion', 'fecha_actualizacion', 'fecha_confirmacion',
                'fecha_vencimiento'
            ]
        }),
        ('Reserva Asociada', {
            'fields': [
                'reserva', 'reserva_info_display'
            ]
        }),
        ('Datos de Reserva (JSON)', {
            'fields': ['datos_reserva_display'],
            'classes': ['collapse']
        })
    ]
    
    ordering = ['-fecha_creacion']
    date_hierarchy = 'fecha_creacion'
    
    # Métodos de display personalizados
    
    def numero_pedido_link(self, obj):
        """Muestra el número de pedido como enlace"""
        if obj.reserva:
            url = reverse('admin:api_reserva_change', args=[obj.reserva.id])
            return format_html('<a href="{}">{}</a>', url, obj.numero_pedido)
        return obj.numero_pedido
    numero_pedido_link.short_description = 'Número de Pedido'
    
    def cliente_info(self, obj):
        """Muestra información del cliente"""
        return format_html(
            '<strong>{}</strong><br/><small>{}</small>',
            obj.nombre_cliente or 'Sin nombre',
            obj.email_cliente
        )
    cliente_info.short_description = 'Cliente'
    
    def importe_display(self, obj):
        """Muestra el importe con formato"""
        color = 'green' if obj.es_exitoso else 'red' if obj.estado == 'FALLIDO' else 'orange'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.2f} {}</span>',
            color, obj.importe, obj.moneda.upper()
        )
    importe_display.short_description = 'Importe'
    
    def estado_display(self, obj):
        """Muestra el estado con colores"""
        color_map = {
            'COMPLETADO': 'green',
            'FALLIDO': 'red',
            'CANCELADO': 'gray',
            'PENDIENTE': 'orange',
            'PROCESANDO': 'blue',
            'REEMBOLSADO': 'purple',
            'REEMBOLSO_PARCIAL': 'purple'
        }
        color = color_map.get(obj.estado, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_estado_display()
        )
    estado_display.short_description = 'Estado'
    
    def metodo_pago_display(self, obj):
        """Muestra información del método de pago"""
        if obj.metodo_pago == 'card' and obj.ultimos_4_digitos:
            return format_html(
                '{} **** {}<br/><small>{}</small>',
                obj.marca_tarjeta.upper() if obj.marca_tarjeta else 'CARD',
                obj.ultimos_4_digitos,
                obj.metodo_pago
            )
        return obj.metodo_pago or 'No especificado'
    metodo_pago_display.short_description = 'Método de Pago'
    
    def acciones_admin(self, obj):
        """Muestra acciones disponibles"""
        acciones = []
        
        if obj.puede_reembolsar:
            acciones.append('<a href="#" onclick="return confirm(\'¿Realizar reembolso?\');">🔄 Reembolsar</a>')
        
        if obj.estado in ['PENDIENTE', 'PROCESANDO']:
            acciones.append('<a href="#" onclick="return confirm(\'¿Sincronizar con Stripe?\');">🔄 Sincronizar</a>')
        
        if obj.stripe_payment_intent_id:
            stripe_url = f"https://dashboard.stripe.com/payments/{obj.stripe_payment_intent_id}"
            acciones.append(f'<a href="{stripe_url}" target="_blank">👁️ Ver en Stripe</a>')
        
        return format_html('<br/>'.join(acciones)) if acciones else 'Sin acciones'
    acciones_admin.short_description = 'Acciones'
    
    def stripe_metadata_display(self, obj):
        """Muestra los metadatos de Stripe de forma legible"""
        if obj.stripe_metadata:
            return format_html('<pre>{}</pre>', json.dumps(obj.stripe_metadata, indent=2))
        return 'Sin metadatos'
    stripe_metadata_display.short_description = 'Metadatos de Stripe'
    
    def reserva_info_display(self, obj):
        """Muestra información de la reserva asociada"""
        if obj.reserva:
            return format_html(
                '<strong>ID:</strong> {}<br/>'
                '<strong>Estado:</strong> {}<br/>'
                '<strong>Vehículo:</strong> {} {}<br/>'
                '<strong>Fechas:</strong> {} - {}',
                obj.reserva.id,
                obj.reserva.estado,
                obj.reserva.vehiculo.marca if obj.reserva.vehiculo else 'N/A',
                obj.reserva.vehiculo.modelo if obj.reserva.vehiculo else 'N/A',
                obj.reserva.fecha_recogida.strftime('%d/%m/%Y') if obj.reserva.fecha_recogida else 'N/A',
                obj.reserva.fecha_devolucion.strftime('%d/%m/%Y') if obj.reserva.fecha_devolucion else 'N/A'
            )
        return 'Sin reserva asociada'
    reserva_info_display.short_description = 'Información de Reserva'
    
    def datos_reserva_display(self, obj):
        """Muestra los datos de reserva de forma legible"""
        if obj.datos_reserva:
            return format_html('<pre>{}</pre>', json.dumps(obj.datos_reserva, indent=2, default=str))
        return 'Sin datos de reserva'
    datos_reserva_display.short_description = 'Datos de Reserva (JSON)'
    
    def es_exitoso_display(self, obj):
        """Muestra si el pago es exitoso"""
        if obj.es_exitoso:
            return format_html('<span style="color: green;">✓ Exitoso</span>')
        return format_html('<span style="color: red;">✗ No exitoso</span>')
    es_exitoso_display.short_description = 'Es Exitoso'
    
    def puede_reembolsar_display(self, obj):
        """Muestra si el pago puede reembolsarse"""
        if obj.puede_reembolsar:
            return format_html('<span style="color: green;">✓ Puede reembolsar</span>')
        return format_html('<span style="color: gray;">✗ No puede reembolsar</span>')
    puede_reembolsar_display.short_description = 'Puede Reembolsar'
    
    def importe_disponible_reembolso_display(self, obj):
        """Muestra el importe disponible para reembolso"""
        importe = obj.importe_disponible_reembolso
        if importe > 0:
            return format_html(
                '<span style="color: green; font-weight: bold;">{:.2f} EUR</span>',
                importe
            )
        return format_html('<span style="color: gray;">0.00 EUR</span>')
    importe_disponible_reembolso_display.short_description = 'Disponible para Reembolso'
    
    # Acciones personalizadas
    
    def sincronizar_con_stripe(self, request, queryset):
        """Sincroniza pagos seleccionados con Stripe"""
        service = StripePaymentService()
        actualizados = 0
        
        for pago in queryset:
            if service._sincronizar_pago_con_stripe(pago):
                actualizados += 1
        
        self.message_user(
            request,
            f'{actualizados} pagos sincronizados con Stripe exitosamente.'
        )
    sincronizar_con_stripe.short_description = "Sincronizar con Stripe"
    
    actions = ['sincronizar_con_stripe']
    
    # Filtros personalizados
    
    def get_queryset(self, request):
        """Optimiza las consultas incluyendo relaciones"""
        return super().get_queryset(request).select_related('reserva', 'reserva__vehiculo')


@admin.register(ReembolsoStripe)
class ReembolsoStripeAdmin(admin.ModelAdmin):
    """Admin para reembolsos de Stripe"""
    
    list_display = [
        'stripe_refund_id', 'pago_relacionado', 'importe_display', 
        'motivo', 'estado_display', 'fecha_creacion'
    ]
    
    list_filter = [
        'motivo', 'estado', 'fecha_creacion', 'fecha_procesamiento'
    ]
    
    search_fields = [
        'stripe_refund_id', 'pago_stripe__numero_pedido', 
        'pago_stripe__email_cliente', 'descripcion'
    ]
    
    readonly_fields = [
        'stripe_refund_id', 'stripe_status', 'stripe_failure_reason',
        'fecha_creacion', 'fecha_procesamiento'
    ]
    
    fieldsets = [
        ('Información del Reembolso', {
            'fields': [
                'pago_stripe', 'stripe_refund_id', 'importe', 'motivo', 'estado'
            ]
        }),
        ('Descripción', {
            'fields': ['descripcion']
        }),
        ('Información de Stripe', {
            'fields': [
                'stripe_status', 'stripe_failure_reason'
            ]
        }),
        ('Fechas', {
            'fields': [
                'fecha_creacion', 'fecha_procesamiento'
            ]
        })
    ]
    
    def pago_relacionado(self, obj):
        """Muestra información del pago relacionado"""
        return format_html(
            '<a href="{}">{}</a><br/><small>{}</small>',
            reverse('admin:payments_pagostripe_change', args=[obj.pago_stripe.id]),
            obj.pago_stripe.numero_pedido,
            obj.pago_stripe.email_cliente
        )
    pago_relacionado.short_description = 'Pago'
    
    def importe_display(self, obj):
        """Muestra el importe del reembolso"""
        return format_html(
            '<span style="color: purple; font-weight: bold;">{:.2f} EUR</span>',
            obj.importe
        )
    importe_display.short_description = 'Importe'
    
    def estado_display(self, obj):
        """Muestra el estado con colores"""
        color_map = {
            'COMPLETADO': 'green',
            'FALLIDO': 'red',
            'CANCELADO': 'gray',
            'PENDIENTE': 'orange',
            'PROCESANDO': 'blue'
        }
        color = color_map.get(obj.estado, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_estado_display()
        )
    estado_display.short_description = 'Estado'


@admin.register(WebhookStripe)
class WebhookStripeAdmin(admin.ModelAdmin):
    """Admin para webhooks de Stripe"""
    
    list_display = [
        'stripe_event_id', 'tipo_evento', 'procesado_display', 
        'intentos_procesamiento', 'fecha_recepcion'
    ]
    
    list_filter = [
        'tipo_evento', 'procesado', 'fecha_recepcion', 'intentos_procesamiento'
    ]
    
    search_fields = [
        'stripe_event_id', 'tipo_evento', 'mensaje_error'
    ]
    
    readonly_fields = [
        'stripe_event_id', 'tipo_evento', 'datos_evento_display',
        'fecha_recepcion', 'fecha_procesamiento'
    ]
    
    fieldsets = [
        ('Información del Webhook', {
            'fields': [
                'stripe_event_id', 'tipo_evento', 'procesado'
            ]
        }),
        ('Procesamiento', {
            'fields': [
                'intentos_procesamiento', 'mensaje_error'
            ]
        }),
        ('Fechas', {
            'fields': [
                'fecha_recepcion', 'fecha_procesamiento'
            ]
        }),
        ('Datos del Evento', {
            'fields': ['datos_evento_display'],
            'classes': ['collapse']
        })
    ]
    
    def procesado_display(self, obj):
        """Muestra el estado de procesamiento"""
        if obj.procesado:
            return format_html('<span style="color: green;">✓ Procesado</span>')
        elif obj.intentos_procesamiento > 0:
            return format_html('<span style="color: orange;">⚠ {} intentos</span>', obj.intentos_procesamiento)
        else:
            return format_html('<span style="color: red;">✗ Pendiente</span>')
    procesado_display.short_description = 'Estado'
    
    def datos_evento_display(self, obj):
        """Muestra los datos del evento de forma legible"""
        if obj.datos_evento:
            return format_html('<pre>{}</pre>', json.dumps(obj.datos_evento, indent=2))
        return 'Sin datos'
    datos_evento_display.short_description = 'Datos del Evento'
    
    def reprocesar_webhook(self, request, queryset):
        """Reprocesa webhooks seleccionados"""
        from .services import StripeWebhookService
        
        service = StripeWebhookService()
        procesados = 0
        
        for webhook in queryset.filter(procesado=False):
            try:
                # Simular el procesamiento del webhook
                evento = webhook.datos_evento
                resultado = service._procesar_evento(evento, webhook)
                
                if resultado.get('success'):
                    webhook.procesado = True
                    webhook.fecha_procesamiento = timezone.now()
                    webhook.save()
                    procesados += 1
                    
            except Exception as e:
                webhook.mensaje_error = str(e)
                webhook.intentos_procesamiento += 1
                webhook.save()
        
        self.message_user(
            request,
            f'{procesados} webhooks reprocesados exitosamente.'
        )
    reprocesar_webhook.short_description = "Reprocesar webhooks"
    
    actions = ['reprocesar_webhook']


# Personalización del admin site
admin.site.site_header = "Mobility4You - Administración de Pagos"
admin.site.site_title = "Mobility4You Admin"
admin.site.index_title = "Panel de Administración"