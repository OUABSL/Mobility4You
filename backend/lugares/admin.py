# lugares/admin.py
import logging

from django.contrib import admin, messages
from django.contrib.admin import SimpleListFilter
from django.db.models import Count, Q
from django.http import JsonResponse
from django.urls import path
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _
from utils.static_mapping import get_versioned_asset

from .models import Direccion, Lugar

logger = logging.getLogger("admin_operations")


class CiudadFilter(SimpleListFilter):
    """Filtro personalizado por ciudad"""
    title = _("Ciudad")
    parameter_name = "ciudad"

    def lookups(self, request, model_admin):
        ciudades = Direccion.objects.values_list('ciudad', flat=True).distinct().order_by('ciudad')
        return [(ciudad, ciudad) for ciudad in ciudades if ciudad]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(direccion__ciudad=self.value())


@admin.register(Direccion)
class DireccionAdmin(admin.ModelAdmin):
    """Admin mejorado para direcciones"""
    
    # Media para archivos CSS personalizados
    class Media:
        css = {
            'all': (get_versioned_asset("css", "admin/css/custom_admin_vdbcfd5cc.css"),)
        }

    list_display = (
        "direccion_completa",
        "ciudad_display", 
        "provincia_display",
        "pais_display",
        "codigo_postal_display",
        "lugares_asociados",
    )
    list_filter = ("ciudad", "provincia", "pais")
    search_fields = ("calle", "ciudad", "codigo_postal", "provincia")
    ordering = ["ciudad", "provincia", "calle"]
    
    fieldsets = (
        (
            "📍 Información de la Dirección",
            {
                "fields": (
                    ("calle",),
                    ("ciudad", "provincia"),
                    ("pais", "codigo_postal"),
                ),
                "classes": ["wide"]
            },
        ),
    )

    def direccion_completa(self, obj):
        """Muestra la dirección completa con formato"""
        return format_html(
            '<div class="direccion-completa">'
            '<strong >{}</strong><br/>'
            '<small style="color: #7f8c8d;">{}</small>'
            '</div>',
            obj.calle or "Sin calle especificada",
            f"{obj.ciudad}, {obj.provincia}" if obj.ciudad and obj.provincia else "Ubicación incompleta"
        )
    

    @admin.display(description="Ciudad")
    def ciudad_display(self, obj):
        """Muestra la ciudad con ícono"""
        if obj.ciudad:
            return format_html(
                '<span style="color: #3498db;">🏙️ {}</span>',
                obj.ciudad
            )
        return format_html('<span style="color: #95a5a6;">Sin ciudad</span>')
    

    @admin.display(description="Provincia")
    def provincia_display(self, obj):
        """Muestra la provincia"""
        if obj.provincia:
            return format_html(
                '<span >{}</span>',
                obj.provincia
            )
        return format_html('<span style="color: #95a5a6;">Sin provincia</span>')
    

    @admin.display(description="Pais")
    def pais_display(self, obj):
        """Muestra el país con bandera"""
        flag_map = {
            "España": "🇪🇸",
            "France": "🇫🇷", 
            "Portugal": "🇵🇹",
            "Italia": "🇮🇹",
        }
        flag = flag_map.get(obj.pais, "🌍")
        
        return format_html(
            '<span >{} {}</span>',
            flag, obj.pais
        )
    

    @admin.display(description="Codigo Postal")
    def codigo_postal_display(self, obj):
        """Muestra el código postal formateado"""
        return format_html(
            '<code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">{}</code>',
            obj.codigo_postal
        )
    

    def lugares_asociados(self, obj):
        """Muestra los lugares asociados a esta dirección"""
        try:
            lugar = obj.lugar
            if lugar:
                return format_html(
                    '<a href="/admin/lugares/lugar/{}/change/" style="color: #007bff; text-decoration: none;">'
                    '🏢 {}</a>',
                    lugar.id,
                    lugar.nombre
                )
        except Lugar.DoesNotExist:
            pass
        
        return format_html('<span style="color: #95a5a6;">Sin lugares</span>')
    

    def get_queryset(self, request):
        """Optimiza las consultas"""
        return super().get_queryset(request).select_related('lugar')


