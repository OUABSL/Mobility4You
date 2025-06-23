# politicas/admin.py
import logging
from typing import Any, Optional

from django.contrib import admin, messages
from django.contrib.admin import SimpleListFilter
from django.db.models import Avg, Count, Min, Q, Sum
from django.http import HttpRequest
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _
from utils.static_mapping import get_versioned_asset

from .models import (PoliticaIncluye, PoliticaPago, PoliticaPenalizacion,
                     Promocion, TipoPenalizacion)

logger = logging.getLogger("admin_operations")


# ======================
# FILTROS PERSONALIZADOS
# ======================

class DeductibleRangeFilter(SimpleListFilter):
    """Filtro por rango de deducible"""
    title = _("Rango de Deducible")
    parameter_name = "deducible_range"

    def lookups(self, request, model_admin):
        return (
            ("sin_deducible", _("Sin Deducible (€0)")),
            ("bajo", _("Bajo (€1-100)")),
            ("medio", _("Medio (€101-500)")),
            ("alto", _("Alto (€501-1000)")),
            ("muy_alto", _("Muy Alto (>€1000)")),
        )

    def queryset(self, request, queryset):
        if self.value() == "sin_deducible":
            return queryset.filter(deductible=0)
        elif self.value() == "bajo":
            return queryset.filter(deductible__gt=0, deductible__lte=100)
        elif self.value() == "medio":
            return queryset.filter(deductible__gt=100, deductible__lte=500)
        elif self.value() == "alto":
            return queryset.filter(deductible__gt=500, deductible__lte=1000)
        elif self.value() == "muy_alto":
            return queryset.filter(deductible__gt=1000)


class PromocionActivaFilter(SimpleListFilter):
    """Filtro para promociones activas"""
    title = _("Estado de Promoción")
    parameter_name = "promocion_estado"

    def lookups(self, request, model_admin):
        return (
            ("activas", _("Promociones Activas")),
            ("vencidas", _("Promociones Vencidas")),
            ("futuras", _("Promociones Futuras")),
            ("vigentes_hoy", _("Vigentes Hoy")),
        )

    def queryset(self, request, queryset):
        now = timezone.now().date()
        if self.value() == "activas":
            return queryset.filter(activo=True)
        elif self.value() == "vencidas":
            return queryset.filter(fecha_fin__lt=now)
        elif self.value() == "futuras":
            return queryset.filter(fecha_inicio__gt=now)
        elif self.value() == "vigentes_hoy":
            return queryset.filter(
                fecha_inicio__lte=now,
                fecha_fin__gte=now,
                activo=True
            )


# ======================
# INLINES MEJORADOS
# ======================

class PoliticaIncluyeInline(admin.TabularInline):
    model = PoliticaIncluye
    extra = 1
    fields = ["item", "incluye"]
    verbose_name = "Item Incluido"
    verbose_name_plural = "Items Incluidos"

    def get_formset(self, request, obj=None, **kwargs):
        """Personaliza el formset para mejor UX"""
        formset = super().get_formset(request, obj, **kwargs)
        formset.can_delete = True
        return formset


class PoliticaPenalizacionInline(admin.TabularInline):
    model = PoliticaPenalizacion
    extra = 1
    fields = ["tipo_penalizacion", "horas_previas"]
    verbose_name = "Penalización"
    verbose_name_plural = "Penalizaciones"

    def get_formset(self, request, obj=None, **kwargs):
        """Personaliza el formset"""
        formset = super().get_formset(request, obj, **kwargs)
        formset.can_delete = True
        return formset


# ======================
# ADMIN POLÍTICAS DE PAGO
# ======================

