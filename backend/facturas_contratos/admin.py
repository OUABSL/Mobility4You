# facturas_contratos/admin.py
import logging

from django.contrib import admin, messages
from django.contrib.admin import SimpleListFilter
from django.db.models import Count, Q, Sum
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _
from utils.static_mapping import get_versioned_asset

from .models import Contrato, Factura
from .utils import (generar_contrato_pdf, generar_factura_pdf,
                    generar_numero_contrato, generar_numero_factura)

logger = logging.getLogger("admin_operations")


def safe_float(value, default=0.0):
    """
    Convierte un valor a float de forma segura, manejando casos especiales
    como SafeString, Decimal, None, etc.
    """
    if value is None:
        return default
    try:
        # Si es un string (incluyendo SafeString), limpiar y convertir
        if isinstance(value, (str, type(format_html('')))):
            # Remover cualquier formato HTML si existe
            import re
            clean_value = re.sub(r'<[^>]+>', '', str(value))
            clean_value = clean_value.replace('€', '').replace(',', '.').strip()
            return float(clean_value) if clean_value else default
        else:
            return float(value)
    except (ValueError, TypeError, AttributeError):
        return default


class EstadoFilter(SimpleListFilter):
    """Filtro personalizado para estados"""
    title = _("Estado")
    parameter_name = "estado"

    def lookups(self, request, model_admin):
        return (
            ("pendiente", _("Pendientes")),
            ("completado", _("Completados")),
            ("problemas", _("Con Problemas")),
        )

    def queryset(self, request, queryset):
        if self.value() == "pendiente":
            return queryset.filter(estado="pendiente")
        elif self.value() == "completado":
            if isinstance(queryset.model, Contrato):
                return queryset.filter(estado="firmado")
            else:  # Factura
                return queryset.filter(estado="emitida")
        elif self.value() == "problemas":
            return queryset.filter(estado="anulado")