@admin.register(Lugar)
class LugarAdmin(admin.ModelAdmin):
    """Admin avanzado para lugares"""
    
    # Media para archivos CSS personalizados
    class Media:
        css = {
            'all': (get_versioned_asset("css", "admin/css/custom_admin_vdbcfd5cc.css"),)
        }
        js = (
            get_versioned_asset("js_lugares", "admin/js/lugares_admin_v6ba3dda2.js"),
        )
    
    list_display = (
        "nombre_display",
        "direccion_info", 
        "contacto_info",
        "coordenadas_display",
        "estado_display",
        "popularidad_display",
        "acciones_display",
    )
    list_filter = (
        CiudadFilter,
        "activo", 
        "popular",
        "direccion__provincia"
    )
    search_fields = (
        "nombre", 
        "direccion__ciudad", 
        "direccion__calle",
        "telefono",
        "email"
    )
    readonly_fields = (
        "created_at", 
        "updated_at",
        "coordenadas_info",
        "estadisticas_display"
    )
    ordering = ["-popular", "nombre"]

    fieldsets = (
        (
            "🏢 Información Básica",
            {
                "fields": (
                    "nombre",
                    "direccion",
                    ("activo", "popular"),
                    "estadisticas_display"
                ),
                "classes": ["wide"]
            },
        ),
        (
            "📍 Ubicación",
            {
                "fields": (
                    ("latitud", "longitud"),
                    "coordenadas_info"
                ),
                "classes": ["wide"]
            },
        ),
        (
            "📞 Contacto",
            {
                "fields": (
                    ("telefono", "email"),
                ),
                "classes": ["wide"]
            },
        ),
        (
            "🎨 Adicional",
            {
                "fields": (
                    "icono_url",
                    "info_adicional",
                ),
                "classes": ["wide"]
            },
        ),
        (
            "📅 Timestamps",
            {
                "fields": (
                    ("created_at", "updated_at"),
                ),
                "classes": ["collapse", "wide"],
            },
        ),
    )

    @admin.display(description="Nombre")
    def nombre_display(self, obj):
        """Muestra el nombre con estado visual"""
        icon = "🟢" if obj.activo else "🔴"
        star = "⭐" if obj.popular else ""
        
        return format_html(
            '<div class="nombre-lugar">'
            '{} <strong >{}</strong> {}'
            '</div>',
            icon, obj.nombre, star
        )
    

    def direccion_info(self, obj):
        """Muestra información de la dirección"""
        if obj.direccion:
            return format_html(
                '<div class="direccion-info" style="font-size: 12px;">'
                '<strong >{}</strong><br/>'
                '<span style="color: #7f8c8d;">{}, {}</span><br/>'
                '<code style="background: #f8f9fa; padding: 1px 4px; border-radius: 2px;">{}</code>'
                '</div>',
                obj.direccion.calle or "Sin calle",
                obj.direccion.ciudad or "Sin ciudad",
                obj.direccion.provincia or "Sin provincia",
                obj.direccion.codigo_postal
            )
        return format_html('<span style="color: #e74c3c;">⚠️ Sin dirección</span>')
    

    def contacto_info(self, obj):
        """Muestra información de contacto"""
        contacto_items = []
        
        if obj.telefono:
            contacto_items.append(format_html('📞 <a href="tel:{}" style="color: #007bff;">{}</a>', obj.telefono, obj.telefono))
        
        if obj.email:
            contacto_items.append(format_html('📧 <a href="mailto:{}" style="color: #007bff;">{}</a>', obj.email, obj.email))
        
        if contacto_items:
            return format_html(
                '<div class="contacto-info" style="font-size: 12px;">{}</div>',
                mark_safe("<br/>".join(str(item) for item in contacto_items))
            )
        
        return format_html('<span style="color: #95a5a6;">Sin contacto</span>')
    

    @admin.display(description="Coordenadas")
    def coordenadas_display(self, obj):
        """Muestra las coordenadas con enlace a mapa"""
        if obj.latitud and obj.longitud:
            maps_url = f"https://www.google.com/maps?q={obj.latitud},{obj.longitud}"
            return format_html(
                '<div class="coordenadas" style="font-size: 11px;">'
                '<a href="{}" target="_blank" style="color: #007bff; text-decoration: none;">'
                '🗺️ Ver en mapa</a><br/>'
                '<code style="background: #f8f9fa; padding: 1px 4px; border-radius: 2px;">'
                '{:.6f}, {:.6f}'
                '</code>'
                '</div>',
                maps_url,
                float(obj.latitud),
                float(obj.longitud)
            )
        return format_html('<span style="color: #95a5a6;">Sin coordenadas</span>')
    

    @admin.display(description="Estado")
    def estado_display(self, obj):
        """Muestra el estado del lugar"""
        if obj.activo:
            return format_html(
                '<span class="badge badge-success" style="font-size: 11px;">✅ Activo</span>'
            )
        else:
            return format_html(
                '<span class="badge badge-danger" style="font-size: 11px;">❌ Inactivo</span>'
            )
    

    @admin.display(description="Popularidad")
    def popularidad_display(self, obj):
        """Muestra el nivel de popularidad"""
        if obj.popular:
            return format_html(
                '<span style="color: #f39c12; font-weight: bold;">⭐ Popular</span>'
            )
        else:
            return format_html(
                '<span style="color: #95a5a6;">📍 Normal</span>'
            )
    

    @admin.display(description="Acciones")
    def acciones_display(self, obj):
        """Muestra acciones rápidas"""
        acciones = []
        
        # Ver en mapa
        if obj.latitud and obj.longitud:
            maps_url = f"https://www.google.com/maps?q={obj.latitud},{obj.longitud}"
            acciones.append(
                format_html(
                    '<a href="{}" target="_blank" '
                    'style="background: #3498db; color: white; padding: 2px 6px; '
                    'border-radius: 3px; text-decoration: none; font-size: 16px; margin-bottom: 4px;">'
                    '🗺️ Mapa</a>',
                    maps_url
                )
            )
        
        # Cambiar estado
        estado_text = "Desactivar" if obj.activo else "Activar"
        estado_color = "#e74c3c" if obj.activo else "#27ae60"
        acciones.append(
            format_html(
                '<a href="#" class="btn-toggle-estado" data-lugar-id="{}" '
                'style="background: {}; color: white; padding: 2px 6px; '
                'border-radius: 3px; text-decoration: none; font-size: 16px; margin-bottom: 4px;">'
                '{}</a>',
                obj.id, estado_color, estado_text
            )
        )
        
        # Toggle popularidad
        popular_text = "Quitar ⭐" if obj.popular else "Hacer ⭐"
        popular_color = "#95a5a6" if obj.popular else "#f39c12"
        acciones.append(
            format_html(
                '<a href="#" class="btn-toggle-popular" data-lugar-id="{}" '
                'style="background: {}; color: white; padding: 2px 6px; '
                'border-radius: 3px; text-decoration: none; font-size: 16px; margin-bottom: 4px;">'
                '{}</a>',
                obj.id, popular_color, popular_text
            )
        )
        
        return mark_safe(
            f'<div class="acciones-lugar">{"<br/><br/>".join(acciones)}</div>'
        )
    

    def coordenadas_info(self, obj):
        """Información detallada de coordenadas"""
        if obj.latitud and obj.longitud:
            maps_url = f"https://www.google.com/maps?q={obj.latitud},{obj.longitud}"
            return format_html(
                '<div class="coordenadas-info">'
                '<p><strong>Latitud:</strong> {}</p>'
                '<p><strong>Longitud:</strong> {}</p>'
                '<p><a href="{}" target="_blank" style="color: #007bff;">🗺️ Ver en Google Maps</a></p>'
                '</div>',
                obj.latitud, obj.longitud, maps_url
            )
        return "No hay coordenadas definidas"
    

    @admin.display(description="Estadisticas")
    def estadisticas_display(self, obj):
        """Muestra estadísticas del lugar"""
        from django.utils.timesince import timesince
        
        stats = []
        stats.append(f"Creado: hace {timesince(obj.created_at)}")
        
        if obj.updated_at != obj.created_at:
            stats.append(f"Actualizado: hace {timesince(obj.updated_at)}")
        
        # Aquí se podrían agregar más estadísticas como:
        # - Número de reservas asociadas
        # - Vehículos en este lugar
        # - etc.
        
        return format_html(
            '<div class="estadisticas-lugar" style="font-size: 11px; color: #7f8c8d;">{}</div>',
            "<br/>".join(stats)
        )
    

    def get_queryset(self, request):
        """Optimiza las consultas"""
        return super().get_queryset(request).select_related('direccion')

    def get_urls(self):
        """Agregar URLs personalizadas para acciones AJAX"""
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:object_id>/toggle-estado/',
                self.admin_site.admin_view(self.toggle_estado_lugar),
                name='lugares_lugar_toggle_estado',
            ),
            path(
                '<int:object_id>/toggle-popular/',
                self.admin_site.admin_view(self.toggle_popular_lugar),
                name='lugares_lugar_toggle_popular',
            ),
        ]
        return custom_urls + urls
    
    def toggle_estado_lugar(self, request, object_id):
        """Vista AJAX para activar/desactivar lugar"""
        if request.method != 'POST':
            return JsonResponse({'error': 'Método no permitido'}, status=405)
        
        try:
            lugar = self.get_object(request, object_id)
            if not lugar:
                return JsonResponse({'error': 'Lugar no encontrado'}, status=404)
            
            # Obtener el nuevo estado del POST data
            nuevo_estado = request.POST.get('activo', '').lower() == 'true'
            lugar.activo = nuevo_estado
            lugar.updated_at = timezone.now()
            lugar.save()
            
            # Log de la acción
            action = "activado" if nuevo_estado else "desactivado"
            logger.info(f"Lugar {lugar.id} {action} por {request.user.username}")
            
            return JsonResponse({
                'success': True,
                'message': f'Lugar {action} exitosamente',
                'new_state': nuevo_estado
            })
            
        except Exception as e:
            logger.error(f"Error en toggle_estado_lugar: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
    
    def toggle_popular_lugar(self, request, object_id):
        """Vista AJAX para marcar/desmarcar lugar como popular"""
        if request.method != 'POST':
            return JsonResponse({'error': 'Método no permitido'}, status=405)
        
        try:
            lugar = self.get_object(request, object_id)
            if not lugar:
                return JsonResponse({'error': 'Lugar no encontrado'}, status=404)
            
            # Obtener el nuevo estado del POST data
            nuevo_estado = request.POST.get('popular', '').lower() == 'true'
            lugar.popular = nuevo_estado
            lugar.updated_at = timezone.now()
            lugar.save()
            
            # Log de la acción
            action = "marcado como popular" if nuevo_estado else "desmarcado como popular"
            logger.info(f"Lugar {lugar.id} {action} por {request.user.username}")
            
            return JsonResponse({
                'success': True,
                'message': f'Lugar {action} exitosamente',
                'new_state': nuevo_estado
            })
            
        except Exception as e:
            logger.error(f"Error en toggle_popular_lugar: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

    # Acciones administrativas
    @admin.action(description="🟢 Activar lugares seleccionados")
    def activar_lugares(self, request, queryset):
        """Activa los lugares seleccionados"""
        count = queryset.update(activo=True)
        self.message_user(
            request,
            f"✅ {count} lugares activados exitosamente.",
            level=messages.SUCCESS
        )

    @admin.action(description="🔴 Desactivar lugares seleccionados")
    def desactivar_lugares(self, request, queryset):
        """Desactiva los lugares seleccionados"""
        count = queryset.update(activo=False)
        self.message_user(
            request,
            f"❌ {count} lugares desactivados.",
            level=messages.SUCCESS
        )

    @admin.action(description="⭐ Marcar como lugares populares")
    def marcar_populares(self, request, queryset):
        """Marca los lugares como populares"""
        count = queryset.update(popular=True)
        self.message_user(
            request,
            f"⭐ {count} lugares marcados como populares.",
            level=messages.SUCCESS
        )

    @admin.action(description="📊 Generar reporte de lugares")
    def generar_reporte_lugares(self, request, queryset):
        """Genera un reporte de los lugares seleccionados"""
        stats = {
            'total': queryset.count(),
            'activos': queryset.filter(activo=True).count(),
            'populares': queryset.filter(popular=True).count(),
            'con_coordenadas': queryset.filter(latitud__isnull=False, longitud__isnull=False).count(),
            'con_telefono': queryset.exclude(telefono__isnull=True).exclude(telefono__exact='').count(),
            'con_email': queryset.exclude(email__isnull=True).exclude(email__exact='').count(),
        }
        
        # Estadísticas por ciudad
        por_ciudad = queryset.values('direccion__ciudad').annotate(
            count=Count('id')
        ).order_by('-count')
        
        mensaje = (
            f"📊 REPORTE DE LUGARES:\n"
            f"• Total lugares: {stats['total']}\n"
            f"• Activos: {stats['activos']} ({(stats['activos']/stats['total']*100):.1f}%)\n"
            f"• Populares: {stats['populares']}\n"
            f"• Con coordenadas: {stats['con_coordenadas']}\n"
            f"• Con teléfono: {stats['con_telefono']}\n"
            f"• Con email: {stats['con_email']}\n"
        )
        
        if por_ciudad:
            mensaje += "\n🏙️ DISTRIBUCIÓN POR CIUDAD:\n"
            for ciudad in por_ciudad[:5]:  # Top 5
                ciudad_nombre = ciudad['direccion__ciudad'] or 'Sin ciudad'
                mensaje += f"• {ciudad_nombre}: {ciudad['count']} lugares\n"
        
        self.message_user(request, mensaje, level=messages.INFO)

    actions = [
        "activar_lugares",
        "desactivar_lugares", 
        "marcar_populares",
        "generar_reporte_lugares"
    ]