@admin.register(PoliticaPago)
class PoliticaPagoAdmin(admin.ModelAdmin):
    """Admin avanzado para políticas de pago"""

    # Media para archivos CSS y JS personalizados
    class Media:
        css = {
            'all': (get_versioned_asset("css", "admin/css/custom_admin_v211d00a2.css"),)
        }
        js = (get_versioned_asset("js_politicas", "admin/js/politicas_admin_va4d427e4.js"),)

    list_display = (
        "titulo_display",
        "deductible_display",
        "items_incluidos_display",
        "penalizaciones_count_display",
        "fecha_display",
        "acciones_display"
    )
    
    list_filter = (
        DeductibleRangeFilter,
        "created_at"
    )
    
    search_fields = (
        "titulo", 
        "descripcion",
        "items__item"
    )
    
    readonly_fields = (
        "created_at", 
        "updated_at",
        "estadisticas_display",
        "resumen_completo_display"
    )

    fieldsets = (
        (
            "📋 Información Básica",
            {
                "fields": (
                    "titulo",
                    ("deductible", "descripcion"),
                    "estadisticas_display"
                ),
                "classes": ["wide"]
            }
        ),
        (
            "🏷️ Resumen de Política",
            {
                "fields": ("resumen_completo_display",),
                "classes": ["wide"]
            }
        ),
        (
            "📅 Fechas",
            {
                "fields": (("created_at", "updated_at"),),
                "classes": ["collapse", "wide"]
            }
        ),    )

    inlines = [PoliticaIncluyeInline, PoliticaPenalizacionInline]

    ordering = ["-created_at"]
    date_hierarchy = "created_at"
    list_per_page = 20
    save_on_top = True
    actions_on_top = True
    actions_on_bottom = True

    # ======================
    # MÉTODOS DE DISPLAY
    # ======================
    
    @admin.display(description="Titulo")
    def titulo_display(self, obj):
        """Muestra el título con información del deducible"""
        deducible_color = "#e74c3c" if obj.deductible > 500 else "#27ae60" if obj.deductible == 0 else "#f39c12"
        
        return format_html(
            '<div class="titulo-politica">'
            '<strong style="color: #2c3e50;">{}</strong><br>'
            '<small style="color: {};">Deducible: €{}</small>'
            '</div>',
            obj.titulo, deducible_color, "{}".format(float(obj.deductible))
        )    

    @admin.display(description="Deductible")
    def deductible_display(self, obj):
        """Muestra el deducible con colores según el rango"""
        if obj.deductible == 0:
            color = "#27ae60"
            nivel = "Sin deducible"
        elif obj.deductible <= 100:
            color = "#3498db"
            nivel = "Bajo"
        elif obj.deductible <= 500:
            color = "#f39c12"
            nivel = "Medio"
        else:
            color = "#e74c3c"
            nivel = "Alto"
        
        return format_html(
            '<div class="deducible-display">'
            '<span style="color: {}; font-weight: bold; font-size: 14px;">€{}</span><br>'
            '<small style="color: #7f8c8d;">{}</small>'
            '</div>',
            color, "{}".format(float(obj.deductible)), nivel
        )


    @admin.display(description="Items Incluidos")
    def items_incluidos_display(self, obj):
        """Muestra resumen de items incluidos"""
        items = obj.items.all()
        if not items:
            return format_html('<span style="color: #95a5a6;">Sin items</span>')
        
        incluidos = items.filter(incluye=True).count()
        no_incluidos = items.filter(incluye=False).count()
        
        return format_html(
            '<div class="items-incluidos">'
            '<span style="color: #27ae60;">✅ {}</span> / '
            '<span style="color: #e74c3c;">❌ {}</span><br>'
            '<small style="color: #7f8c8d;">Total: {} items</small>'
            '</div>',
            incluidos, no_incluidos, items.count()
        )

    @admin.display(description="Penalizaciones Count")
    def penalizaciones_count_display(self, obj):
        """Muestra la cantidad de penalizaciones"""
        penalizaciones = obj.penalizaciones.all()
        if not penalizaciones:
            return format_html('<span style="color: #95a5a6;">Sin penalizaciones</span>')
        
        return format_html(
            '<div class="penalizaciones-count">'
            '<span style="color: #e67e22; font-weight: bold;">{}</span><br>'
            '<small style="color: #7f8c8d;">penalizaciones</small>'
            '</div>',
            penalizaciones.count()
        )

    @admin.display(description="Fecha")
    def fecha_display(self, obj):
        """Muestra la fecha de creación"""
        from django.utils.timesince import timesince
        
        return format_html(
            '<div class="fecha-display">'
            '<strong>{}</strong><br>'
            '<small style="color: #7f8c8d;">hace {}</small>'
            '</div>',
            obj.created_at.strftime("%d/%m/%Y"),
            timesince(obj.created_at)
        )


    @admin.display(description="Acciones")
    def acciones_display(self, obj):
        """Muestra acciones rápidas"""
        acciones = []
        
        # Duplicar política
        acciones.append(
            format_html(
                '<a href="#" class="btn-duplicate-policy" data-policy-id="{}" '
                'style="background: #3498db; color: white; padding: 2px 6px; '
                'border-radius: 3px; text-decoration: none; font-size: 10px;">'
                '📋 Duplicar</a>',
                obj.id
            )
        )
        
        # Ver resumen completo
        acciones.append(
            format_html(
                '<a href="#" class="btn-view-summary" data-policy-id="{}" '
                'style="background: #2c3e50; color: white; padding: 2px 6px; '
                'border-radius: 3px; text-decoration: none; font-size: 10px;">'
                '👁️ Resumen</a>',
                obj.id
            )
        )
        
        return mark_safe(
            f'<div class="acciones-politica">{"<br>".join(acciones)}</div>'
        )


    @admin.display(description="Estadisticas")
    def estadisticas_display(self, obj):
        """Muestra estadísticas de la política"""
        from django.utils.timesince import timesince
        
        stats = []
        stats.append(f"Creada: hace {timesince(obj.created_at)}")
        
        items_total = obj.items.count()
        if items_total > 0:
            incluidos = obj.items.filter(incluye=True).count()
            stats.append(f"Items: {incluidos}/{items_total} incluidos")
        
        penalizaciones_total = obj.penalizaciones.count()
        if penalizaciones_total > 0:
            stats.append(f"Penalizaciones: {penalizaciones_total}")
        
        return format_html(
            '<div class="estadisticas-politica" style="font-size: 11px; color: #7f8c8d;">{}</div>',
            "<br>".join(stats)
        )

    @admin.display(description="Resumen Completo")
    def resumen_completo_display(self, obj):
        """Muestra un resumen completo de la política"""
        html_parts = []
        
        # Información básica
        html_parts.append('<strong>Deducible:</strong> €{}'.format(obj.deductible))
          # Items incluidos
        items = obj.items.all()
        if items:
            incluidos = [item.item for item in items if item.incluye]
            no_incluidos = [item.item for item in items if not item.incluye]
            
            if incluidos:
                html_parts.append('<strong>✅ Incluye:</strong> {}'.format(", ".join(incluidos)))
            if no_incluidos:
                html_parts.append('<strong>❌ No incluye:</strong> {}'.format(", ".join(no_incluidos)))
        
        # Penalizaciones
        penalizaciones = obj.penalizaciones.all()
        if penalizaciones:
            pen_list = []
            for pen in penalizaciones:
                pen_list.append("{} ({}h previas)".format(pen.tipo_penalizacion.nombre, pen.horas_previas))
            html_parts.append('<strong>⚠️ Penalizaciones:</strong> {}'.format(", ".join(pen_list)))
        
        return format_html(
            '<div class="resumen-completo" style="background: #f8f9fa; padding: 10px; border-radius: 4px;">{}</div>',
            "<br>".join(html_parts)
        )


    # ======================
    # ACCIONES ADMINISTRATIVAS
    # ======================

    @admin.action(description="📊 Generar reporte de políticas")
    def generar_reporte_politicas(self, request, queryset):
        """Genera un reporte estadístico de las políticas seleccionadas"""
        stats = {
            "total": queryset.count(),
            "con_deducible": queryset.filter(deductible__gt=0).count(),
            "sin_deducible": queryset.filter(deductible=0).count(),
            "deducible_promedio": queryset.aggregate(Avg("deductible"))["deductible__avg"] or 0,
        }
        # Deducible máximo y mínimo
        deducible_max = queryset.aggregate(Sum("deductible"))["deductible__sum"] or 0
        deducible_min = queryset.aggregate(Min("deductible"))["deductible__min"] or 0

        mensaje_stats = (
            "📊 REPORTE DE POLÍTICAS:\n"
            "• Total políticas: {}\n"
            "• Con deducible: {}\n"
            "• Sin deducible: {}\n"
            "• Deducible promedio: €{}\n"
        ).format(
            stats['total'],
            stats['con_deducible'],
            stats['sin_deducible'],
            stats['deducible_promedio']
        )
        
        self.message_user(request, mensaje_stats, level=messages.INFO)

    actions = ["generar_reporte_politicas"]


