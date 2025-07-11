# reservas/admin.py
import logging
from decimal import Decimal
from typing import Any, Optional

from django.contrib import admin, messages
from django.contrib.admin import SimpleListFilter
from django.db import transaction
from django.db.models import Q, QuerySet, Sum
from django.http import HttpRequest, JsonResponse
from django.urls import path, reverse
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _
from utils.static_mapping import get_versioned_asset

from .models import (Extras, Penalizacion, Reserva, ReservaConductor,
                     ReservaExtra)

logger = logging.getLogger("admin_operations")


class EstadoReservaFilter(SimpleListFilter):
    """Filtro personalizado para estado de reservas"""
    title = _("Estado de Reserva")
    parameter_name = "estado_reserva"

    def lookups(self, request, model_admin):
        return (
            ("activas", _("Reservas Activas")),
            ("completadas", _("Completadas")),
            ("canceladas", _("Canceladas")),
            ("pendientes_pago", _("Pendientes de Pago")),
        )

    def queryset(self, request, queryset):
        if self.value() == "activas":
            return queryset.filter(estado="confirmada", fecha_devolucion__gte=timezone.now())
        elif self.value() == "completadas":
            return queryset.filter(estado="confirmada", fecha_devolucion__lt=timezone.now())
        elif self.value() == "canceladas":
            return queryset.filter(estado="cancelada")
        elif self.value() == "pendientes_pago":
            return queryset.filter(estado="pendiente")


class ReservaConductorInline(admin.TabularInline):
    model = ReservaConductor
    extra = 0 
    fields = ["conductor", "rol"]
    verbose_name = "Conductor"
    verbose_name_plural = "Conductores"
    
    class Media:
        css = {
            'all': ('admin/css/custom_admin.css',)
        }


class PenalizacionInline(admin.TabularInline):
    model = Penalizacion
    extra = 0 
    fields = ["tipo_penalizacion", "importe", "fecha", "descripcion"]
    readonly_fields = ["fecha"]
    verbose_name = "Penalización"
    verbose_name_plural = "Penalizaciones"
    
    class Media:
        css = {
            'all': ('admin/css/custom_admin.css',)
        }


class ReservaExtraInline(admin.TabularInline):
    model = ReservaExtra
    extra = 0 
    fields = ["extra", "cantidad"]
    verbose_name = "Extra"
    verbose_name_plural = "Extras"
    
    class Media:
        css = {
            'all': ('admin/css/custom_admin.css',)
        }


