# lugares/admin.py
import logging

from django.contrib import admin, messages
from django.contrib.admin import SimpleListFilter
from django.core.exceptions import ValidationError
from django.db.models import Count, Q
from django.http import JsonResponse
from django.urls import path
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _

from .forms import LugarForm
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
            'all': ("admin/css/custom_admin.css",)
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
    direccion_completa.short_description = "Dirección"

    def ciudad_display(self, obj):
        """Muestra la ciudad con ícono"""
        if obj.ciudad:
            return format_html(
                '<span style="color: #3498db;">🏙️ {}</span>',
                obj.ciudad
            )
        return format_html('<span style="color: #95a5a6;">Sin ciudad</span>')
    ciudad_display.short_description = "Ciudad"

    def provincia_display(self, obj):
        """Muestra la provincia"""
        if obj.provincia:
            return format_html(
                '<span>{}</span>',
                obj.provincia
            )
        return format_html('<span style="color: #95a5a6;">Sin provincia</span>')
    provincia_display.short_description = "Provincia"

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
            '<span>{} {}</span>',
            flag, obj.pais
        )
    pais_display.short_description = "País"

    def codigo_postal_display(self, obj):
        """Muestra el código postal formateado"""
        return format_html(
            '<code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">{}</code>',
            obj.codigo_postal
        )
    codigo_postal_display.short_description = "Código Postal"

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
    lugares_asociados.short_description = "Lugares"

    def get_queryset(self, request):
        """Optimiza las consultas"""
        return super().get_queryset(request).select_related('lugar')


class DireccionInline(admin.StackedInline):
    """Inline para editar dirección junto con el lugar"""
    model = Direccion
    fields = (
        ('calle',),
        ('ciudad', 'provincia'),
        ('pais', 'codigo_postal'),
    )
    extra = 0