# ======================
# ADMIN ITEMS INCLUIDOS
# ======================

@admin.register(PoliticaIncluye)
class PoliticaIncluyeAdmin(admin.ModelAdmin):
    """Admin para items incluidos en políticas"""

    list_display = ("politica_display", "item_display", "incluye_display")
    list_filter = ("incluye", "politica")
    search_fields = ("item", "politica__titulo")

    @admin.display(description="Politica")
    def politica_display(self, obj):
        """Muestra la política con enlace"""
        from django.urls import reverse
        try:
            url = reverse("admin:politicas_politicapago_change", args=[obj.politica.id])
            return format_html(
                '<a href="{}" style="color: #007bff;">{}</a>',
                url, obj.politica.titulo
            )
        except Exception:
            return obj.politica.titulo


    @admin.display(description="Item")
    def item_display(self, obj):
        """Muestra el item con formato"""
        return format_html(
            '<strong style="color: #2c3e50;">{}</strong>',
            obj.item
        )


    @admin.display(description="Incluye")
    def incluye_display(self, obj):
        """Muestra si incluye con badge"""
        if obj.incluye:
            return format_html(
                '<span class="badge badge-success" style="font-size: 11px;">✅ Incluye</span>'
            )
        else:
            return format_html(
                '<span class="badge badge-danger" style="font-size: 11px;">❌ No incluye</span>'
            )