class FechaFilter(SimpleListFilter):
    """Filtro por fecha"""
    title = _("Fecha")
    parameter_name = "fecha"

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
            fecha_field = "fecha_firma" if hasattr(queryset.model, 'fecha_firma') else "fecha_emision"
            return queryset.filter(**{f"{fecha_field}__date": now.date()})
        elif self.value() == "semana":
            start_week = now - timezone.timedelta(days=now.weekday())
            fecha_field = "fecha_firma" if hasattr(queryset.model, 'fecha_firma') else "fecha_emision"
            return queryset.filter(**{f"{fecha_field}__gte": start_week})
        elif self.value() == "mes":
            fecha_field = "fecha_firma" if hasattr(queryset.model, 'fecha_firma') else "fecha_emision"
            return queryset.filter(**{
                f"{fecha_field}__year": now.year,
                f"{fecha_field}__month": now.month
            })
        elif self.value() == "trimestre":
            quarter_start = now.replace(month=((now.month-1)//3)*3+1, day=1)
            fecha_field = "fecha_firma" if hasattr(queryset.model, 'fecha_firma') else "fecha_emision"
            return queryset.filter(**{f"{fecha_field}__gte": quarter_start})


@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    """Admin avanzado para contratos"""
    
    # Media para archivos CSS personalizados
    class Media:
        css = {
            'all': (get_versioned_asset("css", "admin/css/custom_admin_veeb3cfb9.css"),)
        }

    list_display = (
        "numero_contrato_display",
        "reserva_info",
        "estado_display",
        "fecha_firma_display",
        "tiempo_transcurrido",
        "acciones_display",
    )

    list_filter = (
        EstadoFilter,
        FechaFilter,
        "estado",
        "fecha_firma",
        "reserva__estado",
    )

    search_fields = (
        "numero_contrato",
        "reserva__id",
        "reserva__usuario__email",
        "reserva__usuario__first_name",
        "reserva__usuario__last_name",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "estadisticas_display",
        "reserva_detalle_display",
        "pdf_actions_display",
    )

    fieldsets = (
        (
            "📄 Información del Contrato",
            {
                "fields": (
                    ("reserva", "numero_contrato"),
                    ("estado", "fecha_firma"),
                    "estadisticas_display"
                ),
                "classes": ["wide"]
            },
        ),
        (
            "📝 Detalles del Contrato",
            {
                "fields": (
                    "condiciones",
                    "archivo_pdf",
                    "url_pdf",
                    "pdf_actions_display",
                ),
                "classes": ["wide"]
            },
        ),
        (
            "🔗 Información de la Reserva",
            {
                "fields": ["reserva_detalle_display"],
                "classes": ["collapse", "wide"]
            },
        ),
        (
            "📅 Fechas",
            {
                "fields": (
                    ("created_at", "updated_at"),
                ),
                "classes": ["collapse", "wide"],
            },
        ),
    )

    ordering = ["-created_at"]
    date_hierarchy = "fecha_firma"
    list_per_page = 25
    save_on_top = True
    actions_on_top = True
    actions_on_bottom = True

    @admin.display(description="Numero Contrato")
    def numero_contrato_display(self, obj):
        """Muestra el número de contrato con estado visual"""
        icon_map = {
            "pendiente": "⏳",
            "firmado": "✅",
            "anulado": "❌"
        }
        icon = icon_map.get(obj.estado, "📄")
        
        return format_html(
            '<div class="numero-contrato">'
            '{} <strong >{}</strong>'
            '</div>',
            icon, obj.numero_contrato
        )
    

    def reserva_info(self, obj):
        """Muestra información de la reserva asociada"""
        if obj.reserva:
            try:
                url = reverse("admin:reservas_reserva_change", args=[obj.reserva.id])
                return format_html(
                    '<div class="reserva-info">'
                    '<a href="{}" style="color: #007bff; font-weight: bold;">📋 Reserva #{}</a><br/>'
                    '<small style="color: #7f8c8d;">{}</small><br/>'
                    '<small style="color: #7f8c8d;">{}</small>'
                    '</div>',
                    url,
                    obj.reserva.id,
                    obj.reserva.usuario.get_full_name() if obj.reserva.usuario else "Sin usuario",
                    obj.reserva.estado
                )
            except Exception:
                return format_html(
                    '<span style="color: #e74c3c;">Error cargando reserva #{}</span>',
                    obj.reserva.id
                )
        return format_html('<span style="color: #95a5a6;">Sin reserva</span>')
    

    @admin.display(description="Estado")
    def estado_display(self, obj):
        """Muestra el estado con badge"""
        badge_map = {
            "pendiente": ("warning", "⏳"),
            "firmado": ("success", "✅"),
            "anulado": ("danger", "❌")
        }
        badge_class, icon = badge_map.get(obj.estado, ("secondary", "📄"))
        
        return format_html(
            '<span class="badge badge-{}" style="font-size: 12px;">'
            '{} {}'
            '</span>',
            badge_class, icon, obj.get_estado_display()
        )
    

    @admin.display(description="Fecha Firma")
    def fecha_firma_display(self, obj):
        """Muestra la fecha de firma formateada"""
        if obj.fecha_firma:
            from django.utils.timesince import timesince
            return format_html(
                '<div class="fecha-firma">'
                '<strong>{}</strong><br/>'
                '<small style="color: #7f8c8d;">hace {}</small>'
                '</div>',
                obj.fecha_firma.strftime("%d/%m/%Y"),
                timesince(obj.fecha_firma)
            )
        return format_html('<span style="color: #95a5a6;">Sin firmar</span>')
    

    def tiempo_transcurrido(self, obj):
        """Muestra el tiempo transcurrido desde la creación"""
        from django.utils.timesince import timesince
        
        if obj.fecha_firma:
            tiempo = obj.fecha_firma - obj.created_at.date()
            dias = tiempo.days
            if dias == 0:
                return format_html('<span style="color: #27ae60;">⚡ Mismo día</span>')
            elif dias <= 7:
                return format_html('<span style="color: #f39c12;">📅 {} días</span>', dias)
            else:
                return format_html('<span style="color: #e74c3c;">⏰ {} días</span>', dias)
        else:
            tiempo_pendiente = timezone.now().date() - obj.created_at.date()
            return format_html(
                '<span style="color: #95a5a6;">⏳ {} días pendiente</span>',
                tiempo_pendiente.days
            )
    

    @admin.display(description="Acciones")
    def acciones_display(self, obj):
        """Muestra acciones disponibles"""
        acciones = []
        
        # Descargar PDF
        if obj.url_pdf:
            acciones.append(
                format_html(
                    '<a href="{}" target="_blank" '
                    'style="background: #e74c3c; color: white; padding: 2px 6px; '
                    'border-radius: 3px; text-decoration: none; font-size: 16x; margin-bottom: 5px;">'
                    '📄 PDF</a>',
                    obj.url_pdf
                )
            )
        
        # Cambiar estado
        if obj.estado == "pendiente":
            acciones.append(
                format_html(
                    '<a href="#" class="btn-firmar-contrato" data-contrato-id="{}" '
                    'style="background: #27ae60; color: white; padding: 2px 6px; '
                    'border-radius: 3px; text-decoration: none; font-size: 16px; margin-bottom: 5px;">'
                    '✅ Firmar</a>',
                    obj.id
                )
            )
        
        # Ver reserva
        if obj.reserva:
            try:
                url = reverse("admin:reservas_reserva_change", args=[obj.reserva.id])
                acciones.append(
                    format_html(
                        '<a href="{}" '
                        'style="background: #3498db; color: white; padding: 2px 6px; '
                        'border-radius: 3px; text-decoration: none; font-size: 16px; margin-bottom: 5px;">'
                        '📋 Reserva</a>',
                        url
                    )
                )
            except Exception:
                pass
        
        return mark_safe(
            f'<div class="acciones-contrato">{"<br/><br/>".join(acciones)}</div>'
        ) if acciones else format_html('<span style="color: #95a5a6;">Sin acciones</span>')    

    @admin.display(description="Estadisticas")
    def estadisticas_display(self, obj):
        """Muestra estadísticas del contrato"""
        from django.utils.timesince import timesince
        
        stats = []
        stats.append("Creado: hace {}".format(timesince(obj.created_at)))
        
        if obj.fecha_firma:
            stats.append("Firmado: hace {}".format(timesince(obj.fecha_firma)))
            tiempo_firma = obj.fecha_firma - obj.created_at.date()
            stats.append("Tiempo para firmar: {} días".format(tiempo_firma.days))
        
        return format_html(
            '<div class="estadisticas-contrato" style="font-size: 11px; color: #7f8c8d;">{}</div>',
            "<br/>".join(stats)
        )
    

    @admin.display(description="Acciones PDF")
    def pdf_actions_display(self, obj):
        """Muestra botones para generar y descargar PDFs"""
        actions_html = []
        
        # Botón para generar PDF
        if not obj.archivo_pdf:
            actions_html.append(
                f'<button type="button" onclick="generarContratoPDF({obj.id})" '
                f'class="btn btn-primary btn-sm">📄 Generar PDF</button>'
            )
        else:
            # Enlace para descargar PDF existente
            actions_html.append(
                f'<a href="{obj.archivo_pdf.url}" target="_blank" '
                f'class="btn btn-success btn-sm">📥 Descargar PDF</a>'
            )
            
            # Botón para regenerar PDF
            actions_html.append(
                f'<button type="button" onclick="generarContratoPDF({obj.id})" '
                f'class="btn btn-warning btn-sm">🔄 Regenerar PDF</button>'
            )
        
        return format_html(
            '<div class="pdf-actions" style="margin: 10px 0;">'
            '{}'
            '</div>',
            ' '.join(actions_html)
        )

    @admin.display(description="Reserva Detalle")
    def reserva_detalle_display(self, obj):
        """Muestra detalles completos de la reserva"""
        if not obj.reserva:
            return "Sin reserva asociada"
        
        reserva = obj.reserva
        return format_html(
            '<div class="reserva-detalle" style="font-size: 12px;">'
            '<p><strong>ID:</strong> #{}</p>'
            '<p><strong>Cliente:</strong> {} ({})</p>'
            '<p><strong>Estado:</strong> {}</p>'
            '<p><strong>Vehículo:</strong> {}</p>'
            '<p><strong>Fechas:</strong> {} - {}</p>'
            '<p><strong>Importe:</strong> €{}</p>'
            '</div>',
            reserva.id,
            reserva.usuario.get_full_name() if reserva.usuario else "Sin usuario",
            reserva.usuario.email if reserva.usuario else "Sin email",
            reserva.estado,
            "{} {}".format(reserva.vehiculo.marca, reserva.vehiculo.modelo) if reserva.vehiculo else "Sin vehículo",
            reserva.fecha_recogida.strftime("%d/%m/%Y") if reserva.fecha_recogida else "N/A",
            reserva.fecha_devolucion.strftime("%d/%m/%Y") if reserva.fecha_devolucion else "N/A",
            reserva.precio_total if hasattr(reserva, 'precio_total') else "N/A"
        )
    

    # Acciones administrativas
    @admin.action(description="✅ Marcar contratos como firmados")
    def marcar_firmados(self, request, queryset):
        """Marca contratos como firmados"""
        count = queryset.filter(estado="pendiente").update(
            estado="firmado",
            fecha_firma=timezone.now().date()
        )
        self.message_user(
            request,
            f"✅ {count} contratos marcados como firmados.",
            level=messages.SUCCESS
        )

    @admin.action(description="📊 Generar reporte de contratos")
    def generar_reporte_contratos(self, request, queryset):
        """Genera reporte de contratos"""
        stats = {
            'total': queryset.count(),
            'pendientes': queryset.filter(estado="pendiente").count(),
            'firmados': queryset.filter(estado="firmado").count(),
            'anulados': queryset.filter(estado="anulado").count(),        }
        
        mensaje = (
            "📊 REPORTE DE CONTRATOS:\n"
            "• Total: {}\n"
            "• Pendientes: {}\n"
            "• Firmados: {} ({}%)\n"
            "• Anulados: {}\n"
        ).format(
            stats['total'],
            stats['pendientes'],
            stats['firmados'],
            (stats['firmados']/stats['total']*100) if stats['total'] > 0 else 0,
            stats['anulados']
        )
        
        self.message_user(request, mensaje, level=messages.INFO)

    @admin.action(description="📄 Generar PDFs de contratos seleccionados")
    def generar_pdfs_contratos(self, request, queryset):
        """Genera PDFs para los contratos seleccionados"""
        generados = 0
        errores = 0
        
        for contrato in queryset:
            try:
                # Generar PDF del contrato
                pdf_path = generar_contrato_pdf(contrato)
                if pdf_path:
                    generados += 1
                else:
                    errores += 1
            except Exception as e:
                errores += 1
                
        if generados > 0:
            self.message_user(
                request,
                f"✅ {generados} PDFs de contratos generados exitosamente.",
                level=messages.SUCCESS
            )
        
        if errores > 0:
            self.message_user(
                request,
                f"❌ {errores} contratos tuvieron errores al generar PDF.",
                level=messages.ERROR
            )

    actions = ["marcar_firmados", "generar_reporte_contratos", "generar_pdfs_contratos"]

    def get_queryset(self, request):
        """Optimiza consultas"""
        return super().get_queryset(request).select_related("reserva", "reserva__usuario", "reserva__vehiculo")


@admin.register(Factura)
class FacturaAdmin(admin.ModelAdmin):
    """Admin avanzado para facturas"""
    
    # Media para archivos CSS personalizados
    class Media:
        css = {
            'all': (get_versioned_asset("css", "admin/css/custom_admin_veeb3cfb9.css"),)
        }

    list_display = (
        "numero_factura_display",
        "reserva_info",
        "fecha_emision_display",
        "importe_display",
        "estado_display",
        "acciones_display",
    )

    list_filter = (
        EstadoFilter,
        FechaFilter,
        "estado",
        "fecha_emision",
        "reserva__estado",
    )

    search_fields = (
        "numero_factura",
        "reserva__id",
        "reserva__usuario__email",
        "reserva__usuario__first_name",
        "reserva__usuario__last_name",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "estadisticas_display",
        "desglose_display",
        "reserva_detalle_display",
        "pdf_actions_display",
    )

    fieldsets = (
        (
            "🧾 Información de la Factura",
            {
                "fields": (
                    ("reserva", "numero_factura"),
                    ("fecha_emision", "estado"),
                    "estadisticas_display"
                ),
                "classes": ["wide"]
            },
        ),
        (
            "💰 Importes",
            {
                "fields": (
                    ("base_imponible", "iva"),
                    "total",
                    "desglose_display"
                ),
                "classes": ["wide"]
            },
        ),
        (
            "📄 Documentación",
            {
                "fields": [
                    "archivo_pdf",
                    "url_pdf",
                    "pdf_actions_display"
                ],
                "classes": ["wide"]
            }
        ),
        (
            "🔗 Información de la Reserva",
            {
                "fields": ["reserva_detalle_display"],
                "classes": ["collapse", "wide"]
            },
        ),
        (
            "📅 Fechas",
            {
                "fields": (
                    ("created_at", "updated_at"),
                ),
                "classes": ["collapse", "wide"],
            },
        ),
    )

    ordering = ["-fecha_emision"]
    date_hierarchy = "fecha_emision"
    list_per_page = 25
    save_on_top = True
    actions_on_top = True
    actions_on_bottom = True

    @admin.display(description="Numero Factura")
    def numero_factura_display(self, obj):
        """Muestra el número de factura con estado visual"""
        icon_map = {
            "pendiente": "⏳",
            "emitida": "✅",
            "anulada": "❌"
        }
        icon = icon_map.get(obj.estado, "🧾")
        
        return format_html(
            '<div class="numero-factura">'
            '{} <strong >{}</strong>'
            '</div>',
            icon, obj.numero_factura
        )
    

    def reserva_info(self, obj):
        """Muestra información de la reserva asociada"""
        if obj.reserva:
            try:
                url = reverse("admin:reservas_reserva_change", args=[obj.reserva.id])
                return format_html(
                    '<div class="reserva-info">'
                    '<a href="{}" style="color: #007bff; font-weight: bold;">📋 Reserva #{}</a><br/>'
                    '<small style="color: #7f8c8d;">{}</small><br/>'
                    '<small style="color: #7f8c8d;">{}</small>'
                    '</div>',
                    url,
                    obj.reserva.id,
                    obj.reserva.usuario.get_full_name() if obj.reserva.usuario else "Sin usuario",
                    obj.reserva.estado
                )
            except Exception:
                return format_html(
                    '<span style="color: #e74c3c;">Error cargando reserva #{}</span>',
                    obj.reserva.id
                )
        return format_html('<span style="color: #95a5a6;">Sin reserva</span>')
    

    @admin.display(description="Fecha Emision")
    def fecha_emision_display(self, obj):
        """Muestra la fecha de emisión formateada"""
        from django.utils.timesince import timesince
        return format_html(
            '<div class="fecha-emision">'
            '<strong>{}</strong><br/>'
            '<small style="color: #7f8c8d;">hace {}</small>'
            '</div>',
            obj.fecha_emision.strftime("%d/%m/%Y"),
            timesince(obj.fecha_emision)
        )
    

    @admin.display(description="Importe")
    def importe_display(self, obj):
        """Muestra el importe total con desglose"""
        try:
            # Usar función helper para convertir a float de forma segura
            total = safe_float(obj.total)
            base = safe_float(obj.base_imponible)
            iva = safe_float(obj.iva)
            
            return format_html(
                '<div class="importe-factura">'
                '<strong style="color: #2c3e50; font-size: 14px;">€{}</strong><br/>'
                '<small style="color: #7f8c8d;">Base: €{}</small><br/>'
                '<small style="color: #7f8c8d;">IVA: €{}</small>'
                '</div>',
                total,
                base,
                iva
            )
        except Exception as e:
            return format_html(
                '<span style="color: #e74c3c;">Error: {}</span>',
                str(e)[:50]
            )
    

    @admin.display(description="Estado")
    def estado_display(self, obj):
        """Muestra el estado con badge"""
        badge_map = {
            "pendiente": ("warning", "⏳"),
            "emitida": ("success", "✅"),
            "anulada": ("danger", "❌")
        }
        badge_class, icon = badge_map.get(obj.estado, ("secondary", "🧾"))
        
        return format_html(
            '<span class="badge badge-{}" style="font-size: 12px;">'
            '{} {}'
            '</span>',
            badge_class, icon, obj.get_estado_display()
        )
    

    @admin.display(description="Acciones")
    def acciones_display(self, obj):
        """Muestra acciones disponibles"""
        acciones = []
        
        # Descargar PDF
        if obj.url_pdf:
            acciones.append(
                format_html(
                    '<a href="{}" target="_blank" '
                    'style="background: #e74c3c; color: white; padding: 2px 6px; '
                    'border-radius: 3px; text-decoration: none; font-size: 16px; margin-bottom: 5px;">'
                    '📄 PDF</a>',
                    obj.url_pdf
                )
            )
        
        # Cambiar estado
        if obj.estado == "pendiente":
            acciones.append(
                format_html(
                    '<a href="#" class="btn-emitir-factura" data-factura-id="{}" '
                    'style="background: #27ae60; color: white; padding: 2px 6px; '
                    'border-radius: 3px; text-decoration: none; font-size: 16px; margin-bottom: 5px;">'
                    '✅ Emitir</a>',
                    obj.id
                )
            )
        
        # Ver reserva
        if obj.reserva:
            try:
                url = reverse("admin:reservas_reserva_change", args=[obj.reserva.id])
                acciones.append(
                    format_html(
                        '<a href="{}" '
                        'style="background: #3498db; color: white; padding: 2px 6px; '
                        'border-radius: 3px; text-decoration: none; font-size: 16px; margin-bottom: 5px;">'
                        '📋 Reserva</a>',
                        url
                    )
                )
            except Exception:
                pass
        
        return mark_safe(
            f'<div class="acciones-factura">{"<br/><br/>".join(acciones)}</div>'
        ) if acciones else format_html('<span style="color: #95a5a6;">Sin acciones</span>')
    

    @admin.display(description="Estadisticas")
    def estadisticas_display(self, obj):
        """Muestra estadísticas de la factura"""
        from django.utils.timesince import timesince
        
        stats = []
        stats.append("Creada: hace {}".format(timesince(obj.created_at)))
        
        # Calcular porcentaje de IVA
        if obj.base_imponible and obj.base_imponible > 0:
            porcentaje_iva = (obj.iva / obj.base_imponible) * 100
            stats.append("IVA: {}%".format(porcentaje_iva))
        
        return format_html(
            '<div class="estadisticas-factura" style="font-size: 11px; color: #7f8c8d;">{}</div>',
            "<br/>".join(stats)
        )
    

    @admin.display(description="Desglose")
    def desglose_display(self, obj):
        """Muestra desglose detallado"""
        porcentaje_iva = 0
        if obj.base_imponible and obj.base_imponible > 0:
            porcentaje_iva = (obj.iva / obj.base_imponible) * 100
        
        return format_html(
            '<div class="desglose-factura" style="background: #f8f9fa; padding: 8px; border-radius: 4px;">'
            '<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">'
            '<span>Base Imponible:</span><span><strong>€{}</strong></span>'
            '</div>'
            '<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">'
            '<span>IVA ({}%):</span><span><strong>€{}</strong></span>'
            '</div>'
            '<hr style="margin: 8px 0;">'
            '<div style="display: flex; justify-content: space-between; font-weight: bold; color: #2c3e50;">'
            '<span>TOTAL:</span><span>€{}</span>'
            '</div>'
            '</div>',
            obj.base_imponible,
            porcentaje_iva,
            obj.iva,
            obj.total
        )
    

    @admin.display(description="Acciones PDF")
    def pdf_actions_display(self, obj):
        """Muestra botones para generar y descargar PDFs de facturas"""
        actions_html = []
        
        # Botón para generar PDF
        if not obj.archivo_pdf:
            actions_html.append(
                f'<button type="button" onclick="generarFacturaPDF({obj.id})" '
                f'class="btn btn-primary btn-sm">📄 Generar PDF</button>'
            )
        else:
            # Enlace para descargar PDF existente
            actions_html.append(
                f'<a href="{obj.archivo_pdf.url}" target="_blank" '
                f'class="btn btn-success btn-sm">📥 Descargar PDF</a>'
            )
            
            # Botón para regenerar PDF
            actions_html.append(
                f'<button type="button" onclick="generarFacturaPDF({obj.id})" '
                f'class="btn btn-warning btn-sm">🔄 Regenerar PDF</button>'
            )
        
        return format_html(
            '<div class="pdf-actions" style="margin: 10px 0;">'
            '{}'
            '</div>',
            ' '.join(actions_html)
        )

    @admin.display(description="Reserva Detalle")
    def reserva_detalle_display(self, obj):
        """Muestra detalles completos de la reserva"""
        if not obj.reserva:
            return "Sin reserva asociada"
        
        reserva = obj.reserva
        return format_html(
            '<div class="reserva-detalle" style="font-size: 12px;">'
            '<p><strong>ID:</strong> #{}</p>'
            '<p><strong>Cliente:</strong> {} ({})</p>'
            '<p><strong>Estado:</strong> {}</p>'
            '<p><strong>Vehículo:</strong> {}</p>'
            '<p><strong>Fechas:</strong> {} - {}</p>'
            '</div>',
            reserva.id,
            reserva.usuario.get_full_name() if reserva.usuario else "Sin usuario",
            reserva.usuario.email if reserva.usuario else "Sin email",
            reserva.estado,
            f"{reserva.vehiculo.marca} {reserva.vehiculo.modelo}" if reserva.vehiculo else "Sin vehículo",
            reserva.fecha_recogida.strftime("%d/%m/%Y") if reserva.fecha_recogida else "N/A",
            reserva.fecha_devolucion.strftime("%d/%m/%Y") if reserva.fecha_devolucion else "N/A"
        )
    

    # Acciones administrativas
    @admin.action(description="✅ Marcar facturas como emitidas")
    def marcar_emitidas(self, request, queryset):
        """Marca facturas como emitidas"""
        count = queryset.filter(estado="pendiente").update(estado="emitida")
        self.message_user(
            request,
            f"✅ {count} facturas marcadas como emitidas.",
            level=messages.SUCCESS
        )

    @admin.action(description="📊 Generar reporte de facturación")
    def generar_reporte_facturas(self, request, queryset):
        """Genera reporte de facturación"""
        stats = {
            'total': queryset.count(),
            'pendientes': queryset.filter(estado="pendiente").count(),
            'emitidas': queryset.filter(estado="emitida").count(),
            'anuladas': queryset.filter(estado="anulada").count(),
        }
        
        # Totales monetarios
        totales = queryset.aggregate(
            total_facturado=Sum('total'),
            total_base=Sum('base_imponible'),
            total_iva=Sum('iva')
        )
        
        mensaje = (
            f"📊 REPORTE DE FACTURACIÓN:\n"
            f"• Total facturas: {stats['total']}\n"
            f"• Pendientes: {stats['pendientes']}\n"
            f"• Emitidas: {stats['emitidas']} ({(stats['emitidas']/stats['total']*100):.1f}%)\n"
            f"• Anuladas: {stats['anuladas']}\n\n"
            f"💰 IMPORTES:\n"
            f"• Total facturado: €{totales['total_facturado'] or 0:.2f}\n"
            f"• Base imponible: €{totales['total_base'] or 0:.2f}\n"
            f"• Total IVA: €{totales['total_iva'] or 0:.2f}\n"
        )
        
        self.message_user(request, mensaje, level=messages.INFO)

    @admin.action(description="🧾 Generar PDFs de facturas seleccionadas")
    def generar_pdfs_facturas(self, request, queryset):
        """Genera PDFs para las facturas seleccionadas"""
        generados = 0
        errores = 0
        
        for factura in queryset:
            try:
                # Generar PDF de la factura
                pdf_path = generar_factura_pdf(factura)
                if pdf_path:
                    generados += 1
                else:
                    errores += 1
            except Exception as e:
                errores += 1
                
        if generados > 0:
            self.message_user(
                request,
                f"✅ {generados} PDFs de facturas generados exitosamente.",
                level=messages.SUCCESS
            )
        
        if errores > 0:
            self.message_user(
                request,
                f"❌ {errores} facturas tuvieron errores al generar PDF.",
                level=messages.ERROR
            )

    actions = ["marcar_emitidas", "generar_reporte_facturas", "generar_pdfs_facturas"]

    def get_queryset(self, request):
        """Optimiza consultas"""
        return super().get_queryset(request).select_related("reserva", "reserva__usuario", "reserva__vehiculo")


