# vehiculos/admin.py
import logging
from typing import Any, Optional

from django.contrib import admin, messages
from django.contrib.admin import SimpleListFilter
from django.db.models import Avg, Count, Q, QuerySet
from django.http import HttpRequest, JsonResponse
from django.urls import path, reverse
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _
from utils.static_mapping import get_versioned_asset

from .models import (Categoria, GrupoCoche, ImagenVehiculo, Mantenimiento,
                     TarifaVehiculo, Vehiculo)

logger = logging.getLogger("admin_operations")


class DisponibilidadFilter(SimpleListFilter):
    """Filtro personalizado para disponibilidad de vehículos"""
    title = _("Disponibilidad")
    parameter_name = "disponibilidad"

    def lookups(self, request, model_admin):
        return (
            ("disponible", _("Disponibles")),
            ("no_disponible", _("No Disponibles")),
            ("mantenimiento", _("En Mantenimiento")),
            ("reservado", _("Reservado")),
        )

    def queryset(self, request, queryset):
        if self.value() == "disponible":
            return queryset.filter(disponible=True, activo=True)
        elif self.value() == "no_disponible":
            return queryset.filter(Q(disponible=False) | Q(activo=False))
        elif self.value() == "mantenimiento":
            # Aquí podrías agregar lógica para vehículos en mantenimiento
            return queryset.filter(disponible=False)
        elif self.value() == "reservado":
            # Aquí podrías agregar lógica para vehículos actualmente reservados
            from reservas.models import Reserva
            reservados = Reserva.objects.filter(
                estado="confirmada",
                fecha_recogida__lte=timezone.now(),
                fecha_devolucion__gte=timezone.now()
            ).values_list("vehiculo_id", flat=True)
            return queryset.filter(id__in=reservados)


class ImagenVehiculoInline(admin.TabularInline):
    model = ImagenVehiculo
    extra = 1
    fields = ["imagen", "imagen_preview", "portada", "ancho", "alto"]
    readonly_fields = ["imagen_preview", "ancho", "alto"]
    verbose_name = "Imagen"
    verbose_name_plural = "Imágenes"

    def imagen_preview(self, obj):
        """Mostrar una vista previa de la imagen en el admin"""
        if obj.imagen:
            from django.utils.safestring import mark_safe

            # Construir URL de la imagen
            imagen_url = obj.imagen.url
            
            return mark_safe(
                f'<img src="{imagen_url}" style="max-width: 100px; max-height: 100px; object-fit: cover;" />'
            )
        return "Sin imagen"
    
    imagen_preview.short_description = "Vista previa"


class TarifaVehiculoInline(admin.TabularInline):
    model = TarifaVehiculo
    extra = 1
    fields = ["fecha_inicio", "fecha_fin", "precio_dia"]
    verbose_name = "Tarifa"
    verbose_name_plural = "Tarifas"