# ======================
# ADMIN TIPOS DE PENALIZACIÓN
# ======================

@admin.register(TipoPenalizacion)
class TipoPenalizacionAdmin(admin.ModelAdmin):
    """Admin mejorado para tipos de penalización"""

    # Media para archivos CSS y JS personalizados
    class Media:
        css = {
            'all': (get_versioned_asset("css", "admin/css/custom_admin_v211d00a2.css"),)
        }
        js = (get_versioned_asset("js_politicas", "admin/js/politicas_admin_va4d427e4.js"),)

    list_display = (
        "nombre_display",
        "tipo_tarifa_display",
        "valor_tarifa_display",
        "usos_count_display",
        "acciones_display"
    )
    
    list_filter = ("tipo_tarifa",)
    search_fields = ("nombre",)

    fieldsets = (
        (
            "📋 Información del Tipo",
            {
                "fields": (
                    "nombre",
                    ("tipo_tarifa", "valor_tarifa")
                ),
                "classes": ["wide"]
            }
        ),
    )

    @admin.display(description="Nombre")
    def nombre_display(self, obj):
        """Muestra el nombre con formato"""
        return format_html(
            '<strong style="color: #2c3e50;">{}</strong>',
            obj.nombre
        )


    @admin.display(description="Tipo Tarifa")
    def tipo_tarifa_display(self, obj):
        """Muestra el tipo de tarifa con íconos"""
        icon_map = {
            "porcentaje": "📊",
            "fijo": "💰",
            "importe_dia": "📅"
        }
        icon = icon_map.get(obj.tipo_tarifa, "💳")
        return format_html(
            '<span style="font-size: 12px;">{} {}</span>',
            icon, obj.get_tipo_tarifa_display()
        )
    @admin.display(description="Valor Tarifa")
    def valor_tarifa_display(self, obj):
        """Muestra el valor de la tarifa con formato"""
        try:
            # Asegurar que tenemos un valor numérico
            if hasattr(obj, 'valor_tarifa') and obj.valor_tarifa is not None:
                # Convertir a Decimal si es necesario
                from decimal import Decimal
                if isinstance(obj.valor_tarifa, str):
                    valor = float(obj.valor_tarifa.replace(',', '.'))
                else:
                    valor = float(obj.valor_tarifa)
                
                if obj.tipo_tarifa == "porcentaje":
                    return format_html(
                        '<span style="color: #3498db; font-weight: bold;">{}%</span>',
                        valor
                    )
                else:
                    return format_html(
                        '<span style="color: #27ae60; font-weight: bold;">€{}</span>',
                        "{}".format(float(valor))
                    )
            else:
                return format_html('<span style="color: #95a5a6;">No definido</span>')
        except (ValueError, TypeError, AttributeError) as e:
            return format_html(
                '<span style="color: #e74c3c;">Error: {}</span>',
                str(e)[:50]
            )


    @admin.display(description="Usos Count")
    def usos_count_display(self, obj):
        """Muestra cuántas veces se usa este tipo"""
        # Contar políticas que usan este tipo
        count = obj.politicas.count()
        if count == 0:
            return format_html('<span style="color: #95a5a6;">No usado</span>')
        else:
            return format_html(
                '<span style="color: #3498db; font-weight: bold;">{}</span> política{}',
                count, 's' if count != 1 else ''
            )


    @admin.display(description="Acciones")
    def acciones_display(self, obj):
        """Muestra acciones disponibles"""
        return format_html(
            '<a href="#" class="btn-view-policies" data-tipo-id="{}" '
            'style="background: #2c3e50; color: white; padding: 2px 6px; '
            'border-radius: 3px; text-decoration: none; font-size: 10px;">'
            '👁️ Ver Políticas</a>',
            obj.id
        )