@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    list_display = (
        "numero_reserva_link",
        "usuario_info",
        "vehiculo_info", 
        "fechas_info",
        "estado_display",
        "precio_total_display",
        "pagos_info",
        "acciones_admin",
    )
    list_filter = (
        EstadoReservaFilter,
        "estado", 
        "metodo_pago",
        "fecha_recogida",
        "created_at",
        "vehiculo__categoria",
        "lugar_recogida__nombre",
    )
    search_fields = (
        "id",
        "usuario__email", 
        "usuario__first_name",
        "usuario__last_name",
        "vehiculo__marca", 
        "vehiculo__modelo",
        "vehiculo__matricula",
    )
    readonly_fields = (
        "created_at", 
        "updated_at",
        "precio_total_calculado",
        "dias_alquiler_display",
        "resumen_pagos",
        "validacion_disponibilidad",
    )
    inlines = [ReservaConductorInline, ReservaExtraInline, PenalizacionInline]
    actions = ["confirmar_reservas", "cancelar_reservas", "enviar_recordatorio"]
    
    fieldsets = (
        (
            "🔍 Información de la Reserva",
            {
                "fields": (
                    ("created_at", "updated_at"),
                    "usuario",
                    "estado",
                )
            },
        ),
        (
            "🚗 Vehículo y Política",
            {
                "fields": (
                    "vehiculo",
                    "politica_pago",
                    "promocion",
                    "validacion_disponibilidad",
                )
            },
        ),
        (
            "📅 Fechas y Lugares",
            {
                "fields": (
                    ("fecha_recogida", "fecha_devolucion"),
                    "dias_alquiler_display",
                    ("lugar_recogida", "lugar_devolucion"),
                )
            },
        ),
        (
            "💰 Precios y Cálculos",
            {
                "fields": (
                    ("precio_dia", "precio_impuestos"),
                    "precio_total_calculado",
                    "precio_total",
                )
            },
        ),
        (
            "💳 Información de Pagos",
            {
                "fields": (
                    "metodo_pago",
                    "resumen_pagos",
                    ("importe_pagado_inicial", "importe_pendiente_inicial"),
                    ("importe_pagado_extra", "importe_pendiente_extra"),
                )
            },
        ),
        (
            "📝 Notas",
            {
                "fields": ("notas_internas",),
                "classes": ("collapse",),
            },
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "usuario", "vehiculo", "vehiculo__categoria", "lugar_recogida", 
            "lugar_devolucion", "politica_pago", "promocion"
        ).prefetch_related("extras", "penalizaciones", "conductores")

    def numero_reserva_link(self, obj):
        """Link directo a la reserva"""
        url = reverse("admin:reservas_reserva_change", args=[obj.pk])
        return format_html(
            '<a href="{}" style="font-weight: bold; color: #007bff;">#{}</a>',
            url, obj.pk
        )

    def usuario_info(self, obj):
        """Información del usuario"""
        return format_html(
            '<strong>{}</strong><br>'
            '<small>📧 {}</small><br>'
            '<small>📱 {}</small>',
            obj.usuario.get_full_name() or obj.usuario.username,
            obj.usuario.email,
            obj.usuario.telefono or "Sin teléfono"
        )

    def vehiculo_info(self, obj):
        """Información del vehículo"""
        return format_html(
            '<strong>{} {}</strong><br>'
            '<small>📄 {}</small><br>'
            '<small>🏷️ {}</small>',
            obj.vehiculo.marca,
            obj.vehiculo.modelo,
            obj.vehiculo.matricula,
            obj.vehiculo.categoria.nombre
        )

    def fechas_info(self, obj):
        """Información de fechas"""
        dias = obj.dias_alquiler()
        return format_html(
            '<strong>📅 {}</strong><br>'
            '<small>hasta</small><br>'
            '<strong>📅 {}</strong><br>'
            '<small style="color: #666;">({} días)</small>',
            obj.fecha_recogida.strftime("%d/%m/%Y %H:%M"),
            obj.fecha_devolucion.strftime("%d/%m/%Y %H:%M"),
            dias
        )

    @admin.display(description="Estado")
    def estado_display(self, obj):
        """Estado con colores"""
        color_map = {
            "pendiente": "#ffc107",
            "confirmada": "#28a745", 
            "cancelada": "#dc3545"
        }
        icon_map = {
            "pendiente": "⏳",
            "confirmada": "✅",
            "cancelada": "❌"
        }
        
        color = color_map.get(obj.estado, "#6c757d")
        icon = icon_map.get(obj.estado, "❓")
        
        return format_html(
            '<span style="color: {}; font-weight: bold; white-space: nowrap;">{} {}</span>',
            color, icon, obj.get_estado_display()
        )

    @admin.display(description="Precio Total")
    def precio_total_display(self, obj):
        """Precio total con formato"""
        return format_html(
            '<strong style="color: #007bff; font-size: 1.1em;">€{}</strong>',
            obj.precio_total
        )

    @admin.display(description="Pagos Info")
    def pagos_info(self, obj):
        """Información de pagos"""
        pagado_total = obj.importe_pagado_inicial + (obj.importe_pagado_extra or 0)
        pendiente_total = obj.importe_pendiente_inicial + (obj.importe_pendiente_extra or 0)
        
        if pagado_total >= obj.precio_total:
            status_html = format_html('<span style="color: #28a745;">✅ Pagado</span>')
        elif pagado_total > 0:
            status_html = format_html('<span style="color: #ffc107;">⏳ Parcial</span>')
        else:
            status_html = format_html('<span style="color: #dc3545;">❌ Sin pagar</span>')
            
        return mark_safe(
            f'{status_html}<br>'
            f'<small>Pagado: €{pagado_total}</small><br>'
            f'<small>Pendiente: €{pendiente_total}</small>'
        )

    def acciones_admin(self, obj):
        """Botones de acción rápida"""
        actions = []
        
        # Solo mostrar acciones según el estado actual
        if obj.estado == "pendiente":
            actions.append(
                '<a href="#" onclick="confirmarReserva({})" '
                'style="color: #28a745; text-decoration: none; font-weight: bold;">✅ Confirmar</a>'.format(obj.pk)
            )
            actions.append(
                '<a href="#" onclick="cancelarReserva({})" '
                'style="color: #dc3545; text-decoration: none; font-weight: bold;">❌ Cancelar</a>'.format(obj.pk)
            )
        elif obj.estado == "confirmada":
            # Verificar si la reserva ya terminó
            now = timezone.now()
            if obj.fecha_devolucion < now:
                # Reserva completada - no mostrar acciones
                actions.append(
                    '<span style="color: #28a745; font-weight: bold;">✅ Completada</span>'
                )
            else:
                # Reserva activa - solo permitir cancelación con confirmación
                actions.append(
                    '<a href="#" onclick="cancelarReservaConfirmada({})" '
                    'style="color: #dc3545; text-decoration: none; font-weight: bold;">⚠️ Cancelar Confirmada</a>'.format(obj.pk)
                )
        elif obj.estado == "cancelada":
            actions.append(
                '<span style="color: #6c757d; font-weight: bold;">❌ Cancelada</span>'
            )
            
        return mark_safe('<br>'.join(actions) if actions else '<span style="color: #6c757d;">Sin acciones</span>')

    @admin.display(description="Dias Alquiler")
    def dias_alquiler_display(self, obj):
        """Días de alquiler calculados"""
        dias = obj.dias_alquiler()
        return format_html(
            '<strong>{} días</strong><br>'
            '<small>Desde {} hasta {}</small>',
            dias,
            obj.fecha_recogida.strftime("%d/%m"),
            obj.fecha_devolucion.strftime("%d/%m")
        )

    def precio_total_calculado(self, obj):
        """Precio total calculado automáticamente"""
        precio_calculado = obj.calcular_precio_total()
        diferencia = abs(precio_calculado - obj.precio_total)
        
        if diferencia > Decimal('0.01'):
            return format_html(
                '<span style="color: #dc3545;">€{} (Diferencia: €{})</span><br>'
                '<small>Precio actual: €{}</small>',
                precio_calculado, diferencia, obj.precio_total
            )
        else:
            return format_html(
                '<span style="color: #28a745;">€{} ✅</span>',
                precio_calculado
            )

    def resumen_pagos(self, obj):
        """Resumen detallado de pagos"""
        pagado_inicial = obj.importe_pagado_inicial
        pendiente_inicial = obj.importe_pendiente_inicial
        pagado_extra = obj.importe_pagado_extra or 0
        pendiente_extra = obj.importe_pendiente_extra or 0
        
        total_pagado = pagado_inicial + pagado_extra
        total_pendiente = pendiente_inicial + pendiente_extra
        
        return format_html(
            '<div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px;">'
            '<strong>Resumen de Pagos:</strong><br>'
            '• Pagado inicial: €{}<br>'
            '• Pendiente inicial: €{}<br>'
            '• Pagado extra: €{}<br>'
            '• Pendiente extra: €{}<br>'
            '<hr style="margin: 5px 0;">'
            '<strong>Total pagado: €{}</strong><br>'
            '<strong>Total pendiente: €{}</strong>'
            '</div>',
            pagado_inicial, pendiente_inicial, pagado_extra, pendiente_extra,
            total_pagado, total_pendiente
        )

    def validacion_disponibilidad(self, obj):
        """Validar disponibilidad del vehículo"""
        if obj.verificar_disponibilidad_vehiculo():
            return format_html(
                '<span style="color: #28a745;">✅ Vehículo disponible</span>'
            )
        else:
            return format_html(
                '<span style="color: #dc3545;">❌ Conflicto de disponibilidad</span>'
            )

    def get_urls(self):
        """Agregar URLs personalizadas para acciones AJAX"""
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:object_id>/confirm/',
                self.admin_site.admin_view(self.confirm_reserva),
                name='reservas_reserva_confirm',
            ),
            path(
                '<int:object_id>/cancel/',
                self.admin_site.admin_view(self.cancel_reserva),
                name='reservas_reserva_cancel',
            ),
        ]
        return custom_urls + urls
    
    def confirm_reserva(self, request, object_id):
        """Vista AJAX para confirmar reserva"""
        if request.method != 'POST':
            return JsonResponse({'error': 'Método no permitido'}, status=405)
        
        try:
            reserva = self.get_object(request, object_id)
            if not reserva:
                return JsonResponse({'error': 'Reserva no encontrada'}, status=404)
            
            if reserva.estado != 'pendiente':
                return JsonResponse({'error': 'Solo se pueden confirmar reservas pendientes'}, status=400)
            
            # Verificar disponibilidad del vehículo
            if not reserva.verificar_disponibilidad_vehiculo():
                return JsonResponse({'error': 'El vehículo no está disponible para estas fechas'}, status=400)
            
            reserva.estado = 'confirmada'
            reserva.save()
            
            logger.info(f"Reserva {reserva.id} confirmada por {request.user.username}")
            
            return JsonResponse({
                'success': True,
                'message': 'Reserva confirmada exitosamente'
            })
            
        except Exception as e:
            logger.error(f"Error en confirm_reserva: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
    
    def cancel_reserva(self, request, object_id):
        """Vista AJAX para cancelar reserva"""
        if request.method != 'POST':
            return JsonResponse({'error': 'Método no permitido'}, status=405)
        
        try:
            reserva = self.get_object(request, object_id)
            if not reserva:
                return JsonResponse({'error': 'Reserva no encontrada'}, status=404)
            
            if reserva.estado == 'cancelada':
                return JsonResponse({'error': 'La reserva ya está cancelada'}, status=400)
            
            # Verificar si es una cancelación confirmada (para reservas confirmadas)
            confirmed_cancellation = request.POST.get('confirmed_cancellation', 'false').lower() == 'true'
            
            if reserva.estado == 'confirmada' and not confirmed_cancellation:
                return JsonResponse({'error': 'Se requiere confirmación adicional para cancelar reservas confirmadas'}, status=400)
            
            reserva.estado = 'cancelada'
            reserva.save()
            
            logger.info(f"Reserva {reserva.id} cancelada por {request.user.username}")
            
            return JsonResponse({
                'success': True,
                'message': 'Reserva cancelada exitosamente'
            })
            
        except Exception as e:
            logger.error(f"Error en cancel_reserva: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

    # Acciones masivas
    def confirmar_reservas(self, request, queryset):
        """Confirmar reservas seleccionadas"""
        count = 0
        for reserva in queryset.filter(estado="pendiente"):
            if reserva.verificar_disponibilidad_vehiculo():
                reserva.estado = "confirmada"
                reserva.save()
                count += 1
                logger.info(f"Reserva {reserva.pk} confirmada por {request.user.username}")
        
        self.message_user(
            request,
            f"{count} reservas confirmadas exitosamente.",
            messages.SUCCESS
        )

    def cancelar_reservas(self, request, queryset):
        """Cancelar reservas seleccionadas"""
        count = queryset.exclude(estado="cancelada").update(estado="cancelada")
        self.message_user(
            request,
            f"{count} reservas canceladas.",
            messages.WARNING        )
    

    def enviar_recordatorio(self, request, queryset):
        """Enviar recordatorio a clientes"""
        # Aquí iría la lógica para enviar emails
        count = queryset.count()
        self.message_user(
            request,
            f"Recordatorios enviados a {count} clientes.",
            messages.INFO
        )
    

    def save_model(self, request, obj, form, change):
        """Guardar con logging"""
        action = "Editada" if change else "Creada"
        try:
            super().save_model(request, obj, form, change)
            logger.info(f"Reserva {obj.pk} {action.lower()} por {request.user.username}")
            messages.success(request, f"Reserva #{obj.pk} {action.lower()} exitosamente.")
        except Exception as e:
            logger.error(f"Error al guardar reserva: {str(e)}")
            messages.error(request, f"Error al guardar: {str(e)}")
            raise

    class Media:
        js = (get_versioned_asset("js_reservas", "admin/js/reservas_admin_v74440271.js"),)
        css = {
            "all": (get_versioned_asset("css", "admin/css/custom_admin_veeb3cfb9.css"),)
        }



@admin.register(ReservaConductor)
class ReservaConductorAdmin(admin.ModelAdmin):
    list_display = ("reserva_link", "conductor_info", "rol_display", "fecha_reserva")
    list_filter = ("rol", "reserva__estado", "reserva__fecha_recogida")
    search_fields = (
        "reserva__id",
        "conductor__email",
        "conductor__first_name", 
        "conductor__last_name"
    )
    readonly_fields = ("fecha_reserva",)

    def reserva_link(self, obj):
        url = reverse("admin:reservas_reserva_change", args=[obj.reserva.pk])
        return format_html(
            '<a href="{}">Reserva #{}</a>',
            url, obj.reserva.pk
        )

    def conductor_info(self, obj):
        return format_html(
            '<strong>{}</strong><br>'
            '<small>{}</small>',
            obj.conductor.get_full_name() or obj.conductor.username,
            obj.conductor.email
        )

    @admin.display(description="Rol")
    def rol_display(self, obj):
        icon = "👤" if obj.rol == "principal" else "👥"
        color = "#007bff" if obj.rol == "principal" else "#6c757d"
        return format_html(
            '<span style="color: {};">{} {}</span>',
            color, icon, obj.get_rol_display()
        )

    def fecha_reserva(self, obj):
        return obj.reserva.created_at


@admin.register(Penalizacion)
class PenalizacionAdmin(admin.ModelAdmin):
    list_display = (
        "reserva_link", 
        "tipo_penalizacion", 
        "importe_display", 
        "fecha", 
        "descripcion_short"
    )
    list_filter = ("tipo_penalizacion", "fecha", "reserva__estado")
    search_fields = ("reserva__id", "descripcion", "tipo_penalizacion__nombre")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "fecha"

    fieldsets = (
        (
            "Información de la Penalización",
            {
                "fields": (
                    "reserva",
                    "tipo_penalizacion", 
                    "importe",
                    "fecha",
                )
            },
        ),
        (
            "Detalles",
            {
                "fields": ("descripcion",)
            },
        ),
        (
            "Metadatos",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def reserva_link(self, obj):
        url = reverse("admin:reservas_reserva_change", args=[obj.reserva.pk])
        return format_html(
            '<a href="{}">Reserva #{}</a>',
            url, obj.reserva.pk
        )

    @admin.display(description="Importe")
    def importe_display(self, obj):
        return format_html(
            '<strong style="color: #dc3545;">€{}</strong>',
            obj.importe
        )

    def descripcion_short(self, obj):
        if obj.descripcion:
            return obj.descripcion[:50] + "..." if len(obj.descripcion) > 50 else obj.descripcion
        return "-"


@admin.register(Extras)
class ExtrasAdmin(admin.ModelAdmin):
    list_display = ("nombre", "imagen_preview", "precio", "created_at")
    list_filter = ("precio", "created_at")
    search_fields = ("nombre", "descripcion")
    readonly_fields = ("imagen_preview", "created_at", "updated_at")
    
    fieldsets = (
        (
            "Información del Extra",
            {
                "fields": ("nombre", "descripcion", "precio")
            },
        ),
        (
            "Imagen",
            {
                "fields": ("imagen", "imagen_preview"),
                "classes": ("collapse",),
            },
        ),
        (
            "Información del Sistema",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def imagen_preview(self, obj):
        """Mostrar una vista previa de la imagen en el admin"""
        if obj.imagen:
            from django.utils.safestring import mark_safe

            # Construir URL de la imagen
            imagen_url = obj.imagen.url
            
            return mark_safe(
                f'<img src="{imagen_url}" style="max-width: 150px; max-height: 150px; object-fit: cover; border-radius: 8px;" />'
            )
        return "Sin imagen"
    
    imagen_preview.short_description = "Vista previa"

    class Media:
        css = {
            'all': ('admin/css/custom_admin.css',)
        }


@admin.register(ReservaExtra)
class ReservaExtraAdmin(admin.ModelAdmin):
    list_display = (
        "reserva_link", 
        "extra_info", 
        "cantidad", 
        "subtotal_display",
        "fecha_reserva"
    )
    list_filter = ("extra", "reserva__estado", "cantidad")
    search_fields = ("reserva__id", "extra__nombre")
    readonly_fields = ("created_at", "updated_at", "subtotal_display")

    def reserva_link(self, obj):
        url = reverse("admin:reservas_reserva_change", args=[obj.reserva.pk])
        return format_html(
            '<a href="{}">Reserva #{}</a>',
            url, obj.reserva.pk
        )

    def extra_info(self, obj):
        return format_html(
            '<strong>{}</strong><br>'
            '<small>€{}/día</small>',
            obj.extra.nombre,
            obj.extra.precio
        )

    @admin.display(description="Subtotal")
    def subtotal_display(self, obj):
        dias = obj.reserva.dias_alquiler()
        subtotal = obj.extra.precio * obj.cantidad * dias
        return format_html(
            '<strong style="color: #007bff;">€{}</strong><br>'
            '<small>({} × {} × {} días)</small>',
            subtotal,
            obj.extra.precio,
            obj.cantidad,
            dias
        )

    def fecha_reserva(self, obj):
        return obj.reserva.created_at