class MantenimientoInline(admin.TabularInline):
    model = Mantenimiento
    extra = 0
    fields = ["fecha", "tipo_servicio", "coste", "notas"]
    readonly_fields = ["fecha"]
    verbose_name = "Mantenimiento"
    verbose_name_plural = "Mantenimientos"
    ordering = ["-fecha"]


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = (
        "nombre", 
        "notas_short", 
        "vehiculos_count",
        "reservas_count",
        "created_at"
    )
    search_fields = ("nombre", "descripcion")
    readonly_fields = ("created_at", "updated_at", "vehiculos_count", "ingresos_generados")
    
    fieldsets = (
        (
            "Información de la Categoría",
            {
                "fields": ("nombre", "descripcion")
            },
        ),
        (
            "Estadísticas",
            {
                "fields": ("vehiculos_count", "ingresos_generados"),
                "classes": ("collapse",),
            },        ),
        (
            "Metadatos",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def notas_short(self, obj):
        if obj.descripcion:
            return obj.descripcion[:50] + "..." if len(obj.descripcion) > 50 else obj.descripcion
        return "-"

    def vehiculos_count(self, obj):
        count = obj.vehiculos.count()
        activos = obj.vehiculos.filter(activo=True).count()
        return format_html(
            '<strong>{} total</strong><br>'
            '<small>{} activos</small>',
            count, activos
        )

    def reservas_count(self, obj):
        from reservas.models import Reserva
        count = Reserva.objects.filter(vehiculo__categoria=obj).count()
        return count

    def ingresos_generados(self, obj):
        from django.db.models import Sum
        from reservas.models import Reserva
        total = Reserva.objects.filter(
            vehiculo__categoria=obj,
            estado="confirmada"
        ).aggregate(Sum('precio_total'))['precio_total__sum'] or 0
        
        return format_html(
            '<strong style="color: #28a745;">€{}</strong>',
            total
        )


@admin.register(GrupoCoche)
class GrupoCocheAdmin(admin.ModelAdmin):
    list_display = (
        "nombre", 
        "edad_minima", 
        "vehiculos_count",
        "notas_short",
        "created_at"
    )
    list_filter = ("edad_minima",)
    search_fields = ("nombre", "descripcion")
    readonly_fields = ("created_at", "updated_at", "vehiculos_count")

    fieldsets = (
        (
            "Información del Grupo",
            {
                "fields": ("nombre", "edad_minima", "descripcion")
            },
        ),
        (
            "Estadísticas",
            {
                "fields": ("vehiculos_count",),
                "classes": ("collapse",),
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

    def notas_short(self, obj):
        if obj.descripcion:
            return obj.descripcion[:50] + "..." if len(obj.descripcion) > 50 else obj.descripcion
        return "-"

    def vehiculos_count(self, obj):
        return obj.vehiculos.count()


@admin.register(Vehiculo)
class VehiculoAdmin(admin.ModelAdmin):
    list_display = (
        "vehiculo_info",
        "categoria_grupo", 
        "portada_display",
        "estado_display",
        "tarifa_actual",
        "estadisticas_uso",
        "ultimo_mantenimiento",
        "acciones_rapidas",
    )
    list_filter = (
        DisponibilidadFilter,
        "categoria", 
        "grupo", 
        "combustible", 
        "disponible", 
        "activo",
        "anio",
    )
    search_fields = ("marca", "modelo", "matricula", "categoria__nombre")
    readonly_fields = (
        "created_at", 
        "updated_at",
        "reservas_totales",
        "ingresos_generados",
        "promedio_calificacion",
        "dias_ocupado",
        "proximo_mantenimiento",
    )
    inlines = [ImagenVehiculoInline, TarifaVehiculoInline, MantenimientoInline]
    actions = ["activar_vehiculos", "desactivar_vehiculos", "programar_mantenimiento"]

    fieldsets = (
        (
            "🚗 Información Básica",
            {
                "fields": (
                    ("marca", "modelo"),
                    "matricula",
                    ("categoria", "grupo"),
                    "anio",
                )
            },
        ),
        (
            "🔧 Características Técnicas",
            {
                "fields": (
                    ("color", "combustible"),
                    ("num_puertas", "num_pasajeros"),
                    "capacidad_maletero",
                    "kilometraje",
                )
            },
        ),
        (
            "⚙️ Estado y Configuración",
            {
                "fields": (
                    ("disponible", "activo"),
                    "fianza",
                    "notas_internas",
                )
            },
        ),
        (
            "📊 Estadísticas de Uso",
            {
                "fields": (
                    "reservas_totales",
                    "ingresos_generados", 
                    "promedio_calificacion",
                    "dias_ocupado",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "🔧 Mantenimiento",
            {
                "fields": ("proximo_mantenimiento",),
                "classes": ("collapse",),
            },
        ),
        (
            "📅 Metadatos",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "categoria", "grupo"
        ).prefetch_related("imagenes", "tarifas", "mantenimientos")

    def vehiculo_info(self, obj):
        """Información principal del vehículo sin imagen"""
        return format_html(
            '<div style="display: flex; align-items: center; gap: 10px;">'
            '<div>'
            '<strong style="color: #2c3e50; font-size: 14px;">{} {}</strong><br>'
            '<small style="color: #666;">📄 {}</small><br>'
            '<small style="color: #666;">📅 {}</small>'
            '</div>'
            '</div>',
            obj.marca,
            obj.modelo, 
            obj.matricula,
            obj.anio
        )

    @admin.display(description="Portada")
    def portada_display(self, obj):
        """Muestra solo la imagen de portada del vehículo"""
        imagen_portada = obj.imagenes.filter(portada=True).first()
        if imagen_portada and imagen_portada.imagen:
            return format_html(
                '<img src="{}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 8px; border: 2px solid #dee2e6;" alt="Portada">',
                imagen_portada.imagen.url
            )
        else:
            return format_html(
                '<div style="width: 80px; height: 60px; background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #6c757d; font-size: 12px;">'
                '📷<br>Sin portada'
                '</div>'
            )

    def categoria_grupo(self, obj):
        """Categoría y grupo del vehículo"""
        return format_html(
            '<strong>🏷️ {}</strong><br>'
            '<small>👥 {} ({}+ años)</small>',
            obj.categoria.nombre,
            obj.grupo.nombre,
            obj.grupo.edad_minima
        )

    @admin.display(description="Estado")
    def estado_display(self, obj):
        """Estado del vehículo con indicadores visuales"""
        if not obj.activo:
            return format_html(
                '<span style="color: #dc3545; font-weight: bold;">⛔ Inactivo</span>'
            )
        elif not obj.disponible:
            return format_html(
                '<span style="color: #ffc107; font-weight: bold;">🔧 Mantenimiento</span>'
            )
        else:
            # Verificar si está actualmente reservado
            from reservas.models import Reserva
            ahora = timezone.now()
            reserva_activa = Reserva.objects.filter(
                vehiculo=obj,
                estado="confirmada",
                fecha_recogida__lte=ahora,
                fecha_devolucion__gte=ahora
            ).exists()
            
            if reserva_activa:
                return format_html(
                    '<span style="color: #17a2b8; font-weight: bold;">📅 Reservado</span>'
                )
            else:
                return format_html(
                    '<span style="color: #28a745; font-weight: bold;">✅ Disponible</span>'
                )

    def tarifa_actual(self, obj):
        """Tarifa actual del vehículo"""
        tarifa_activa = obj.tarifas.filter(
            fecha_inicio__lte=timezone.now().date(),
            fecha_fin__gte=timezone.now().date()
        ).first()
        
        if tarifa_activa:
            return format_html(
                '<strong style="color: #007bff;">€{}/día</strong><br>'
                '<small>Válida hasta {}</small>',
                tarifa_activa.precio_dia,
                tarifa_activa.fecha_fin.strftime("%d/%m/%Y")
            )
        else:
            return format_html(
                '<span style="color: #dc3545;">❌ Sin tarifa</span>'
            )

    def estadisticas_uso(self, obj):
        """Estadísticas de uso del vehículo"""
        from reservas.models import Reserva
        reservas = Reserva.objects.filter(vehiculo=obj)
        total_reservas = reservas.count()
        confirmadas = reservas.filter(estado="confirmada").count()
        
        if total_reservas > 0:
            porcentaje_exito = (confirmadas / total_reservas) * 100
            return format_html(
                '<strong>{} reservas</strong><br>'
                '<small>{} confirmadas ({}%)</small>',
                total_reservas,
                confirmadas,
                round(porcentaje_exito, 1)
            )
        else:
            return format_html(
                '<span style="color: #6c757d;">Sin reservas</span>'
            )

    def ultimo_mantenimiento(self, obj):
        """Último mantenimiento realizado"""
        ultimo = obj.mantenimientos.order_by("-fecha").first()
        if ultimo:
            return format_html(
                '<strong>{}</strong><br>'
                '<small>{}</small><br>'
                '<small>€{}</small>',
                ultimo.fecha.strftime("%d/%m/%Y"),
                ultimo.tipo_servicio[:20] + "..." if len(ultimo.tipo_servicio) > 20 else ultimo.tipo_servicio,
                ultimo.coste
            )
        else:
            return format_html(
                '<span style="color: #6c757d;">Sin registros</span>'
            )

    def acciones_rapidas(self, obj):
        """Botones de acción rápida"""
        actions = []
        
        if obj.activo and obj.disponible:
            actions.append(
                '<a href="#" onclick="desactivarVehiculo({})" '
                'style="color: #ffc107; text-decoration: none; font-size: 12px;">🔧 Mantenimiento</a>'.format(obj.pk)
            )
        elif not obj.disponible and obj.activo:
            actions.append(
                '<a href="#" onclick="activarVehiculo({})" '
                'style="color: #28a745; text-decoration: none; font-size: 12px;">✅ Activar</a>'.format(obj.pk)
            )
            
        if obj.activo:
            url = reverse("admin:vehiculos_vehiculo_change", args=[obj.pk])
            actions.append(
                '<a href="{}" style="color: #007bff; text-decoration: none; font-size: 12px;">✏️ Editar</a>'.format(url)
            )
            
        return mark_safe('<br>'.join(actions))

    # Campos readonly calculados
    def reservas_totales(self, obj):
        from reservas.models import Reserva
        return Reserva.objects.filter(vehiculo=obj).count()

    def ingresos_generados(self, obj):
        from django.db.models import Sum
        from reservas.models import Reserva
        total = Reserva.objects.filter(
            vehiculo=obj,
            estado="confirmada"
        ).aggregate(Sum('precio_total'))['precio_total__sum'] or 0
        
        return format_html(
            '<strong style="color: #28a745;">€{}</strong>',
            total
        )

    def promedio_calificacion(self, obj):
        # Aquí podrías agregar lógica para calificaciones si las tienes
        return "N/A"

    def dias_ocupado(self, obj):
        from reservas.models import Reserva
        reservas = Reserva.objects.filter(vehiculo=obj, estado="confirmada")
        total_dias = sum(reserva.dias_alquiler() for reserva in reservas)
        return f"{total_dias} días"

    def proximo_mantenimiento(self, obj):
        # Aquí podrías agregar lógica para calcular próximo mantenimiento
        ultimo = obj.mantenimientos.order_by("-fecha").first()
        if ultimo:
            # Ejemplo: cada 6 meses
            proximo = ultimo.fecha.replace(month=ultimo.fecha.month + 6)
            return proximo.strftime("%d/%m/%Y")
        return "No programado"

    # Acciones masivas
    def activar_vehiculos(self, request, queryset):
        """Activar vehículos seleccionados"""
        count = queryset.update(disponible=True, activo=True)
        self.message_user(
            request,
            f"{count} vehículos activados exitosamente.",
            messages.SUCCESS
        )

    def desactivar_vehiculos(self, request, queryset):
        """Desactivar vehículos seleccionados"""
        count = queryset.update(disponible=False)
        self.message_user(
            request,
            f"{count} vehículos puestos en mantenimiento.",
            messages.WARNING
        )

    def programar_mantenimiento(self, request, queryset):
        """Programar mantenimiento para vehículos seleccionados"""
        # Aquí iría la lógica para programar mantenimiento
        count = queryset.count()
        self.message_user(
            request,
            f"Mantenimiento programado para {count} vehículos.",
            messages.INFO
        )

    def save_model(self, request, obj, form, change):
        """Guardar con logging"""
        action = "Editado" if change else "Creado"
        try:
            super().save_model(request, obj, form, change)
            logger.info(f"Vehículo {obj.marca} {obj.modelo} ({obj.matricula}) {action.lower()} por {request.user.username}")
            messages.success(request, f"Vehículo {action.lower()} exitosamente.")
        except Exception as e:
            logger.error(f"Error al guardar vehículo: {str(e)}")
            messages.error(request, f"Error al guardar: {str(e)}")
            raise

    def get_urls(self):
        """Agregar URLs personalizadas para acciones AJAX"""  
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:object_id>/toggle-disponibilidad/',
                self.admin_site.admin_view(self.toggle_disponibilidad),
                name='vehiculos_vehiculo_toggle_disponibilidad',
            ),
        ]
        return custom_urls + urls
    
    def toggle_disponibilidad(self, request, object_id):
        """Vista AJAX para activar/desactivar vehículo"""
        if request.method != 'POST':
            return JsonResponse({'error': 'Método no permitido'}, status=405)
        
        try:
            vehiculo = self.get_object(request, object_id)
            if not vehiculo:
                return JsonResponse({'error': 'Vehículo no encontrado'}, status=404)
            
            # Obtener datos del formulario
            accion = request.POST.get('accion', '')
            motivo = request.POST.get('motivo', '')
            fecha_mantenimiento = request.POST.get('fecha', '')
            
            if accion == 'desactivar':
                # Desactivar vehículo para mantenimiento
                vehiculo.disponible = False
                vehiculo.save()
                
                # Crear registro de mantenimiento si se proporcionaron datos
                if motivo:
                    from .models import Mantenimiento
                    mantenimiento = Mantenimiento.objects.create(
                        vehiculo=vehiculo,
                        tipo_servicio=motivo,
                        fecha=timezone.now().date(),
                        coste=0,
                        notas=f"Vehículo puesto en mantenimiento por {request.user.username}"
                    )
                
                logger.info(f"Vehículo {vehiculo.id} desactivado para mantenimiento por {request.user.username}: {motivo}")
                
                return JsonResponse({
                    'success': True,
                    'message': 'Vehículo puesto en mantenimiento exitosamente',
                    'new_state': False
                })
                
            elif accion == 'activar':
                # Activar vehículo
                vehiculo.disponible = True
                vehiculo.save()
                
                logger.info(f"Vehículo {vehiculo.id} activado por {request.user.username}")
                
                return JsonResponse({
                    'success': True,
                    'message': 'Vehículo activado exitosamente',
                    'new_state': True
                })
            else:
                return JsonResponse({'error': 'Acción no válida'}, status=400)
                
        except Exception as e:
            logger.error(f"Error en toggle_disponibilidad: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

    class Media:
        js = (get_versioned_asset("js_vehiculos", "admin/js/vehiculos_admin_vfd3d29f9.js"),)
        css = {
            "all": (get_versioned_asset("css", "admin/css/custom_admin_v78b65000.css"),)
        }


@admin.register(ImagenVehiculo)
class ImagenVehiculoAdmin(admin.ModelAdmin):
    list_display = (
        "vehiculo_info", 
        "imagen_preview", 
        "portada_display", 
        "dimensiones", 
        "created_at"
    )
    list_filter = ("portada", "vehiculo__marca", "vehiculo__categoria")
    search_fields = ("vehiculo__marca", "vehiculo__modelo", "vehiculo__matricula")
    readonly_fields = ("ancho", "alto", "created_at", "updated_at")

    def vehiculo_info(self, obj):
        return format_html(
            '<strong>{} {}</strong><br>'
            '<small>{}</small>',
            obj.vehiculo.marca,
            obj.vehiculo.modelo,
            obj.vehiculo.matricula
        )

    def imagen_preview(self, obj):
        if obj.imagen:
            return format_html(
                '<img src="{}" style="width: 100px; height: 70px; object-fit: cover; border-radius: 5px;" alt="Imagen">',
                obj.imagen.url
            )
        return "Sin imagen"

    @admin.display(description="Portada")
    def portada_display(self, obj):
        """Indica si esta imagen es la portada"""
        if obj.portada:
            return format_html(
                '<span style="color: #28a745; font-weight: bold;">✅ Portada</span>'
            )
        else:
            return format_html(
                '<span style="color: #6c757d;">📷 Normal</span>'
            )

    def dimensiones(self, obj):
        if obj.ancho and obj.alto:
            return f"{obj.ancho} × {obj.alto} px"
        return "N/A"


@admin.register(TarifaVehiculo)
class TarifaVehiculoAdmin(admin.ModelAdmin):
    list_display = (
        "vehiculo_info", 
        "periodo_vigencia", 
        "precio_display", 
        "estado_vigencia"
    )
    list_filter = (
        "vehiculo__marca", 
        "vehiculo__categoria",
        "fecha_inicio", 
        "fecha_fin"
    )
    search_fields = ("vehiculo__marca", "vehiculo__modelo", "vehiculo__matricula")
    date_hierarchy = "fecha_inicio"
    readonly_fields = ("dias_vigencia", "estado_vigencia")
    
    fieldsets = (
        (
            "Información de la Tarifa",
            {
                "fields": (
                    "vehiculo",
                    "precio_dia",
                    ("fecha_inicio", "fecha_fin"),
                )
            },
        ),
        (
            "Información Calculada",
            {
                "fields": ("dias_vigencia", "estado_vigencia"),
                "classes": ("collapse",),
            },
        ),
    )

    def vehiculo_info(self, obj):
        return format_html(
            '<strong>{} {}</strong><br>'
            '<small>{}</small>',
            obj.vehiculo.marca,
            obj.vehiculo.modelo,
            obj.vehiculo.matricula
        )

    def periodo_vigencia(self, obj):
        return format_html(
            '<strong>📅 {}</strong><br>'
            '<small>hasta</small><br>'
            '<strong>📅 {}</strong>',
            obj.fecha_inicio.strftime("%d/%m/%Y"),
            obj.fecha_fin.strftime("%d/%m/%Y")
        )

    @admin.display(description="Precio")
    def precio_display(self, obj):
        return format_html(
            '<strong style="color: #007bff; font-size: 1.1em;">€{}</strong><br>'
            '<small>por día</small>',
            obj.precio_dia
        )

    def estado_vigencia(self, obj):
        hoy = timezone.now().date()
        if obj.fecha_inicio <= hoy <= obj.fecha_fin:
            return format_html('<span style="color: #28a745; font-weight: bold;">✅ Activa</span>')
        elif hoy < obj.fecha_inicio:
            return format_html('<span style="color: #ffc107; font-weight: bold;">⏳ Futura</span>')
        else:
            return format_html('<span style="color: #6c757d; font-weight: bold;">⏹️ Expirada</span>')

    def dias_vigencia(self, obj):
        dias = (obj.fecha_fin - obj.fecha_inicio).days + 1
        return f"{dias} días"


@admin.register(Mantenimiento)
class MantenimientoAdmin(admin.ModelAdmin):
    list_display = (
        "vehiculo_info", 
        "fecha", 
        "tipo_servicio_short", 
        "coste_display",
        "estado_urgencia"
    )
    list_filter = (
        "vehiculo__marca", 
        "vehiculo__categoria",
        "fecha", 
        "tipo_servicio"
    )
    search_fields = (
        "vehiculo__marca", 
        "vehiculo__modelo", 
        "vehiculo__matricula",
        "tipo_servicio",
        "notas"
    )
    date_hierarchy = "fecha"
    readonly_fields = ("created_at", "updated_at", "tiempo_desde_mantenimiento")

    fieldsets = (
        (
            "Información del Mantenimiento",
            {
                "fields": (
                    "vehiculo",
                    "fecha",
                    "tipo_servicio",
                    "coste",
                )
            },
        ),
        (
            "Detalles",
            {
                "fields": ("notas",)
            },
        ),
        (
            "Información Calculada",
            {
                "fields": ("tiempo_desde_mantenimiento",),
                "classes": ("collapse",),
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

    def vehiculo_info(self, obj):
        return format_html(
            '<strong>{} {}</strong><br>'
            '<small>{}</small>',
            obj.vehiculo.marca,
            obj.vehiculo.modelo,
            obj.vehiculo.matricula
        )

    def tipo_servicio_short(self, obj):
        return obj.tipo_servicio[:30] + "..." if len(obj.tipo_servicio) > 30 else obj.tipo_servicio

    @admin.display(description="Coste")
    def coste_display(self, obj):
        return format_html(
            '<strong style="color: #dc3545;">€{}</strong>',
            obj.coste
        )

    def estado_urgencia(self, obj):
        """Indicar si es un mantenimiento urgente basado en el tiempo transcurrido"""
        hoy = timezone.now().date()
        # Convertir datetime a date si es necesario para comparación
        fecha_obj = obj.fecha.date() if hasattr(obj.fecha, 'date') else obj.fecha
        dias_transcurridos = (hoy - fecha_obj).days
        
        if dias_transcurridos < 30:
            return format_html('<span style="color: #28a745;">🔧 Reciente</span>')
        elif dias_transcurridos < 90:
            return format_html('<span style="color: #ffc107;">⚠️ Regular</span>')
        else:
            return format_html('<span style="color: #dc3545;">🚨 Revisar</span>')

    def tiempo_desde_mantenimiento(self, obj):
        hoy = timezone.now().date()
        # Convertir datetime a date si es necesario para comparación
        fecha_obj = obj.fecha.date() if hasattr(obj.fecha, 'date') else obj.fecha
        dias = (hoy - fecha_obj).days
        if dias == 0:
            return "Hoy"
        elif dias == 1:
            return "Ayer"
        elif dias < 30:
            return f"Hace {dias} días"
        elif dias < 365:
            meses = dias // 30
            return f"Hace {meses} mes{'es' if meses > 1 else ''}"
        else:
            años = dias // 365
            return f"Hace {años} año{'s' if años > 1 else ''}"
