## comunicacion/admin.py
import logging
from typing import Any, Optional

from django.contrib import admin, messages
from django.contrib.admin import SimpleListFilter
from django.db.models import Count, Q, QuerySet
from django.http import HttpRequest, JsonResponse
from django.urls import path
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _
from utils.static_mapping import get_versioned_asset

from .models import Contacto, Contenido

logger = logging.getLogger("admin_operations")


# ======================
# FILTROS PERSONALIZADOS
# ======================

class TipoContenidoFilter(SimpleListFilter):
    """Filtro personalizado para tipos de contenido"""
    title = _("Tipo de Contenido")
    parameter_name = "tipo_contenido"

    def lookups(self, request, model_admin):
        return (
            ("activo", _("Contenido Activo")),
            ("inactivo", _("Contenido Inactivo")),
            ("reciente", _("Creado Recientemente")),
            ("sin_info", _("Sin Información Adicional")),
        )

    def queryset(self, request, queryset):
        if self.value() == "activo":
            return queryset.filter(activo=True)
        elif self.value() == "inactivo":
            return queryset.filter(activo=False)
        elif self.value() == "reciente":
            fecha_limite = timezone.now() - timezone.timedelta(days=7)
            return queryset.filter(created_at__gte=fecha_limite)
        elif self.value() == "sin_info":
            return queryset.filter(info_adicional__isnull=True)


class EstadoContactoFilter(SimpleListFilter):
    """Filtro personalizado para estados de contacto"""
    title = _("Estado del Contacto")
    parameter_name = "estado_contacto"

    def lookups(self, request, model_admin):
        return (
            ("recientes", _("Mensajes Recientes")),
            ("sin_responder", _("Sin Responder")),
            ("respondidos", _("Respondidos")),
            ("urgentes", _("Urgentes (>3 días)")),
        )

    def queryset(self, request, queryset):
        if self.value() == "recientes":
            fecha_limite = timezone.now() - timezone.timedelta(days=3)
            return queryset.filter(fecha_creacion__gte=fecha_limite)
        elif self.value() == "sin_responder":
            return queryset.filter(estado="pendiente")
        elif self.value() == "respondidos":
            return queryset.filter(estado="resuelto", fecha_respuesta__isnull=False)
        elif self.value() == "urgentes":
            fecha_limite = timezone.now() - timezone.timedelta(days=3)
            return queryset.filter(
                fecha_creacion__lt=fecha_limite,
                estado__in=["pendiente", "en_proceso"]
            )


# ======================
# ADMIN CONTENIDO MEJORADO
# ======================