@admin.register(Lugar)
class LugarAdmin(admin.ModelAdmin):
    """Admin avanzado para lugares"""
    
    form = LugarForm  # Usar formulario personalizado
    
    # Media para archivos CSS personalizados
    class Media:
        css = {
            'all': ("admin/css/custom_admin.css",)
        }
        js = (
            "admin/js/lugares_admin.js",
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
                    ("activo", "popular"),
                ),
                "classes": ["wide"]
            },
        ),
        (
            "📍 Dirección",
            {
                "fields": (
                    "calle",
                    ("ciudad", "provincia"),
                    ("pais", "codigo_postal"),
                ),
                "classes": ["wide"]
            },
        ),
        (
            "�️ Coordenadas",
            {
                "fields": (
                    ("latitud", "longitud"),
                    "coordenadas_info"
                ),
                "classes": ["wide"],
                "description": "Las coordenadas son opcionales pero ayudan a localizar el lugar en el mapa"
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
            "🎨 Información Adicional",
            {
                "fields": (
                    "icono_url",
                    "info_adicional",
                ),
                "classes": ["wide"]
            },
        ),
        (
            "📊 Estadísticas",
            {
                "fields": (
                    "estadisticas_display",
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

    # Configurar campos de solo lectura para formularios
    def get_readonly_fields(self, request, obj=None):
        readonly = ['created_at', 'updated_at', 'coordenadas_info', 'estadisticas_display']
        return readonly

    # Remover configuraciones que no son necesarias con el formulario personalizado
    # raw_id_fields = ('direccion',)  # No necesario con formulario integrado
    # autocomplete_fields = ('direccion',)  # No necesario con formulario integrado

    def save_model(self, request, obj, form, change):
        """Guardar modelo con logging mejorado y manejo seguro de dirección"""
        try:
            if change:
                action = "actualizado"
                logger.info(f"Lugar {obj.id} siendo actualizado por {request.user.username}")
            else:
                action = "creado"
                logger.info(f"Nuevo lugar siendo creado por {request.user.username}")
            
            # El formulario LugarForm maneja toda la lógica de dirección de manera segura
            # usando transacciones atómicas y el servicio especializado
            if isinstance(form, LugarForm):
                lugar_guardado = form.save(commit=True)
                logger.info(f"Lugar '{lugar_guardado.nombre}' {action} exitosamente usando formulario personalizado")
            else:
                # Fallback para formularios no personalizados (no debería ocurrir)
                logger.warning("Usando fallback para formulario no personalizado")
                super().save_model(request, obj, form, change)
            
            messages.success(
                request, 
                f"✅ Lugar '{obj.nombre}' {action} exitosamente."
            )
            
        except ValidationError as ve:
            error_msg = str(ve)
            logger.error(f"Error de validación al guardar lugar: {error_msg}")
            messages.error(request, f"❌ Error de validación: {error_msg}")
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error inesperado al guardar lugar: {error_msg}")
            messages.error(request, f"❌ Error al guardar el lugar: {error_msg}")
            raise

    def delete_model(self, request, obj):
        """Eliminar modelo con logging y manejo de dirección"""
        try:
            lugar_nombre = obj.nombre
            direccion_id = obj.direccion.id if obj.direccion else None
            
            logger.info(f"Lugar {obj.id} ({lugar_nombre}) siendo eliminado por {request.user.username}")
            
            # Eliminar el lugar (la dirección se eliminará automáticamente debido a la relación OneToOne)
            super().delete_model(request, obj)
            
            messages.success(
                request,
                f"✅ Lugar '{lugar_nombre}' y su dirección eliminados exitosamente."
            )
            
            if direccion_id:
                logger.info(f"Dirección {direccion_id} eliminada junto con lugar {lugar_nombre}")
                
        except Exception as e:
            logger.error(f"Error al eliminar lugar: {str(e)}")
            messages.error(
                request,
                f"❌ Error al eliminar el lugar: {str(e)}"
            )
            raise

    def response_add(self, request, obj, post_url_continue=None):
        """Personalizar respuesta después de crear un lugar"""
        try:
            return super().response_add(request, obj, post_url_continue)
        except Exception as e:
            logger.error(f"Error después de crear lugar: {str(e)}")
            messages.error(
                request,
                f"❌ El lugar se creó pero hubo un problema: {str(e)}"
            )
            return super().response_add(request, obj, post_url_continue)

    def response_change(self, request, obj):
        """Personalizar respuesta después de actualizar un lugar"""
        try:
            return super().response_change(request, obj)
        except Exception as e:
            logger.error(f"Error después de actualizar lugar: {str(e)}")
            messages.error(
                request,
                f"❌ El lugar se actualizó pero hubo un problema: {str(e)}"
            )
            return super().response_change(request, obj)

    def nombre_display(self, obj):
        """Muestra el nombre con estado visual"""
        icon = "🟢" if obj.activo else "🔴"
        star = "⭐" if obj.popular else ""
        
        return format_html(
            '<div class="nombre-lugar">'
            '{} <strong>{}</strong> {}'
            '</div>',
            icon, obj.nombre, star
        )
    nombre_display.short_description = "Nombre"

    def direccion_info(self, obj):
        """Muestra información de la dirección"""
        if obj.direccion:
            return format_html(
                '<div class="direccion-info" style="font-size: 12px;">'
                '<strong>{}</strong><br/>'
                '<span style="color: #7f8c8d;">{}, {}</span><br/>'
                '<code style="background: #f8f9fa; padding: 1px 4px; border-radius: 2px;">{}</code>'
                '</div>',
                obj.direccion.calle or "Sin calle",
                obj.direccion.ciudad or "Sin ciudad",
                obj.direccion.provincia or "Sin provincia",
                obj.direccion.codigo_postal
            )
        return format_html('<span style="color: #e74c3c;">⚠️ Sin dirección</span>')
    direccion_info.short_description = "Dirección"

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
    contacto_info.short_description = "Contacto"

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
    coordenadas_display.short_description = "Coordenadas"

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
    estado_display.short_description = "Estado"

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
    popularidad_display.short_description = "Popularidad"

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
    acciones_display.short_description = "Acciones"

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
    coordenadas_info.short_description = "Información de Coordenadas"

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
    estadisticas_display.short_description = "Estadísticas"

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