# ======================
# ADMIN PENALIZACIONES
# ======================

@admin.register(PoliticaPenalizacion)
class PoliticaPenalizacionAdmin(admin.ModelAdmin):
    """Admin para penalizaciones de políticas"""

    list_display = (
        "politica_display",
        "tipo_penalizacion_display",
        "horas_previas_display"
    )
    
    list_filter = ("tipo_penalizacion", "politica")
    search_fields = ("politica__titulo", "tipo_penalizacion__nombre")

    @admin.display(description="Politica")
    def politica_display(self, obj):
        """Muestra la política con enlace"""
        from django.urls import reverse
        try:
            url = reverse("admin:politicas_politicapago_change", args=[obj.politica.id])
            return format_html(
                '<a href="{}" style="color: #007bff;">{}</a>',
                url, obj.politica.titulo
            )
        except Exception:
            return obj.politica.titulo


    @admin.display(description="Tipo Penalizacion")
    def tipo_penalizacion_display(self, obj):
        """Muestra el tipo de penalización con detalles"""
        return format_html(
            '<div class="tipo-penalizacion">'
            '<strong>{}</strong><br>'
            '<small style="color: #7f8c8d;">{} - €{}</small>'
            '</div>',
            obj.tipo_penalizacion.nombre,
            obj.tipo_penalizacion.get_tipo_tarifa_display(),
            "{}".format(float(obj.tipo_penalizacion.valor_tarifa))
        )


    @admin.display(description="Horas Previas")
    def horas_previas_display(self, obj):
        """Muestra las horas previas con formato"""
        if obj.horas_previas <= 24:
            color = "#e74c3c"
            nivel = "Muy estricto"
        elif obj.horas_previas <= 48:
            color = "#f39c12"
            nivel = "Estricto"
        else:
            color = "#27ae60"
            nivel = "Flexible"
        
        return format_html(
            '<div class="horas-previas">'
            '<span style="color: {}; font-weight: bold;">{} horas</span><br>'
            '<small style="color: #7f8c8d;">{}</small>'
            '</div>',
            color, obj.horas_previas, nivel
        )



# ======================
# ADMIN PROMOCIONES MEJORADO
# ======================