@admin.register(Contenido)
class ContenidoAdmin(admin.ModelAdmin):
    """Admin avanzado para gestión de contenido"""

    # Media para archivos CSS personalizados
    class Media:
        css = {
            'all': (get_versioned_asset("css", "admin/css/custom_admin.c5880bb26f05.css"),)
        }
        js = (
            get_versioned_asset("js_comunicacion", "admin/js/comunicacion_admin_v9f784c33.js"),
        )

    list_display = (
        "titulo_display",
        "tipo_display", 
        "activo_display",
        "fecha_display",
        "info_adicional_display",
        "acciones_display"
    )
    
    list_filter = (
        TipoContenidoFilter,
        "tipo", 
        "activo",
        "created_at"
    )
    
    search_fields = (
        "titulo", 
        "subtitulo", 
        "cuerpo",
        "tipo"
    )
    
    readonly_fields = (
        "created_at", 
        "updated_at",
        "estadisticas_display",
        "longitud_contenido_display"
    )

    fieldsets = (
        (
            "📝 Información Básica", 
            {
                "fields": (
                    ("tipo", "activo"), 
                    "titulo", 
                    "subtitulo",
                    "estadisticas_display"
                ),
                "classes": ["wide"]
            }
        ),
        (
            "📄 Contenido Principal", 
            {
                "fields": (
                    "cuerpo",
                    "longitud_contenido_display"
                ),
                "classes": ["wide"]
            }
        ),
        (
            "➕ Información Adicional", 
            {
                "fields": (
                    "info_adicional", 
                    "icono_url"
                ),
                "classes": ["wide"]
            }
        ),
        (
            "📅 Fechas", 
            {
                "fields": (
                    ("created_at", "updated_at")
                ),
                "classes": ["collapse", "wide"]
            }
        ),
    )

    ordering = ["-created_at"]
    date_hierarchy = "created_at"
    list_per_page = 25
    save_on_top = True
    actions_on_top = True
    actions_on_bottom = True

    # ======================
    # MÉTODOS DE DISPLAY
    # ======================
    @admin.display(description="Título", ordering="titulo")
    def titulo_display(self, obj):
        """Muestra el título con indicador de estado"""
        icon = "✅" if obj.activo else "⭕"
        color = "#27ae60" if obj.activo else "#95a5a6"
        
        return format_html(
            '<div class="titulo-contenido">'
            '{} <strong style="color: {};">{}</strong>'
            '{}'
            '</div>',
            icon,
            color,
            obj.titulo,
            format_html('<br><small style="color: #7f8c8d;">{}</small>', obj.subtitulo) if obj.subtitulo else ''
        )

    @admin.display(description="Tipo", ordering="tipo")
    def tipo_display(self, obj):
        """Muestra el tipo de contenido con íconos"""
        icon_map = {
            "blog": "📝",
            "faq": "❓",
            "legal": "⚖️",
            "info": "ℹ️",
            "mini_section": "📋",
            "testimonial": "💬"
        }
        icon = icon_map.get(obj.tipo, "📄")
        
        return format_html(
            '<span style="font-size: 12px;">{} {}</span>',
            icon, obj.get_tipo_display()
        )

    @admin.display(description="Estado", ordering="activo")
    def activo_display(self, obj):
        """Muestra el estado activo con badge"""
        if obj.activo:
            return format_html(
                '<span class="badge badge-success" style="font-size: 11px;">✅ Activo</span>'
            )
        else:
            return format_html(
                '<span class="badge badge-secondary" style="font-size: 11px;">⭕ Inactivo</span>'            )

    @admin.display(description="Fecha", ordering="created_at")
    def fecha_display(self, obj):
        """Muestra la fecha de creación con tiempo relativo"""
        from django.utils.timesince import timesince
        
        return format_html(
            '<div class="fecha-display">'
            '<strong>{}</strong><br>'
            '<small style="color: #7f8c8d;">hace {}</small>'
            '</div>',
            obj.created_at.strftime("%d/%m/%Y"),
            timesince(obj.created_at)
        )

    @admin.display(description="Info Adicional")
    def info_adicional_display(self, obj):
        """Muestra información sobre datos adicionales"""
        if obj.info_adicional:
            try:
                import json
                data = obj.info_adicional if isinstance(obj.info_adicional, dict) else json.loads(obj.info_adicional)
                campos = len(data) if isinstance(data, dict) else 1
                return format_html(
                    '<span style="color: #3498db;">📊 {} campos</span>',
                    campos
                )
            except:
                return format_html('<span style="color: #f39c12;">📄 Datos presentes</span>')
        return format_html('<span style="color: #95a5a6;">Sin datos</span>')


    @admin.display(description="Acciones")
    def acciones_display(self, obj):
        """Muestra acciones rápidas"""
        acciones = []
        
        # Toggle activo/inactivo
        if obj.activo:
            acciones.append(
                format_html(
                    '<a href="#" class="btn-toggle-content" data-content-id="{}" data-action="deactivate" '
                    'style="background: #95a5a6; color: white; padding: 2px 6px; margin-bottom: 5px; '
                    'border-radius: 3px; text-decoration: none; font-size: 16px;">'
                    '⭕ Desactivar</a>',
                    obj.id
                )
            )
        else:
            acciones.append(
                format_html(
                    '<a href="#" class="btn-toggle-content" data-content-id="{}" data-action="activate" '
                    'style="background: #27ae60; color: white; padding: 2px 6px; margin-bottom: 5px; '
                    'border-radius: 3px; text-decoration: none; font-size: 16px;">'
                    '✅ Activar</a>',
                    obj.id
                )
            )
        
        
        return mark_safe(
            f'<div class="acciones-contenido">{"<br><br>".join(acciones)}</div>'
        )

    @admin.display(description="Estadísticas")
    def estadisticas_display(self, obj):
        """Muestra estadísticas del contenido"""
        from django.utils.timesince import timesince
        
        stats = []
        stats.append(f"Creado: hace {timesince(obj.created_at)}")
        
        if obj.cuerpo:
            palabras = len(obj.cuerpo.split())
            caracteres = len(obj.cuerpo)
            stats.append(f"Longitud: {palabras} palabras, {caracteres} caracteres")
        
        return format_html(
            '<div class="estadisticas-contenido" style="font-size: 11px; color: #7f8c8d;">{}</div>',
            "<br>".join(stats)
        )


    @admin.display(description="Longitud Contenido")
    def longitud_contenido_display(self, obj):
        """Muestra información sobre la longitud del contenido"""
        if not obj.cuerpo:
            return format_html('<span style="color: #95a5a6;">Sin contenido</span>')
        
        palabras = len(obj.cuerpo.split())
        caracteres = len(obj.cuerpo)
        
        # Evaluar longitud
        if palabras < 50:
            color = "#e74c3c"
            nivel = "Corto"
        elif palabras < 200:
            color = "#f39c12"
            nivel = "Medio"
        else:
            color = "#27ae60"
            nivel = "Largo"
        
        return format_html(
            '<div style="color: {}; font-weight: bold;">{}</div>'
            '<small style="color: #7f8c8d;">{} palabras, {} caracteres</small>',
            color, nivel, palabras, caracteres
        )


    # ======================
    # ACCIONES ADMINISTRATIVAS
    # ======================

    @admin.action(description="✅ Activar contenidos seleccionados")
    def activar_contenidos(self, request, queryset):
        """Activa contenidos seleccionados"""
        count = queryset.update(activo=True, updated_at=timezone.now())
        self.message_user(
            request,
            f"✅ {count} contenidos activados exitosamente.",
            level=messages.SUCCESS
        )

    @admin.action(description="⭕ Desactivar contenidos seleccionados")
    def desactivar_contenidos(self, request, queryset):
        """Desactiva contenidos seleccionados"""
        count = queryset.update(activo=False, updated_at=timezone.now())
        self.message_user(
            request,
            f"⭕ {count} contenidos desactivados exitosamente.",
            level=messages.SUCCESS
        )

    @admin.action(description="📊 Generar reporte de contenidos")
    def generar_reporte_contenidos(self, request, queryset):
        """Genera un reporte estadístico de los contenidos seleccionados"""
        stats = {
            "total": queryset.count(),
            "activos": queryset.filter(activo=True).count(),
            "inactivos": queryset.filter(activo=False).count(),
        }
        
        # Estadísticas por tipo
        tipos = queryset.values("tipo").annotate(count=Count("id")).order_by("-count")
        
        mensaje_stats = (
            f"📊 REPORTE DE CONTENIDOS:\n"
            f"• Total contenidos: {stats['total']}\n"
            f"• Activos: {stats['activos']} ({(stats['activos']/stats['total']*100):.1f}%)\n"
            f"• Inactivos: {stats['inactivos']}\n"
        )
        
        if tipos:
            mensaje_stats += "\n📈 POR TIPO:\n"
            for tipo in tipos:
                mensaje_stats += f"• {tipo['tipo']}: {tipo['count']} contenidos\n"
        
        self.message_user(request, mensaje_stats, level=messages.INFO)

    actions = [
        "activar_contenidos",
        "desactivar_contenidos",
        "generar_reporte_contenidos"
    ]

    def get_urls(self):
        """Agregar URLs personalizadas para acciones AJAX"""
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:object_id>/toggle/',
                self.admin_site.admin_view(self.toggle_contenido),
                name='comunicacion_contenido_toggle',
            ),
        ]
        return custom_urls + urls
    
    def toggle_contenido(self, request, object_id):
        """Vista AJAX para activar/desactivar contenido"""
        if request.method != 'POST':
            return JsonResponse({'error': 'Método no permitido'}, status=405)
        
        try:
            contenido = self.get_object(request, object_id)
            if not contenido:
                return JsonResponse({'error': 'Contenido no encontrado'}, status=404)
            
            # Obtener el estado deseado
            activo = request.POST.get('activo', '').lower() == 'true'
            
            # Actualizar el contenido
            contenido.activo = activo
            contenido.updated_at = timezone.now()
            contenido.save()
            
            logger.info(f"Contenido {contenido.id} {'activado' if activo else 'desactivado'} por {request.user.username}")
            
            return JsonResponse({
                'success': True,
                'message': f'Contenido {"activado" if activo else "desactivado"} exitosamente',
                'activo': activo
            })
            
        except Exception as e:
            logger.error(f"Error en toggle_contenido: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)


# ======================
# ADMIN CONTACTO MEJORADO
# ======================

@admin.register(Contacto)
class ContactoAdmin(admin.ModelAdmin):
    """Admin avanzado para gestión de contactos"""

    # Media para archivos CSS personalizados
    class Media:
        css = {
            'all': (get_versioned_asset("css", "admin/css/custom_admin.c5880bb26f05.css"),)
        }
        js = (
            get_versioned_asset("js_comunicacion", "admin/js/comunicacion_admin_v9f784c33.js"),
        )

    list_display = (
        "contacto_info_display",
        "asunto_display",
        "estado_display", 
        "fecha_creacion_display",
        "tiempo_respuesta_display",
        "acciones_display"
    )
    
    list_filter = (
        EstadoContactoFilter,
        "estado",
        "fecha_creacion",
        "fecha_respuesta"
    )
    
    search_fields = (
        "nombre", 
        "email", 
        "asunto",
        "mensaje"
    )
    
    readonly_fields = (
        "fecha_creacion", 
        "ip_address", 
        "user_agent",
        "tiempo_respuesta_calculado",
        "estadisticas_display"
    )

    fieldsets = (
        (
            "👤 Información del Remitente", 
            {
                "fields": (
                    ("nombre", "email"),
                    "estadisticas_display"
                ),
                "classes": ["wide"]
            }
        ),
        (
            "📧 Mensaje", 
            {
                "fields": (
                    "asunto", 
                    "mensaje"
                ),
                "classes": ["wide"]
            }
        ),
        (
            "💬 Estado y Respuesta",
            {
                "fields": (
                    "estado",
                    ("fecha_respuesta", "respondido_por"),
                    "respuesta",
                    "tiempo_respuesta_calculado"
                ),
                "classes": ["wide"]
            },
        ),
        (
            "🔧 Información Técnica",
            {
                "fields": (
                    "fecha_creacion", 
                    "ip_address", 
                    "user_agent"
                ),
                "classes": ("collapse", "wide"),
            },
        ),
    )

    ordering = ["-fecha_creacion"]
    date_hierarchy = "fecha_creacion"
    list_per_page = 25
    save_on_top = True
    actions_on_top = True
    actions_on_bottom = True    # ======================
    # MÉTODOS DE DISPLAY
    # ======================

    @admin.display(description="Contacto Info")
    def contacto_info_display(self, obj):
        """Muestra información completa del contacto"""
        # Determinar si es reciente (últimos 3 días)
        fecha_limite = timezone.now() - timezone.timedelta(days=3)
        es_reciente = obj.fecha_creacion >= fecha_limite
        icon = "🆕" if es_reciente else "👤"
        
        return format_html(
            '<div class="contacto-info">'
            '{} <strong >{}</strong><br>'
            '<small style="color: #7f8c8d;">{}</small>'
            '</div>',
            icon, obj.nombre, obj.email
        )


    @admin.display(description="Asunto")
    def asunto_display(self, obj):
        """Muestra el asunto con longitud del mensaje"""
        longitud_mensaje = len(obj.mensaje) if obj.mensaje else 0
        
        # Evaluar longitud del mensaje
        if longitud_mensaje < 100:
            color_longitud = "#f39c12"
            nivel = "Corto"
        elif longitud_mensaje < 500:
            color_longitud = "#27ae60"
            nivel = "Medio"
        else:
            color_longitud = "#3498db"
            nivel = "Largo"
        
        return format_html(
            '<div class="asunto-display">'
            '<strong>{}</strong><br>'
            '<small style="color: {};">{} ({} caracteres)</small>'
            '</div>',
            obj.asunto, color_longitud, nivel, longitud_mensaje
        )


    @admin.display(description="Estado")
    def estado_display(self, obj):
        """Muestra el estado con badges coloridos"""
        badge_map = {
            "pendiente": ("warning", "⏳"),
            "en_proceso": ("info", "🔄"),
            "resuelto": ("success", "✅"),
            "cerrado": ("secondary", "🔒")
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

        # Destacar mensajes urgentes
        dias_transcurridos = (timezone.now() - obj.fecha_creacion).days
        if dias_transcurridos > 3 and obj.estado in ["pendiente", "en_proceso"]:
            urgente_badge = '<br><span class="badge badge-danger" style="font-size: 10px;">🚨 URGENTE</span>'
        else:
            urgente_badge = ""
        
        return format_html(
            '<div class="fecha-display">'
            '<strong>{}</strong><br>'
            '<small style="color: #7f8c8d;">hace {}</small>'
            '{}'
            '</div>',
            obj.fecha_creacion.strftime("%d/%m/%Y %H:%M"),
            timesince(obj.fecha_creacion),
            urgente_badge
        )


    @admin.display(description="Tiempo Respuesta")
    def tiempo_respuesta_display(self, obj):
        """Muestra el tiempo de respuesta o estado pendiente"""
        if obj.fecha_respuesta:
            tiempo_respuesta = obj.fecha_respuesta - obj.fecha_creacion
            return format_html(
                '<span style="color: #27ae60; font-weight: bold;">{}</span>',
                str(tiempo_respuesta).split('.')[0]  # Remover microsegundos
            )
        elif obj.estado == "resuelto":
            return format_html('<span style="color: #27ae60;">✅ Resuelto</span>')
        else:
            tiempo_pendiente = timezone.now() - obj.fecha_creacion
            dias = tiempo_pendiente.days
            
            if dias > 3:
                color = "#e74c3c"
                icon = "🚨"
            elif dias > 1:
                color = "#f39c12"
                icon = "⚠️"
            else:
                color = "#3498db"
                icon = "⏳"
                
            return format_html(
                '<span style="color: {};">{} {} días pendiente</span>',
                color, icon, dias
            )


    @admin.display(description="Acciones")
    def acciones_display(self, obj):
        """Muestra acciones rápidas disponibles"""
        acciones = []
          # Acción de responder
        if obj.estado in ["pendiente", "en_proceso"]:
            acciones.append(
                '<a href="#" onclick="responderContacto({})" '
                'style="background: #27ae60; color: white; padding: 2px 6px; margin-bottom: 5px; '
                'border-radius: 3px; text-decoration: none; font-size: 16px;">'
                '💬 Responder</a>'.format(obj.id)
            )
        
        # Acción de marcar como resuelto
        if obj.estado != "resuelto":
            acciones.append(
                '<a href="#" onclick="resolverContacto({})" '
                'style="background: #3498db; color: white; padding: 2px 6px; margin-bottom: 5px; '
                'border-radius: 3px; text-decoration: none; font-size: 16px;">'
                '✅ Resolver</a>'.format(obj.id)
            )
        
        # Ver mensaje completo
        acciones.append(
            '<a href="#" onclick="verMensaje({})" '
            'style="background: #2c3e50; color: white; padding: 2px 6px; '
            'border-radius: 3px; text-decoration: none; font-size: 16px;">'
            '👁️ Ver Mensaje</a>'.format(obj.id)
        )
        
        return mark_safe(
            f'<div class="acciones-contacto">{"<br><br>".join(acciones)}</div>'
        )


    def tiempo_respuesta_calculado(self, obj):
        """Calcula y muestra el tiempo de respuesta detallado"""
        if obj.fecha_respuesta:
            tiempo_respuesta = obj.fecha_respuesta - obj.fecha_creacion
            
            # Evaluar eficiencia de respuesta
            horas = tiempo_respuesta.total_seconds() / 3600
            if horas <= 2:
                color = "#27ae60"
                evaluacion = "Excelente"
            elif horas <= 24:
                color = "#f39c12"
                evaluacion = "Bueno"
            elif horas <= 72:
                color = "#e67e22"
                evaluacion = "Aceptable"
            else:
                color = "#e74c3c"
                evaluacion = "Lento"
            
            return format_html(
                '<div style="color: {}; font-weight: bold;">{}</div>'
                '<small style="color: #7f8c8d;">{}</small>',
                color, evaluacion, str(tiempo_respuesta).split('.')[0]
            )
        
        # Tiempo pendiente
        tiempo_pendiente = timezone.now() - obj.fecha_creacion
        dias = tiempo_pendiente.days
        
        if dias > 3:
            return format_html(
                '<div style="color: #e74c3c; font-weight: bold;">🚨 MUY URGENTE</div>'
                '<small style="color: #7f8c8d;">{} días sin respuesta</small>',
                dias
            )
        elif dias > 1:
            return format_html(
                '<div style="color: #f39c12; font-weight: bold;">⚠️ URGENTE</div>'
                '<small style="color: #7f8c8d;">{} días pendiente</small>',
                dias
            )
        else:
            return format_html(
                '<div style="color: #3498db;">⏳ Reciente</div>'
                '<small style="color: #7f8c8d;">Menos de 1 día</small>'
            )


    @admin.display(description="Estadisticas")
    def estadisticas_display(self, obj):
        """Muestra estadísticas del contacto"""
        from django.utils.timesince import timesince
        
        stats = []
        stats.append(f"Recibido: hace {timesince(obj.fecha_creacion)}")
        
        if obj.mensaje:
            palabras = len(obj.mensaje.split())
            stats.append(f"Mensaje: {palabras} palabras")
        
        if obj.ip_address:
            stats.append(f"IP: {obj.ip_address}")
        
        return format_html(
            '<div class="estadisticas-contacto" style="font-size: 11px; color: #7f8c8d;">{}</div>',
            "<br>".join(stats)
        )


    # ======================
    # ACCIONES ADMINISTRATIVAS
    # ======================

    @admin.action(description="✅ Marcar como resuelto")
    def marcar_como_resuelto(self, request, queryset):
        """Marca contactos como resueltos"""
        count = queryset.update(
            estado="resuelto",
            fecha_respuesta=timezone.now()
        )
        self.message_user(
            request,
            f"✅ {count} mensajes marcados como resueltos.",
            level=messages.SUCCESS
        )

    @admin.action(description="🔄 Marcar como en proceso")
    def marcar_como_en_proceso(self, request, queryset):
        """Marca contactos como en proceso"""
        count = queryset.update(estado="en_proceso")
        self.message_user(
            request,
            f"🔄 {count} mensajes marcados como en proceso.",
            level=messages.SUCCESS
        )

    @admin.action(description="📊 Generar reporte de contactos")
    def generar_reporte_contactos(self, request, queryset):
        """Genera un reporte estadístico de los contactos seleccionados"""
        stats = {
            "total": queryset.count(),
            "pendientes": queryset.filter(estado="pendiente").count(),
            "en_proceso": queryset.filter(estado="en_proceso").count(),
            "resueltos": queryset.filter(estado="resuelto").count(),
            "cerrados": queryset.filter(estado="cerrado").count(),
        }
        
        # Calcular tiempo promedio de respuesta
        contactos_respondidos = queryset.filter(fecha_respuesta__isnull=False)
        if contactos_respondidos.exists():
            tiempos = []
            for contacto in contactos_respondidos:
                tiempo = contacto.fecha_respuesta - contacto.fecha_creacion
                tiempos.append(tiempo.total_seconds())
            
            tiempo_promedio = sum(tiempos) / len(tiempos) / 3600  # En horas
        else:
            tiempo_promedio = 0
        
        # Contactos urgentes
        fecha_limite = timezone.now() - timezone.timedelta(days=3)
        urgentes = queryset.filter(
            fecha_creacion__lt=fecha_limite,
            estado__in=["pendiente", "en_proceso"]
        ).count()
        
        mensaje_stats = (
            f"📊 REPORTE DE CONTACTOS:\n"
            f"• Total contactos: {stats['total']}\n"
            f"• Pendientes: {stats['pendientes']}\n"
            f"• En proceso: {stats['en_proceso']}\n"
            f"• Resueltos: {stats['resueltos']} "
            f"({(stats['resueltos']/stats['total']*100):.1f}%)\n"
            f"• Cerrados: {stats['cerrados']}\n"
            f"• Urgentes (>3 días): {urgentes}\n"
            f"• Tiempo promedio respuesta: {tiempo_promedio:.1f} horas\n"
        )
        
        self.message_user(request, mensaje_stats, level=messages.INFO)

    @admin.action(description="🧹 Cerrar contactos resueltos antiguos")
    def cerrar_contactos_antiguos(self, request, queryset):
        """Cierra contactos resueltos de más de 30 días"""
        from datetime import timedelta
        
        fecha_limite = timezone.now() - timedelta(days=30)
        contactos_antiguos = queryset.filter(
            estado="resuelto",
            fecha_respuesta__lt=fecha_limite
        )
        
        if not contactos_antiguos.exists():
            self.message_user(
                request,
                "ℹ️ No hay contactos resueltos antiguos para cerrar.",
                level=messages.INFO
            )
            return
        
        count = contactos_antiguos.update(estado="cerrado")
        self.message_user(
            request,
            f"🧹 {count} contactos resueltos antiguos cerrados.",
            level=messages.SUCCESS
        )

    def get_urls(self):
        """Agregar URLs personalizadas para acciones AJAX"""
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:object_id>/resolve/',
                self.admin_site.admin_view(self.resolve_contacto),
                name='comunicacion_contacto_resolve',
            ),
            path(
                '<int:object_id>/respond/',
                self.admin_site.admin_view(self.respond_contacto),
                name='comunicacion_contacto_respond',
            ),
        ]
        return custom_urls + urls
    
    def resolve_contacto(self, request, object_id):
        """Vista AJAX para resolver contacto"""
        if request.method != 'POST':
            return JsonResponse({'error': 'Método no permitido'}, status=405)
        
        try:
            contacto = self.get_object(request, object_id)
            if not contacto:
                return JsonResponse({'error': 'Contacto no encontrado'}, status=404)
            
            contacto.estado = "resuelto"
            contacto.fecha_respuesta = timezone.now()
            contacto.respondido_por = request.user
            contacto.save()
            
            logger.info(f"Contacto {contacto.id} resuelto por {request.user.username}")
            
            return JsonResponse({
                'success': True,
                'message': 'Contacto marcado como resuelto'
            })
            
        except Exception as e:
            logger.error(f"Error en resolve_contacto: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
    
    def respond_contacto(self, request, object_id):
        """Vista AJAX para responder contacto"""
        if request.method != 'POST':
            return JsonResponse({'error': 'Método no permitido'}, status=405)
        
        try:
            contacto = self.get_object(request, object_id)
            if not contacto:
                return JsonResponse({'error': 'Contacto no encontrado'}, status=404)
            
            subject = request.POST.get('subject', '')
            response_text = request.POST.get('message', '')
            mark_resolved = request.POST.get('mark_resolved', 'false').lower() == 'true'
            
            if not subject or not response_text:
                return JsonResponse({'error': 'Asunto y mensaje son requeridos'}, status=400)
            
            # Actualizar el contacto
            contacto.respuesta = response_text
            contacto.fecha_respuesta = timezone.now()
            contacto.respondido_por = request.user
            contacto.estado = "resuelto" if mark_resolved else "en_proceso"
            contacto.save()
            
            # Aquí podrías agregar lógica para enviar email
            # send_email_response(contacto, subject, response_text)
            
            logger.info(f"Contacto {contacto.id} respondido por {request.user.username}")
            
            return JsonResponse({
                'success': True,
                'message': 'Respuesta enviada exitosamente'
            })
            
        except Exception as e:
            logger.error(f"Error en respond_contacto: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

    actions = [
        "marcar_como_resuelto",
        "marcar_como_en_proceso",
        "generar_reporte_contactos",
        "cerrar_contactos_antiguos"
    ]

    def get_queryset(self, request):
        """Optimiza las consultas"""
        return super().get_queryset(request)

    def changelist_view(self, request, extra_context=None):
        """Agrega contexto adicional a la vista de lista"""
        extra_context = extra_context or {}
        
        # Agregar estadísticas generales
        queryset = self.get_queryset(request)
        extra_context["total_contactos"] = queryset.count()
        extra_context["contactos_pendientes"] = queryset.filter(estado="pendiente").count()
        extra_context["contactos_hoy"] = queryset.filter(
            fecha_creacion__date=timezone.now().date()
        ).count()
        
        # Contactos urgentes
        fecha_limite = timezone.now() - timezone.timedelta(days=3)
        extra_context["contactos_urgentes"] = queryset.filter(
            fecha_creacion__lt=fecha_limite,
            estado__in=["pendiente", "en_proceso"]
        ).count()
        
        return super().changelist_view(request, extra_context)