@admin.register(Promocion)
class PromocionAdmin(admin.ModelAdmin):
    """Admin avanzado para promociones"""

    # Media para archivos CSS y JS personalizados
    class Media:
        css = {
            'all': (get_versioned_asset("css", "admin/css/custom_admin_v211d00a2.css"),)
        }
        js = (get_versioned_asset("js_politicas", "admin/js/politicas_admin_va4d427e4.js"),)

    list_display = (
        "nombre_display",
        "descuento_display",
        "vigencia_display",
        "estado_display",
        "acciones_display"
    )
    
    list_filter = (
        PromocionActivaFilter,
        "activo",
        "fecha_inicio",
        "fecha_fin"
    )
    
    search_fields = ("nombre", "descripcion")
    
    readonly_fields = (
        "estadisticas_display",
        "tiempo_restante_display"
    )

    fieldsets = (
        (
            "🏷️ Información de la Promoción",
            {
                "fields": (
                    "nombre",
                    ("descuento_pct", "activo"),
                    "descripcion",
                    "estadisticas_display"
                ),
                "classes": ["wide"]
            }
        ),
        (
            "📅 Vigencia",
            {
                "fields": (
                    ("fecha_inicio", "fecha_fin"),
                    "tiempo_restante_display"
                ),
                "classes": ["wide"]
            }
        ),
    )

    ordering = ["-fecha_inicio"]
    date_hierarchy = "fecha_inicio"
    list_per_page = 25
    save_on_top = True
    actions_on_top = True
    actions_on_bottom = True

    @admin.display(description="Nombre")
    def nombre_display(self, obj):
        """Muestra el nombre con indicador de estado"""
        now = timezone.now().date()
        
        if obj.fecha_inicio <= now <= obj.fecha_fin and obj.activo:
            icon = "✅"
            color = "#27ae60"
        elif obj.fecha_fin < now:
            icon = "⏰"
            color = "#95a5a6"
        elif obj.fecha_inicio > now:
            icon = "🔮"
            color = "#3498db"
        else:
            icon = "⭕"
            color = "#e74c3c"
        
        return format_html(
            '<div class="nombre-promocion">'
            '{} <strong style="color: {};">{}</strong>'
            '</div>',
            icon, color, obj.nombre
        )


    @admin.display(description="Descuento")
    def descuento_display(self, obj):
        """Muestra el descuento con formato destacado"""
        return format_html(
            '<span style="color: #e74c3c; font-weight: bold; font-size: 16px;">{}%</span>',
            obj.descuento_pct
        )


    @admin.display(description="Vigencia")
    def vigencia_display(self, obj):
        """Muestra el período de vigencia"""
        return format_html(
            '<div class="vigencia-display">'
            '<strong>{}</strong><br>'
            '<small style="color: #7f8c8d;">hasta {}</small>'
            '</div>',
            obj.fecha_inicio.strftime("%d/%m/%Y"),
            obj.fecha_fin.strftime("%d/%m/%Y")
        )


    @admin.display(description="Estado")
    def estado_display(self, obj):
        """Muestra el estado de la promoción"""
        now = timezone.now().date()
        
        if obj.fecha_inicio <= now <= obj.fecha_fin and obj.activo:
            return format_html(
                '<span class="badge badge-success" style="font-size: 11px;">✅ ACTIVA</span>'
            )
        elif obj.fecha_fin < now:
            return format_html(
                '<span class="badge badge-secondary" style="font-size: 11px;">⏰ VENCIDA</span>'
            )
        elif obj.fecha_inicio > now:
            return format_html(
                '<span class="badge badge-info" style="font-size: 11px;">🔮 FUTURA</span>'
            )
        else:
            return format_html(
                '<span class="badge badge-danger" style="font-size: 11px;">⭕ INACTIVA</span>'
            )


    @admin.display(description="Acciones")
    def acciones_display(self, obj):
        """Muestra acciones disponibles"""
        acciones = []
        now = timezone.now().date()
        
        # Toggle activo/inactivo
        if obj.activo:
            acciones.append(
                format_html(
                    '<a href="#" class="btn-toggle-promo" data-promo-id="{}" data-action="deactivate" '
                    'style="background: #95a5a6; color: white; padding: 2px 6px; '
                    'border-radius: 3px; text-decoration: none; font-size: 10px;">'
                    '⭕ Desactivar</a>',
                    obj.id
                )
            )
        else:
            acciones.append(
                format_html(
                    '<a href="#" class="btn-toggle-promo" data-promo-id="{}" data-action="activate" '
                    'style="background: #27ae60; color: white; padding: 2px 6px; '
                    'border-radius: 3px; text-decoration: none; font-size: 10px;">'
                    '✅ Activar</a>',
                    obj.id
                )
            )
        
        # Extender vigencia si está por vencer
        if obj.fecha_fin - now <= timezone.timedelta(days=7) and obj.activo:
            acciones.append(
                format_html(
                    '<a href="#" class="btn-extend-promo" data-promo-id="{}" '
                    'style="background: #f39c12; color: white; padding: 2px 6px; '
                    'border-radius: 3px; text-decoration: none; font-size: 10px;">'
                    '⏰ Extender</a>',
                    obj.id
                )
            )
        
        return mark_safe(
            f'<div class="acciones-promocion">{"<br>".join(acciones)}</div>'
        ) if acciones else format_html('<span style="color: #95a5a6;">Sin acciones</span>')


    @admin.display(description="Estadisticas")
    def estadisticas_display(self, obj):
        """Muestra estadísticas de la promoción"""
        from django.utils.timesince import timesince, timeuntil
        
        stats = []
        now = timezone.now().date()
        
        # Tiempo hasta inicio o desde inicio
        if obj.fecha_inicio > now:
            stats.append(f"Inicia en: {timeuntil(obj.fecha_inicio)}")
        else:
            stats.append(f"Iniciada: hace {timesince(obj.fecha_inicio)}")
        
        # Tiempo hasta fin
        if obj.fecha_fin >= now:
            stats.append(f"Termina en: {timeuntil(obj.fecha_fin)}")
        else:
            stats.append(f"Terminó: hace {timesince(obj.fecha_fin)}")
        
        # Duración total
        duracion = obj.fecha_fin - obj.fecha_inicio
        stats.append(f"Duración: {duracion.days} días")
        
        return format_html(
            '<div class="estadisticas-promocion" style="font-size: 11px; color: #7f8c8d;">{}</div>',
            "<br>".join(stats)
        )


    @admin.display(description="Tiempo Restante")
    def tiempo_restante_display(self, obj):
        """Muestra el tiempo restante de la promoción"""
        now = timezone.now().date()
        
        if obj.fecha_fin < now:
            return format_html(
                '<div style="color: #95a5a6; font-weight: bold;">⏰ VENCIDA</div>'
            )
        elif obj.fecha_inicio > now:
            dias_hasta_inicio = (obj.fecha_inicio - now).days
            return format_html(
                '<div style="color: #3498db; font-weight: bold;">🔮 Inicia en {} días</div>',
                dias_hasta_inicio
            )
        else:
            dias_restantes = (obj.fecha_fin - now).days
            if dias_restantes <= 1:
                color = "#e74c3c"
                urgencia = "🚨 ÚLTIMO DÍA"
            elif dias_restantes <= 7:
                color = "#f39c12"
                urgencia = "⚠️ PRONTO VENCE"
            else:
                color = "#27ae60"
                urgencia = "✅ VIGENTE"
            
            return format_html(
                '<div style="color: {}; font-weight: bold;">{}</div>'
                '<small style="color: #7f8c8d;">{} días restantes</small>',
                color, urgencia, dias_restantes
            )


    # ======================
    # ACCIONES ADMINISTRATIVAS
    # ======================

    @admin.action(description="✅ Activar promociones seleccionadas")
    def activar_promociones(self, request, queryset):
        """Activa promociones seleccionadas"""
        count = queryset.update(activo=True)
        self.message_user(
            request,
            f"✅ {count} promociones activadas exitosamente.",
            level=messages.SUCCESS
        )

    @admin.action(description="⭕ Desactivar promociones seleccionadas")
    def desactivar_promociones(self, request, queryset):
        """Desactiva promociones seleccionadas"""
        count = queryset.update(activo=False)
        self.message_user(
            request,
            f"⭕ {count} promociones desactivadas exitosamente.",
            level=messages.SUCCESS
        )

    @admin.action(description="📊 Generar reporte de promociones")
    def generar_reporte_promociones(self, request, queryset):
        """Genera un reporte estadístico de las promociones seleccionadas"""
        stats = {
            "total": queryset.count(),
            "activas": queryset.filter(activo=True).count(),
            "inactivas": queryset.filter(activo=False).count(),
            "descuento_promedio": queryset.aggregate(Avg("descuento_pct"))["descuento_pct__avg"] or 0,
        }
        
        # Promociones vigentes hoy
        now = timezone.now().date()
        vigentes_hoy = queryset.filter(
            fecha_inicio__lte=now,
            fecha_fin__gte=now,
            activo=True        ).count()
        
        mensaje_stats = (
            "📊 REPORTE DE PROMOCIONES:\n"
            "• Total promociones: {}\n"
            "• Activas: {}\n"
            "• Inactivas: {}\n"
            "• Vigentes hoy: {}\n"
            "• Descuento promedio: {}%\n"
        ).format(
            stats['total'],
            stats['activas'],
            stats['inactivas'],
            vigentes_hoy,
            stats['descuento_promedio']
        )
        
        self.message_user(request, mensaje_stats, level=messages.INFO)

    actions = [
        "activar_promociones",
        "desactivar_promociones",
        "generar_reporte_promociones"
    ]


