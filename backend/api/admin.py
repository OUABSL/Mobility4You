# api/admin.py
"""
Panel de Administración Avanzado para Mobility-for-you
Implementa operaciones CRUD completas con manejo de errores y logging robusto
"""

import logging
import json
from datetime import datetime, timedelta
from typing import Any, List, Optional, Union
from django.contrib import admin, messages
from django.contrib.admin import SimpleListFilter
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE, DELETION
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError, PermissionDenied
from django.db import transaction, DatabaseError, IntegrityError
from django.db.models import QuerySet, Count, Sum, Q, Avg
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect, render
from django.urls import path, reverse
from django.utils import timezone
from django.utils.html import format_html, mark_safe
from django.utils.safestring import SafeString
from django.utils.translation import gettext_lazy as _
import csv
from io import StringIO

# Importación de modelos
from .models import (
    Usuario, Categoria, GrupoCoche, Vehiculo, ImagenVehiculo, TarifaVehiculo, 
    Mantenimiento, Direccion, Lugar, PoliticaPago, PoliticaIncluye, 
    TipoPenalizacion, PoliticaPenalizacion, Promocion, Reserva, ReservaConductor, 
    Penalizacion, ReservaExtra, Extras, Contenido, Contrato, Factura, Contacto
)

# Configuración del logger para el panel de administración
logger = logging.getLogger('admin_operations')

# ===============================
# DECORADORES Y UTILIDADES
# ===============================

def admin_log_action(action_type: str):
    """
    Decorador para registrar acciones administrativas con manejo de errores
    """
    def decorator(func):
        def wrapper(self, request, *args, **kwargs):
            start_time = timezone.now()
            user = request.user
            model_name = self.model.__name__
            
            try:
                # Log del inicio de la operación
                logger.info(
                    f"INICIO {action_type}: Usuario {user.username} ({user.id}) "
                    f"ejecutando {action_type} en {model_name}",
                    extra={'user_id': user.id, 'model': model_name, 'action': action_type}
                )
                
                # Ejecutar la función original
                result = func(self, request, *args, **kwargs)
                
                # Log de éxito
                execution_time = (timezone.now() - start_time).total_seconds()
                logger.info(
                    f"ÉXITO {action_type}: Completado en {execution_time:.2f}s "
                    f"por {user.username} en {model_name}",
                    extra={
                        'user_id': user.id, 
                        'model': model_name, 
                        'action': action_type,
                        'execution_time': execution_time,
                        'status': 'success'
                    }
                )
                
                return result
                
            except PermissionDenied as e:
                logger.warning(
                    f"PERMISO DENEGADO {action_type}: Usuario {user.username} "
                    f"sin permisos para {action_type} en {model_name}: {str(e)}",
                    extra={'user_id': user.id, 'model': model_name, 'action': action_type, 'error': str(e)}
                )
                messages.error(request, f"No tienes permisos para realizar esta acción: {str(e)}")
                raise
                
            except ValidationError as e:
                logger.error(
                    f"ERROR VALIDACIÓN {action_type}: {str(e)} por {user.username} en {model_name}",
                    extra={'user_id': user.id, 'model': model_name, 'action': action_type, 'error': str(e)}
                )
                messages.error(request, f"Error de validación: {str(e)}")
                raise
                
            except (DatabaseError, IntegrityError) as e:
                logger.error(
                    f"ERROR BASE DATOS {action_type}: {str(e)} por {user.username} en {model_name}",
                    extra={'user_id': user.id, 'model': model_name, 'action': action_type, 'error': str(e)},
                    exc_info=True
                )
                messages.error(request, f"Error de base de datos: {str(e)}")
                raise
                
            except Exception as e:
                execution_time = (timezone.now() - start_time).total_seconds()
                logger.critical(
                    f"ERROR CRÍTICO {action_type}: {str(e)} por {user.username} en {model_name} "
                    f"después de {execution_time:.2f}s",
                    extra={
                        'user_id': user.id, 
                        'model': model_name, 
                        'action': action_type, 
                        'error': str(e),
                        'execution_time': execution_time
                    },
                    exc_info=True
                )
                messages.error(request, f"Error inesperado: {str(e)}")
                raise
                
        return wrapper
    return decorator

class BaseAdvancedAdmin(admin.ModelAdmin):
    """
    Clase base para todos los administradores con funcionalidades avanzadas
    """
    
    # Configuración común
    save_on_top = True
    list_per_page = 25
    list_max_show_all = 100
    preserve_filters = True
    
    def get_urls(self):
        """Añadir URLs personalizadas para funcionalidades avanzadas"""
        urls = super().get_urls()
        custom_urls = [
            path('export-csv/', self.admin_site.admin_view(self.export_csv), name=f'{self.model._meta.app_label}_{self.model._meta.model_name}_export_csv'),
            path('import-csv/', self.admin_site.admin_view(self.import_csv), name=f'{self.model._meta.app_label}_{self.model._meta.model_name}_import_csv'),
            path('bulk-actions/', self.admin_site.admin_view(self.bulk_actions_view), name=f'{self.model._meta.app_label}_{self.model._meta.model_name}_bulk_actions'),
        ]
        return custom_urls + urls
    
    @admin_log_action('EXPORT_CSV')
    def export_csv(self, request):
        """Exportar datos a CSV con manejo de errores"""
        try:
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{self.model._meta.model_name}_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            
            writer = csv.writer(response)
            
            # Escribir cabeceras
            field_names = [field.name for field in self.model._meta.fields]
            writer.writerow(field_names)
            
            # Escribir datos
            queryset = self.get_queryset(request)
            for obj in queryset:
                row = []
                for field_name in field_names:
                    value = getattr(obj, field_name)
                    if value is None:
                        row.append('')
                    else:
                        row.append(str(value))
                writer.writerow(row)
            
            messages.success(request, f"Exportación completada: {queryset.count()} registros exportados")
            return response
            
        except Exception as e:
            logger.error(f"Error en exportación CSV: {str(e)}", exc_info=True)
            messages.error(request, f"Error durante la exportación: {str(e)}")
            return redirect(request.META.get('HTTP_REFERER', f'admin:{self.model._meta.app_label}_{self.model._meta.model_name}_changelist'))    @admin_log_action('IMPORT_CSV')  
    def import_csv(self, request):
        """Importar datos desde CSV con validación y manejo de errores"""
        if request.method == 'POST':
            try:
                csv_file = request.FILES.get('csv_file')
                validate_only = request.POST.get('validate_only') == '1'
                skip_errors = request.POST.get('skip_errors') == '1'
                update_existing = request.POST.get('update_existing') == '1'
                
                if not csv_file:
                    return JsonResponse({'success': False, 'message': 'No se ha seleccionado ningún archivo'})
                
                if not csv_file.name.endswith('.csv'):
                    return JsonResponse({'success': False, 'message': 'El archivo debe ser de tipo CSV'})
                
                decoded_file = csv_file.read().decode('utf-8')
                csv_data = csv.DictReader(StringIO(decoded_file))
                
                created_count = 0
                updated_count = 0
                error_count = 0
                errors = []
                
                if not validate_only:
                    with transaction.atomic():
                        for row_num, row in enumerate(csv_data, start=2):
                            try:
                                # Verificar si existe (para actualización)
                                instance = None
                                if update_existing and 'id' in row and row['id']:
                                    try:
                                        instance = self.model.objects.get(id=row['id'])
                                        is_update = True
                                    except self.model.DoesNotExist:
                                        instance = self.model()
                                        is_update = False
                                else:
                                    instance = self.model()
                                    is_update = False
                                
                                # Asignar valores de los campos
                                for field_name, value in row.items():
                                    if hasattr(instance, field_name) and value:
                                        field = instance._meta.get_field(field_name)
                                        
                                        # Manejar diferentes tipos de campos
                                        if field.get_internal_type() == 'BooleanField':
                                            value = value.lower() in ['true', '1', 'yes', 'sí']
                                        elif field.get_internal_type() in ['IntegerField', 'BigIntegerField']:
                                            value = int(value) if value else None
                                        elif field.get_internal_type() in ['FloatField', 'DecimalField']:
                                            value = float(value) if value else None
                                        elif field.get_internal_type() in ['DateField', 'DateTimeField']:
                                            if value:
                                                value = datetime.fromisoformat(value)
                                        
                                        setattr(instance, field_name, value)
                                
                                # Validar y guardar
                                instance.full_clean()
                                instance.save()
                                
                                if is_update:
                                    updated_count += 1
                                else:
                                    created_count += 1
                                    
                            except Exception as e:
                                error_count += 1
                                error_msg = f"Fila {row_num}: {str(e)}"
                                errors.append(error_msg)
                                logger.warning(error_msg)
                                
                                if not skip_errors:
                                    raise
                
                # Preparar respuesta
                message = f"Importación completada: {created_count} creados, {updated_count} actualizados"
                if error_count > 0:
                    message += f", {error_count} errores"
                
                return JsonResponse({
                    'success': True, 
                    'message': message,
                    'created': created_count,
                    'updated': updated_count,
                    'errors': error_count
                })
                    
            except Exception as e:
                logger.error(f"Error en importación CSV: {str(e)}", exc_info=True)
                return JsonResponse({'success': False, 'message': f"Error durante la importación: {str(e)}"})
        
        # Mostrar formulario de importación
        context = {
            'title': f'Importar {self.model._meta.verbose_name_plural}',
            'model_name': self.model._meta.verbose_name_plural,
            'opts': self.model._meta,
        }
        return render(request, 'admin/import_csv.html', context)
    
    def bulk_actions_view(self, request):
        """Vista para acciones masivas personalizadas"""
        if request.method == 'POST':
            action = request.POST.get('action')
            selected_ids = request.POST.getlist('selected_ids')
            
            if not selected_ids:
                messages.error(request, "No se han seleccionado elementos")
                return redirect(request.META.get('HTTP_REFERER'))
            
            try:
                queryset = self.model.objects.filter(id__in=selected_ids)
                
                if action == 'bulk_delete':
                    return self._bulk_delete(request, queryset)
                elif action == 'bulk_activate':
                    return self._bulk_activate(request, queryset, True)
                elif action == 'bulk_deactivate':
                    return self._bulk_activate(request, queryset, False)
                    
            except Exception as e:
                logger.error(f"Error en acción masiva: {str(e)}", exc_info=True)
                messages.error(request, f"Error: {str(e)}")
                
        return redirect(f'admin:{self.model._meta.app_label}_{self.model._meta.model_name}_changelist')
    
    @admin_log_action('BULK_DELETE')
    def _bulk_delete(self, request, queryset):
        """Eliminación masiva con confirmación"""
        count = queryset.count()
        queryset.delete()
        messages.success(request, f"Se han eliminado {count} registros")
        return redirect(f'admin:{self.model._meta.app_label}_{self.model._meta.model_name}_changelist')
    
    @admin_log_action('BULK_ACTIVATE')
    def _bulk_activate(self, request, queryset, activate: bool):
        """Activación/desactivación masiva"""
        if hasattr(self.model, 'activo'):
            count = queryset.update(activo=activate)
            action_text = "activado" if activate else "desactivado"
            messages.success(request, f"Se han {action_text} {count} registros")
        else:
            messages.error(request, "Este modelo no tiene campo 'activo'")
        return redirect(f'admin:{self.model._meta.app_label}_{self.model._meta.model_name}_changelist')

    @admin_log_action('SAVE')
    def save_model(self, request, obj, form, change):
        """Sobrescribir save_model con logging y validación"""
        try:
            if not change:  # Nuevo objeto
                logger.info(f"Creando nuevo {self.model.__name__} por usuario {request.user.username}")
            else:  # Editando objeto existente
                logger.info(f"Modificando {self.model.__name__} ID:{obj.pk} por usuario {request.user.username}")
            
            # Guardar el objeto
            super().save_model(request, obj, form, change)
            
            action = "creado" if not change else "actualizado"
            messages.success(request, f"{self.model._meta.verbose_name} {action} exitosamente")
            
        except ValidationError as e:
            logger.error(f"Error de validación al guardar {self.model.__name__}: {str(e)}")
            messages.error(request, f"Error de validación: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error al guardar {self.model.__name__}: {str(e)}", exc_info=True)
            messages.error(request, f"Error al guardar: {str(e)}")
            raise

    @admin_log_action('DELETE')
    def delete_model(self, request, obj):
        """Sobrescribir delete_model con logging"""
        try:
            model_name = str(obj)
            logger.info(f"Eliminando {self.model.__name__} '{model_name}' por usuario {request.user.username}")
            super().delete_model(request, obj)
            messages.success(request, f"{self.model._meta.verbose_name} eliminado exitosamente")
        except Exception as e:
            logger.error(f"Error al eliminar {self.model.__name__}: {str(e)}", exc_info=True)
            messages.error(request, f"Error al eliminar: {str(e)}")
            raise

    @admin_log_action('BULK_DELETE')
    def delete_queryset(self, request, queryset):
        """Sobrescribir delete_queryset con logging"""
        try:
            count = queryset.count()
            logger.info(f"Eliminación masiva: {count} {self.model.__name__} por usuario {request.user.username}")
            queryset.delete()
            messages.success(request, f"Se han eliminado {count} registros exitosamente")
        except Exception as e:
            logger.error(f"Error en eliminación masiva {self.model.__name__}: {str(e)}", exc_info=True)
            messages.error(request, f"Error en eliminación masiva: {str(e)}")
            raise

# ===============================
# FILTROS PERSONALIZADOS
# ===============================

class DateRangeFilter(SimpleListFilter):
    """Filtro personalizado para rangos de fechas"""
    title = _('Rango de fechas')
    parameter_name = 'date_range'

    def lookups(self, request, model_admin):
        return [
            ('today', _('Hoy')),
            ('week', _('Esta semana')),
            ('month', _('Este mes')),
            ('year', _('Este año')),
        ]

    def queryset(self, request, queryset):
        now = timezone.now()
        
        if self.value() == 'today':
            return queryset.filter(created_at__date=now.date())
        elif self.value() == 'week':
            start = now - timedelta(days=7)
            return queryset.filter(created_at__gte=start)
        elif self.value() == 'month':
            start = now.replace(day=1)
            return queryset.filter(created_at__gte=start)
        elif self.value() == 'year':
            start = now.replace(month=1, day=1)
            return queryset.filter(created_at__gte=start)

# ===============================
# INLINES AVANZADOS
# ===============================

class ImagenVehiculoInline(admin.TabularInline):
    model = ImagenVehiculo
    extra = 1
    fields = ('url', 'portada')
    readonly_fields = ()
    
    def get_extra(self, request, obj=None, **kwargs):
        """Dinámicamente ajustar el número de forms extra"""
        if obj and obj.imagenvehiculo_set.exists():
            return 0
        return 1


class TarifaVehiculoInline(admin.TabularInline):
    """Inline para tarifas de vehículos - Solo campos existentes"""
    model = TarifaVehiculo
    extra = 1
    fields = ('fecha_inicio', 'fecha_fin', 'precio_dia')
    readonly_fields = ()
    
    def get_formset(self, request, obj=None, **kwargs):
        """Personalizar el formset para el inline"""
        formset = super().get_formset(request, obj, **kwargs)
        
        # Verificar que solo usamos campos que existen
        if hasattr(self.model, 'precio_dia'):
            if 'precio_semana' in self.fields:
                self.fields = tuple(f for f in self.fields if f != 'precio_semana')
            if 'precio_mes' in self.fields:
                self.fields = tuple(f for f in self.fields if f != 'precio_mes')
        
        return formset
    
    def get_extra(self, request, obj=None, **kwargs):
        """Dinámicamente ajustar el número de forms extra"""
        if obj and hasattr(obj, 'tarifas') and obj.tarifas.exists():
            return 0
        return 1

class PoliticaIncluyeInline(admin.TabularInline):
    model = PoliticaIncluye
    extra = 2
    fields = ('descripcion',)

class PoliticaPenalizacionInline(admin.TabularInline):
    model = PoliticaPenalizacion
    extra = 1
    fields = ('tipo_penalizacion', 'importe')

class ReservaConductorInline(admin.TabularInline):
    model = ReservaConductor
    extra = 1
    fields = ('nombre', 'apellidos', 'email', 'telefono', 'rol')
    readonly_fields = ()

class PenalizacionInline(admin.TabularInline):
    model = Penalizacion
    extra = 0
    readonly_fields = ('fecha',)
    fields = ('tipo_penalizacion', 'importe', 'fecha', 'descripcion')

class ReservaExtraInline(admin.TabularInline):
    model = ReservaExtra
    extra = 1
    fields = ('extra', 'cantidad')

# ===============================
# ADMINISTRADORES DE MODELOS
# ===============================

@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin, BaseAdvancedAdmin):
    """Administrador avanzado para el modelo Usuario"""
    
    # Campos de lista
    list_display = (
        'username', 'email', 'first_name', 'last_name', 'get_rol', 
        'fecha_nacimiento', 'is_active', 'date_joined', 'last_login'
    )
    list_filter = (
        'is_active', 'is_staff', 'is_superuser', 'rol', 'sexo', 
        'nacionalidad', 'tipo_documento', DateRangeFilter
    )
    search_fields = (
        'username', 'email', 'first_name', 'last_name', 
        'numero_documento', 'telefono'
    )
    ordering = ('-date_joined',)
    readonly_fields = ('date_joined', 'last_login', 'password')
    
    # Fieldsets personalizados
    fieldsets = (
        ('Información de autenticación', {
            'fields': ('username', 'password', 'email')
        }),
        ('Información personal', {
            'fields': (
                ('first_name', 'last_name'), 
                'fecha_nacimiento', 'sexo', 'nacionalidad',
                ('tipo_documento', 'numero_documento'),
                'imagen_carnet', 'telefono', 'direccion'
            )
        }),
        ('Configuración de cuenta', {
            'fields': ('rol', 'is_active', 'is_staff', 'is_superuser')
        }),
        ('Fechas importantes', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',)
        }),
        ('Permisos', {
            'fields': ('groups', 'user_permissions'),
            'classes': ('collapse',)
        }),
    )
    
    # Fieldsets para creación
    add_fieldsets = (
        ('Información básica', {
            'classes': ('wide',),
            'fields': (
                'username', 'email', 'password1', 'password2',
                'first_name', 'last_name', 'fecha_nacimiento',
                'sexo', 'nacionalidad', 'tipo_documento', 
                'numero_documento', 'telefono', 'rol'
            )
        }),
    )
    
    def get_rol(self, obj):
        """Mostrar rol con color"""
        color_map = {
            'admin': 'red',
            'empresa': 'blue', 
            'cliente': 'green'
        }
        color = color_map.get(obj.rol, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_rol_display()
        )
    get_rol.short_description = 'Rol'
    get_rol.admin_order_field = 'rol'
    
    @admin_log_action('GET_QUERYSET')
    def get_queryset(self, request):
        """Optimizar consultas con select_related"""
        return super().get_queryset(request).select_related('direccion')
    
    def get_readonly_fields(self, request, obj=None):
        """Campos de solo lectura dinámicos"""
        readonly = list(self.readonly_fields)
        if obj and not request.user.is_superuser:
            readonly.extend(['is_superuser', 'user_permissions'])
        return readonly
    
    actions = ['make_active', 'make_inactive', 'reset_password_action']
    
    @admin_log_action('BULK_ACTIVATE_USERS')
    def make_active(self, request, queryset):
        """Activar usuarios seleccionados"""
        try:
            updated = queryset.update(is_active=True)
            messages.success(request, f"{updated} usuarios activados exitosamente")
        except Exception as e:
            messages.error(request, f"Error al activar usuarios: {str(e)}")
    make_active.short_description = "Activar usuarios seleccionados"
    
    @admin_log_action('BULK_DEACTIVATE_USERS')
    def make_inactive(self, request, queryset):
        """Desactivar usuarios seleccionados"""
        try:
            updated = queryset.update(is_active=False)
            messages.success(request, f"{updated} usuarios desactivados exitosamente")
        except Exception as e:
            messages.error(request, f"Error al desactivar usuarios: {str(e)}")
    make_inactive.short_description = "Desactivar usuarios seleccionados"


@admin.register(Categoria)
class CategoriaAdmin(BaseAdvancedAdmin):
    """Administrador avanzado para categorías de vehículos"""
    
    list_display = ('nombre', 'get_vehiculos_count', 'get_vehiculos_activos')
    search_fields = ('nombre',)
    ordering = ('nombre',)
    
    def get_vehiculos_count(self, obj):
        """Contador total de vehículos"""
        count = obj.vehiculos.count()
        url = reverse('admin:api_vehiculo_changelist') + f'?categoria__id__exact={obj.id}'
        return format_html(
            '<a href="{}" style="text-decoration: none;">'
            '<span style="background: #007cba; color: white; padding: 2px 6px; '
            'border-radius: 3px; font-size: 11px;">{}</span></a>',
            url, count
        )
    get_vehiculos_count.short_description = 'Total Vehículos'
    
    def get_vehiculos_activos(self, obj):
        """Contador de vehículos activos"""
        count = obj.vehiculos.filter(activo=True).count()
        return format_html(
            '<span style="color: green; font-weight: bold;">{}</span>',
            count
        )
    get_vehiculos_activos.short_description = 'Activos'
    
    @admin_log_action('GET_QUERYSET')
    def get_queryset(self, request):
        """Optimizar con anotaciones"""
        return super().get_queryset(request).annotate(
            vehiculos_count=Count('vehiculos'),
            vehiculos_activos=Count('vehiculos', filter=Q(vehiculos__activo=True))
        )


@admin.register(GrupoCoche)  
class GrupoCocheAdmin(BaseAdvancedAdmin):
    """Administrador para grupos de coches"""
    
    list_display = ('nombre', 'get_vehiculos_count')
    search_fields = ('nombre',)
    ordering = ('nombre',)
    
    def get_vehiculos_count(self, obj):
        """Contador de vehículos por grupo"""
        count = obj.vehiculos.count()
        return format_html(
            '<span style="background: #28a745; color: white; padding: 2px 6px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            count
        )
    get_vehiculos_count.short_description = 'Vehículos'


@admin.register(Vehiculo)
class VehiculoAdmin(BaseAdvancedAdmin):
    """Administrador avanzado para vehículos"""
    
    list_display = (
        'get_vehiculo_info', 'matricula', 'categoria', 'grupo',
        'get_precio_actual', 'get_disponibilidad_status', 'get_estado_badge',
        'kilometraje', 'get_mantenimientos_count'
    )
    list_filter = (
        'disponible', 'activo', 'categoria', 'grupo', 'combustible',
        'num_puertas', 'num_pasajeros', DateRangeFilter
    )
    search_fields = (
        'marca', 'modelo', 'matricula', 'color',
        'categoria__nombre', 'grupo__nombre'
    )
    readonly_fields = ('created_at', 'updated_at')
    inlines = [ImagenVehiculoInline, TarifaVehiculoInline]
    
    fieldsets = (
        ('Información básica', {
            'fields': (
                ('marca', 'modelo'), 'matricula', 
                ('categoria', 'grupo'), 'combustible', 
                ('anio', 'color')
            )
        }),
        ('Características técnicas', {
            'fields': (
                ('num_puertas', 'num_pasajeros'), 
                'capacidad_maletero', 'kilometraje'
            )
        }),
        ('Estado y precios', {
            'fields': (
                ('disponible', 'activo'), 'fianza'
            )
        }),        ('Notas administrativas', {
            'fields': ('notas_internas',),
            'classes': ('collapse',)
        }),
        ('Información del sistema', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_vehiculo_info(self, obj):
        """Información completa del vehículo"""
        return format_html(
            '<strong>{} {}</strong><br>'
            '<small style="color: #666;">Año: {}</small>',
            obj.marca, obj.modelo, obj.anio or 'N/A'
        )
    get_vehiculo_info.short_description = 'Vehículo'
    
    def get_precio_actual(self, obj):
        """Precio actual con formato"""
        today = timezone.now().date()
        tarifa = obj.tarifas.filter(
            fecha_inicio__lte=today, 
            fecha_fin__gte=today        ).order_by('-fecha_inicio').first()
        
        if tarifa:
            return format_html(
                '<span style="color: green; font-weight: bold;">{} €/día</span>',
                tarifa.precio_dia
            )
        return format_html('<span style="color: red;">Sin tarifa</span>')
    get_precio_actual.short_description = 'Precio actual'
    
    def get_disponibilidad_status(self, obj):
        """Estado de disponibilidad visual"""
        if obj.disponible and obj.activo:
            return format_html(
                '<span style="color: green;">● Disponible</span>'
            )
        elif obj.activo:
            return format_html(
                '<span style="color: orange;">● Ocupado</span>'
            )
        else:
            return format_html(
                '<span style="color: red;">● Inactivo</span>'
            )
    get_disponibilidad_status.short_description = 'Estado'
    
    def get_estado_badge(self, obj):
        """Badge visual del estado"""
        if obj.activo:
            color = "success" if obj.disponible else "warning"
            text = "Activo" if obj.disponible else "Ocupado"
        else:
            color = "danger"
            text = "Inactivo"
            
        return format_html(
            '<span class="badge badge-{}">{}</span>',
            color, text
        )
    get_estado_badge.short_description = 'Estado'
    
    def get_mantenimientos_count(self, obj):
        """Contador de mantenimientos"""
        count = obj.mantenimientos.count()
        if count > 0:
            url = reverse('admin:api_mantenimiento_changelist') + f'?vehiculo__id__exact={obj.id}'
            return format_html(
                '<a href="{}">{}</a>',
                url, count
            )
        return '0'
    get_mantenimientos_count.short_description = 'Mantenimientos'
    
    @admin_log_action('GET_QUERYSET')
    def get_queryset(self, request):
        """Optimizar consultas"""
        return super().get_queryset(request).select_related(
            'categoria', 'grupo'
        ).prefetch_related('tarifas', 'mantenimientos')
    
    actions = ['make_available', 'make_unavailable', 'activate_vehicles', 'deactivate_vehicles']
    
    @admin_log_action('BULK_MAKE_AVAILABLE')
    def make_available(self, request, queryset):
        """Marcar vehículos como disponibles"""
        try:
            updated = queryset.update(disponible=True)
            messages.success(request, f"{updated} vehículos marcados como disponibles")
        except Exception as e:
            messages.error(request, f"Error: {str(e)}")
    make_available.short_description = "Marcar como disponibles"
    
    @admin_log_action('BULK_MAKE_UNAVAILABLE')
    def make_unavailable(self, request, queryset):
        """Marcar vehículos como no disponibles"""
        try:
            updated = queryset.update(disponible=False)
            messages.success(request, f"{updated} vehículos marcados como no disponibles")
        except Exception as e:
            messages.error(request, f"Error: {str(e)}")
    make_unavailable.short_description = "Marcar como no disponibles"


@admin.register(ImagenVehiculo)
class ImagenVehiculoAdmin(BaseAdvancedAdmin):
    """Administrador para imágenes de vehículos"""
    
    list_display = ('get_vehiculo_info', 'get_imagen_preview', 'portada', 'url')
    list_filter = ('portada', 'vehiculo__categoria')
    search_fields = ('vehiculo__marca', 'vehiculo__modelo', 'vehiculo__matricula')
    
    def get_vehiculo_info(self, obj):
        """Información del vehículo"""
        return f"{obj.vehiculo.marca} {obj.vehiculo.modelo} ({obj.vehiculo.matricula})"
    get_vehiculo_info.short_description = 'Vehículo'
    
    def get_imagen_preview(self, obj):
        """Preview de la imagen"""
        if obj.url:
            return format_html(
                '<img src="{}" style="max-width: 50px; max-height: 50px; border-radius: 4px;">',
                obj.url
            )
        return "Sin imagen"
    get_imagen_preview.short_description = 'Preview'


@admin.register(TarifaVehiculo)
class TarifaVehiculoAdmin(BaseAdvancedAdmin):
    """Administrador para tarifas de vehículos"""
    
    list_display = (
        'get_vehiculo_info', 'fecha_inicio', 'fecha_fin',
        'precio_dia', 'get_estado_vigencia'
    )
    list_filter = ('fecha_inicio', 'fecha_fin', 'vehiculo__categoria')
    search_fields = ('vehiculo__marca', 'vehiculo__modelo', 'vehiculo__matricula')
    date_hierarchy = 'fecha_inicio'
    
    def get_vehiculo_info(self, obj):
        """Información del vehículo"""
        return f"{obj.vehiculo.marca} {obj.vehiculo.modelo}"
    get_vehiculo_info.short_description = 'Vehículo'
    
    def get_estado_vigencia(self, obj):
        """Estado de vigencia de la tarifa"""
        hoy = timezone.now().date()
        if obj.fecha_inicio <= hoy <= obj.fecha_fin:
            return format_html('<span style="color: green; font-weight: bold;">● Vigente</span>')
        elif hoy < obj.fecha_inicio:
            return format_html('<span style="color: blue;">● Futura</span>')
        else:
            return format_html('<span style="color: red;">● Expirada</span>')
    get_estado_vigencia.short_description = 'Estado'


@admin.register(Mantenimiento)
class MantenimientoAdmin(BaseAdvancedAdmin):
    """Administrador para mantenimientos"""
    
    list_display = (
        'get_vehiculo_info', 'tipo_servicio', 'fecha', 
        'get_coste_formatted', 'get_dias_desde_mantenimiento'
    )
    list_filter = ('tipo_servicio', 'fecha', 'vehiculo__categoria')
    search_fields = (
        'vehiculo__marca', 'vehiculo__modelo', 'vehiculo__matricula',
        'tipo_servicio', 'descripcion'
    )
    date_hierarchy = 'fecha'
    readonly_fields = ('created_at',)
    
    fieldsets = (
        ('Información del mantenimiento', {
            'fields': ('vehiculo', 'tipo_servicio', 'fecha', 'coste')
        }),
        ('Detalles', {
            'fields': ('descripcion',)
        }),
        ('Información del sistema', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def get_vehiculo_info(self, obj):
        """Información del vehículo"""
        return format_html(
            '<strong>{} {}</strong><br>'
            '<small>{}</small>',
            obj.vehiculo.marca, obj.vehiculo.modelo, obj.vehiculo.matricula
        )
    get_vehiculo_info.short_description = 'Vehículo'
    
    def get_coste_formatted(self, obj):
        """Coste formateado"""
        if obj.coste:
            return format_html(
                '<span style="color: #007cba; font-weight: bold;">{} €</span>',
                obj.coste
            )
        return '-'
    get_coste_formatted.short_description = 'Coste'
    
    def get_dias_desde_mantenimiento(self, obj):
        """Días desde el mantenimiento"""
        dias = (timezone.now().date() - obj.fecha).days
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
    get_dias_desde_mantenimiento.short_description = 'Antigüedad'
    
    @admin_log_action('GET_QUERYSET')
    def get_queryset(self, request):
        """Optimizar consultas"""
        return super().get_queryset(request).select_related('vehiculo')


@admin.register(Direccion)
class DireccionAdmin(BaseAdvancedAdmin):
    """Administrador para direcciones"""
    
    list_display = (
        'get_direccion_completa', 'ciudad', 'provincia', 
        'pais', 'codigo_postal', 'get_usuarios_count'
    )
    list_filter = ('ciudad', 'provincia', 'pais')
    search_fields = ('calle', 'ciudad', 'provincia', 'codigo_postal')
    ordering = ('pais', 'provincia', 'ciudad', 'calle')
    
    fieldsets = (
        ('Dirección', {
            'fields': ('calle', 'ciudad', 'provincia', 'pais', 'codigo_postal')
        }),
        ('Información adicional', {
            'fields': ('informacion_adicional',),
            'classes': ('collapse',)
        }),
    )
    
    def get_direccion_completa(self, obj):
        """Dirección formateada"""
        return format_html(
            '<strong>{}</strong><br>'
            '<small>{}, {} - {}</small>',
            obj.calle or 'Sin calle',
            obj.ciudad or 'Sin ciudad',
            obj.provincia or 'Sin provincia',
            obj.codigo_postal or 'Sin CP'
        )
    get_direccion_completa.short_description = 'Dirección completa'
    
    def get_usuarios_count(self, obj):
        """Contador de usuarios asociados"""
        count = obj.usuarios.count()
        if count > 0:
            return format_html(
                '<span style="background: #17a2b8; color: white; padding: 2px 6px; '
                'border-radius: 3px; font-size: 11px;">{}</span>',
                count
            )
        return '0'
    get_usuarios_count.short_description = 'Usuarios'
    
    @admin_log_action('GET_QUERYSET')
    def get_queryset(self, request):
        """Optimizar con anotaciones"""
        return super().get_queryset(request).annotate(
            usuarios_count=Count('usuarios')
        )


@admin.register(Lugar)
class LugarAdmin(BaseAdvancedAdmin):
    """Administrador para lugares"""
    
    list_display = (
        'nombre', 'get_direccion_info', 'get_reservas_count',
        'get_coordenadas', 'created_at'
    )
    list_filter = ('direccion__ciudad', 'direccion__provincia', DateRangeFilter)
    search_fields = ('nombre', 'direccion__calle', 'direccion__ciudad')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Información básica', {
            'fields': ('nombre', 'direccion')
        }),
        ('Información del sistema', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_direccion_info(self, obj):
        """Información de la dirección"""
        if obj.direccion:
            return format_html(
                '{}<br><small style="color: #666;">{}, {}</small>',
                obj.direccion.calle or 'Sin calle',
                obj.direccion.ciudad or 'Sin ciudad',
                obj.direccion.provincia or 'Sin provincia'
            )
        return format_html('<span style="color: red;">Sin dirección</span>')
    get_direccion_info.short_description = 'Dirección'
    
    def get_reservas_count(self, obj):
        """Contador de reservas"""
        # Contar reservas tanto como lugar de recogida como de devolución
        count_recogida = obj.reservas_recogida.count()
        count_devolucion = obj.reservas_devolucion.count()
        total = count_recogida + count_devolucion
        
        if total > 0:
            return format_html(
                '<span style="background: #28a745; color: white; padding: 2px 6px; '
                'border-radius: 3px; font-size: 11px;">{}</span>',
                total
            )
        return '0'
    get_reservas_count.short_description = 'Reservas'
    
    def get_coordenadas(self, obj):
        """Mostrar coordenadas si están disponibles"""
        # Asumiendo que el modelo podría tener coordenadas en el futuro
        return format_html('<small style="color: #999;">Por definir</small>')
    get_coordenadas.short_description = 'Coordenadas'
    
    @admin_log_action('GET_QUERYSET')
    def get_queryset(self, request):
        """Optimizar consultas"""
        return super().get_queryset(request).select_related('direccion').annotate(
            reservas_count=Count('reservas_recogida') + Count('reservas_devolucion')
        )


@admin.register(PoliticaPago)
class PoliticaPagoAdmin(BaseAdvancedAdmin):
    """Administrador para políticas de pago"""
    
    list_display = (
        'titulo', 'get_deductible_formatted', 'get_items_count',
        'get_penalizaciones_count', 'created_at'
    )
    search_fields = ('titulo', 'descripcion')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [PoliticaIncluyeInline, PoliticaPenalizacionInline]
    
    fieldsets = (
        ('Información básica', {
            'fields': ('titulo', 'descripcion', 'deductible')
        }),
        ('Información del sistema', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_deductible_formatted(self, obj):
        """Deducible formateado"""
        if obj.deductible:
            return format_html(
                '<span style="color: #dc3545; font-weight: bold;">{} €</span>',
                obj.deductible
            )
        return format_html('<span style="color: #6c757d;">Sin deducible</span>')
    get_deductible_formatted.short_description = 'Deducible'
    
    def get_items_count(self, obj):
        """Contador de items incluidos"""
        count = obj.items.count()
        return format_html(
            '<span style="background: #007bff; color: white; padding: 2px 6px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            count
        )
    get_items_count.short_description = 'Items'
    
    def get_penalizaciones_count(self, obj):
        """Contador de penalizaciones"""
        count = obj.penalizaciones.count()
        return format_html(
            '<span style="background: #dc3545; color: white; padding: 2px 6px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            count
        )
    get_penalizaciones_count.short_description = 'Penalizaciones'


@admin.register(PoliticaIncluye)
class PoliticaIncluyeAdmin(BaseAdvancedAdmin):
    """Administrador para items incluidos en políticas"""
    
    list_display = ('get_politica_titulo', 'item')
    search_fields = ('politica__titulo', 'item')
    list_filter = ('politica',)
    
    def get_politica_titulo(self, obj):
        """Título de la política"""
        return obj.politica.titulo
    get_politica_titulo.short_description = 'Política'


@admin.register(TipoPenalizacion)
class TipoPenalizacionAdmin(BaseAdvancedAdmin):
    """Administrador para tipos de penalización"""
    
    list_display = ('nombre', 'tipo_tarifa', 'get_politicas_count')
    list_filter = ('tipo_tarifa',)
    search_fields = ('nombre',)
    
    def get_politicas_count(self, obj):
        """Contador de políticas que usan este tipo"""
        count = obj.politicapenalizacion_set.count()
        return format_html(
            '<span style="background: #6f42c1; color: white; padding: 2px 6px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            count
        )
    get_politicas_count.short_description = 'Políticas'


@admin.register(PoliticaPenalizacion)
class PoliticaPenalizacionAdmin(BaseAdvancedAdmin):
    """Administrador para penalizaciones de políticas"""
    
    list_display = (
        'get_politica_titulo', 'get_tipo_penalizacion', 
        'get_importe_formatted'
    )
    search_fields = ('politica_pago__titulo', 'tipo_penalizacion__nombre')
    list_filter = ('tipo_penalizacion', 'politica_pago')
    
    def get_politica_titulo(self, obj):
        """Título de la política"""
        return obj.politica_pago.titulo
    get_politica_titulo.short_description = 'Política'
    
    def get_tipo_penalizacion(self, obj):
        """Tipo de penalización"""
        return obj.tipo_penalizacion.nombre
    get_tipo_penalizacion.short_description = 'Tipo'
    
    def get_importe_formatted(self, obj):
        """Importe formateado"""
        return format_html(
            '<span style="color: #dc3545; font-weight: bold;">{} €</span>',
            obj.importe
        )
    get_importe_formatted.short_description = 'Importe'


@admin.register(Promocion)
class PromocionAdmin(BaseAdvancedAdmin):
    """Administrador avanzado para promociones"""
    
    list_display = (
        'nombre', 'get_descuento_badge', 'get_estado_vigencia',
        'fecha_inicio', 'fecha_fin', 'get_reservas_count'
    )
    search_fields = ('nombre', 'descripcion', 'codigo')
    list_filter = ('activo', 'fecha_inicio', 'fecha_fin', DateRangeFilter)
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Información básica', {
            'fields': ('nombre', 'descripcion', 'codigo')
        }),
        ('Configuración del descuento', {
            'fields': ('descuento_pct', 'descuento_fijo')
        }),
        ('Vigencia', {
            'fields': (('fecha_inicio', 'fecha_fin'), 'activo')
        }),
        ('Información del sistema', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_descuento_badge(self, obj):
        """Badge del descuento"""
        if obj.descuento_pct:
            return format_html(
                '<span style="background: #28a745; color: white; padding: 4px 8px; '
                'border-radius: 12px; font-size: 12px; font-weight: bold;">{}%</span>',
                obj.descuento_pct
            )
        elif obj.descuento_fijo:
            return format_html(
                '<span style="background: #17a2b8; color: white; padding: 4px 8px; '
                'border-radius: 12px; font-size: 12px; font-weight: bold;">{} €</span>',
                obj.descuento_fijo
            )
        return format_html('<span style="color: #6c757d;">Sin descuento</span>')
    get_descuento_badge.short_description = 'Descuento'
    
    def get_estado_vigencia(self, obj):
        """Estado de vigencia"""
        hoy = timezone.now().date()
        
        if not obj.activo:
            return format_html('<span style="color: #6c757d;">● Inactiva</span>')
        elif obj.fecha_inicio <= hoy <= obj.fecha_fin:
            return format_html('<span style="color: #28a745;">● Vigente</span>')
        elif hoy < obj.fecha_inicio:
            return format_html('<span style="color: #007bff;">● Futura</span>')
        else:
            return format_html('<span style="color: #dc3545;">● Expirada</span>')
    get_estado_vigencia.short_description = 'Estado'
    
    def get_reservas_count(self, obj):
        """Contador de reservas que usan la promoción"""
        count = obj.reservas.count()
        if count > 0:
            url = reverse('admin:api_reserva_changelist') + f'?promocion__id__exact={obj.id}'
            return format_html(
                '<a href="{}" style="text-decoration: none;">'
                '<span style="background: #ffc107; color: #212529; padding: 2px 6px; '
                'border-radius: 3px; font-size: 11px;">{}</span></a>',
                url, count
            )
        return '0'
    get_reservas_count.short_description = 'Usos'
    
    actions = ['activate_promotions', 'deactivate_promotions', 'extend_validity']
    
    @admin_log_action('BULK_ACTIVATE_PROMOTIONS')
    def activate_promotions(self, request, queryset):
        """Activar promociones seleccionadas"""
        try:
            updated = queryset.update(activo=True)
            messages.success(request, f"{updated} promociones activadas")
        except Exception as e:
            messages.error(request, f"Error: {str(e)}")
    activate_promotions.short_description = "Activar promociones"
    
    @admin_log_action('BULK_DEACTIVATE_PROMOTIONS')
    def deactivate_promotions(self, request, queryset):
        """Desactivar promociones seleccionadas"""
        try:
            updated = queryset.update(activo=False)
            messages.success(request, f"{updated} promociones desactivadas")
        except Exception as e:
            messages.error(request, f"Error: {str(e)}")
    deactivate_promotions.short_description = "Desactivar promociones"


@admin.register(Reserva)
class ReservaAdmin(BaseAdvancedAdmin):
    """Administrador avanzado para reservas"""
    
    list_display = (
        'id', 'get_vehiculo_info', 'get_cliente_info', 
        'get_fechas_reserva', 'get_estado_badge', 'get_precio_total_formatted',
        'get_importe_pendiente', 'get_dias_hasta_recogida'
    )
    list_filter = (
        'estado', 'metodo_pago', 'fecha_recogida', 'fecha_devolucion',
        'vehiculo__categoria', 'lugar_recogida', DateRangeFilter
    )
    search_fields = (
        'id', 'vehiculo__marca', 'vehiculo__modelo', 'vehiculo__matricula',
        'conductor_principal__first_name', 'conductor_principal__last_name',
        'conductor_principal__email'
    )
    readonly_fields = ('created_at', 'updated_at')
    inlines = [ReservaExtraInline, ReservaConductorInline, PenalizacionInline]
    
    fieldsets = (
        ('Información básica', {
            'fields': (
                'vehiculo', 'conductor_principal', 'promocion'
            )
        }),
        ('Fechas y lugares', {
            'fields': (
                ('fecha_recogida', 'hora_recogida'),
                ('fecha_devolucion', 'hora_devolucion'),
                ('lugar_recogida', 'lugar_devolucion')
            )
        }),
        ('Estado y pagos', {
            'fields': (
                'estado', 'metodo_pago', 'precio_total',
                ('importe_pendiente_inicial', 'importe_pendiente_extra')
            )
        }),
        ('Políticas', {
            'fields': ('politica_pago',)
        }),
        ('Información del sistema', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_vehiculo_info(self, obj):
        """Información del vehículo"""
        if obj.vehiculo:
            return format_html(
                '<strong>{} {}</strong><br>'
                '<small style="color: #666;">{}</small>',
                obj.vehiculo.marca, obj.vehiculo.modelo, obj.vehiculo.matricula
            )
        return format_html('<span style="color: red;">Sin vehículo</span>')
    get_vehiculo_info.short_description = 'Vehículo'
    
    def get_cliente_info(self, obj):
        """Información del cliente"""
        if obj.conductor_principal:
            return format_html(
                '<strong>{} {}</strong><br>'
                '<small style="color: #666;">{}</small>',
                obj.conductor_principal.first_name or '',
                obj.conductor_principal.last_name or '',
                obj.conductor_principal.email or ''
            )
        return format_html('<span style="color: red;">Sin conductor</span>')
    get_cliente_info.short_description = 'Cliente'
    
    def get_fechas_reserva(self, obj):
        """Fechas de reserva formateadas"""
        return format_html(
            '<strong>Recogida:</strong> {}<br>'
            '<strong>Devolución:</strong> {}',
            obj.fecha_recogida.strftime('%d/%m/%Y') if obj.fecha_recogida else 'N/A',
            obj.fecha_devolucion.strftime('%d/%m/%Y') if obj.fecha_devolucion else 'N/A'
        )
    get_fechas_reserva.short_description = 'Fechas'
    
    def get_estado_badge(self, obj):
        """Badge del estado"""
        estados_colors = {
            'pendiente': 'warning',
            'confirmada': 'success', 
            'en_curso': 'info',
            'completada': 'primary',
            'cancelada': 'danger'
        }
        color = estados_colors.get(obj.estado, 'secondary')
        return format_html(
            '<span class="badge badge-{}">{}</span>',
            color, obj.get_estado_display()
        )
    get_estado_badge.short_description = 'Estado'
    
    def get_precio_total_formatted(self, obj):
        """Precio total formateado"""
        if obj.precio_total:
            return format_html(
                '<span style="color: #28a745; font-weight: bold; font-size: 14px;">{} €</span>',
                obj.precio_total
            )
        return '-'
    get_precio_total_formatted.short_description = 'Total'
    
    def get_importe_pendiente(self, obj):
        """Importe pendiente total"""
        total_pendiente = (obj.importe_pendiente_inicial or 0) + (obj.importe_pendiente_extra or 0)
        if total_pendiente > 0:
            return format_html(
                '<span style="color: #dc3545; font-weight: bold;">{} €</span>',
                total_pendiente
            )
        return format_html('<span style="color: #28a745;">Pagado</span>')
    get_importe_pendiente.short_description = 'Pendiente'
    
    def get_dias_hasta_recogida(self, obj):
        """Días hasta la recogida"""
        if obj.fecha_recogida:
            dias = (obj.fecha_recogida - timezone.now().date()).days
            if dias < 0:
                return format_html('<span style="color: #6c757d;">Pasada</span>')
            elif dias == 0:
                return format_html('<span style="color: #dc3545; font-weight: bold;">Hoy</span>')
            elif dias == 1:
                return format_html('<span style="color: #ffc107; font-weight: bold;">Mañana</span>')
            elif dias <= 7:
                return format_html('<span style="color: #fd7e14;">{} días</span>', dias)
            else:
                return format_html('<span style="color: #6c757d;">{} días</span>', dias)
        return '-'
    get_dias_hasta_recogida.short_description = 'Recogida en'
    
    @admin_log_action('GET_QUERYSET')
    def get_queryset(self, request):
        """Optimizar consultas"""
        return super().get_queryset(request).select_related(
            'vehiculo', 'conductor_principal', 'lugar_recogida', 
            'lugar_devolucion', 'promocion', 'politica_pago'
        )
    
    actions = ['confirm_reservations', 'cancel_reservations', 'mark_completed']
    
    @admin_log_action('BULK_CONFIRM_RESERVATIONS')
    def confirm_reservations(self, request, queryset):
        """Confirmar reservas seleccionadas"""
        try:
            updated = queryset.filter(estado='pendiente').update(estado='confirmada')
            messages.success(request, f"{updated} reservas confirmadas")
        except Exception as e:
            messages.error(request, f"Error: {str(e)}")
    confirm_reservations.short_description = "Confirmar reservas"
    
    @admin_log_action('BULK_CANCEL_RESERVATIONS')
    def cancel_reservations(self, request, queryset):
        """Cancelar reservas seleccionadas"""
        try:
            updated = queryset.exclude(estado__in=['completada', 'cancelada']).update(estado='cancelada')
            messages.success(request, f"{updated} reservas canceladas")
        except Exception as e:
            messages.error(request, f"Error: {str(e)}")
    cancel_reservations.short_description = "Cancelar reservas"


@admin.register(ReservaConductor)
class ReservaConductorAdmin(BaseAdvancedAdmin):
    """Administrador para conductores de reserva"""
    
    list_display = (
        'get_reserva_id', 'get_nombre_completo', 'get_email', 
        'get_telefono', 'get_rol_badge'
    )
    search_fields = ('conductor__first_name', 'conductor__last_name', 'conductor__email', 'conductor__telefono')
    list_filter = ('rol', 'reserva__estado')
    
    def get_reserva_id(self, obj):
        """ID de la reserva"""
        url = reverse('admin:api_reserva_change', args=[obj.reserva.id])
        return format_html('<a href="{}">#{}</a>', url, obj.reserva.id)
    get_reserva_id.short_description = 'Reserva'
    
    def get_nombre_completo(self, obj):
        """Nombre completo"""
        return f"{obj.conductor.first_name or ''} {obj.conductor.last_name or ''}".strip()
    get_nombre_completo.short_description = 'Nombre'
    
    def get_email(self, obj):
        """Email del conductor"""
        return obj.conductor.email or '-'
    get_email.short_description = 'Email'
    
    def get_telefono(self, obj):
        """Teléfono del conductor"""
        return obj.conductor.telefono or '-'
    get_telefono.short_description = 'Teléfono'
    
    def get_rol_badge(self, obj):
        """Badge del rol"""
        color = 'primary' if obj.rol == 'principal' else 'secondary'
        return format_html(
            '<span class="badge badge-{}">{}</span>',
            color, obj.get_rol_display()
        )
    get_rol_badge.short_description = 'Rol'


@admin.register(Penalizacion)
class PenalizacionAdmin(BaseAdvancedAdmin):
    """Administrador para penalizaciones"""
    
    list_display = (
        'get_reserva_info', 'get_tipo', 'get_importe_formatted',
        'fecha', 'get_descripcion_short'
    )
    search_fields = ('reserva__id', 'tipo_penalizacion__nombre', 'descripcion')
    list_filter = ('tipo_penalizacion', 'fecha', DateRangeFilter)
    readonly_fields = ('fecha',)
    
    def get_reserva_info(self, obj):
        """Información de la reserva"""
        url = reverse('admin:api_reserva_change', args=[obj.reserva.id])
        return format_html(
            '<a href="{}">Reserva #{}</a><br>'
            '<small style="color: #666;">{}</small>',
            url, obj.reserva.id,
            obj.reserva.vehiculo.matricula if obj.reserva.vehiculo else 'Sin vehículo'
        )
    get_reserva_info.short_description = 'Reserva'
    
    def get_tipo(self, obj):
        """Tipo de penalización"""
        return obj.tipo_penalizacion.nombre
    get_tipo.short_description = 'Tipo'
    
    def get_importe_formatted(self, obj):
        """Importe formateado"""
        return format_html(
            '<span style="color: #dc3545; font-weight: bold; font-size: 14px;">{} €</span>',
            obj.importe
        )
    get_importe_formatted.short_description = 'Importe'
    
    def get_descripcion_short(self, obj):
        """Descripción truncada"""
        if obj.descripcion:
            return obj.descripcion[:50] + '...' if len(obj.descripcion) > 50 else obj.descripcion
        return '-'
    get_descripcion_short.short_description = 'Descripción'


@admin.register(Extras)
class ExtrasAdmin(BaseAdvancedAdmin):
    """Administrador para extras"""
    
    list_display = (
        'nombre', 'get_precio_formatted', 'get_descripcion_short',
        'get_reservas_count'
    )
    search_fields = ('nombre', 'descripcion')
    ordering = ('nombre',)
    
    def get_precio_formatted(self, obj):
        """Precio formateado"""
        return format_html(
            '<span style="color: #007bff; font-weight: bold;">{} €</span>',
            obj.precio
        )
    get_precio_formatted.short_description = 'Precio'
    
    def get_descripcion_short(self, obj):
        """Descripción truncada"""
        if obj.descripcion:
            return obj.descripcion[:60] + '...' if len(obj.descripcion) > 60 else obj.descripcion
        return '-'
    get_descripcion_short.short_description = 'Descripción'
    
    def get_reservas_count(self, obj):
        """Contador de reservas que usan este extra"""
        count = obj.reservaextra_set.count()
        if count > 0:
            return format_html(
                '<span style="background: #17a2b8; color: white; padding: 2px 6px; '
                'border-radius: 3px; font-size: 11px;">{}</span>',
                count
            )
        return '0'
    get_reservas_count.short_description = 'Usos'


@admin.register(ReservaExtra)
class ReservaExtraAdmin(BaseAdvancedAdmin):
    """Administrador para extras de reserva"""
    
    list_display = (
        'get_reserva_info', 'get_extra_nombre', 'cantidad',
        'get_total_formatted'
    )
    search_fields = ('reserva__id', 'extra__nombre')
    list_filter = ('extra', 'reserva__estado')
    
    def get_reserva_info(self, obj):
        """Información de la reserva"""
        url = reverse('admin:api_reserva_change', args=[obj.reserva.id])
        return format_html('<a href="{}">Reserva #{}</a>', url, obj.reserva.id)
    get_reserva_info.short_description = 'Reserva'
    
    def get_extra_nombre(self, obj):
        """Nombre del extra"""
        return obj.extra.nombre
    get_extra_nombre.short_description = 'Extra'
    
    def get_total_formatted(self, obj):
        """Total formateado"""
        total = obj.extra.precio * obj.cantidad
        return format_html(
            '<span style="color: #28a745; font-weight: bold;">{} €</span>',
            total
        )
    get_total_formatted.short_description = 'Total'


@admin.register(Contenido)
class ContenidoAdmin(BaseAdvancedAdmin):
    """Administrador avanzado para contenidos"""
    
    list_display = (
        'titulo', 'tipo', 'get_estado_badge', 'get_contenido_preview',
        'created_at'
    )
    search_fields = ('titulo', 'tipo', 'contenido')
    list_filter = ('tipo', 'activo', DateRangeFilter)
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Información básica', {
            'fields': ('titulo', 'tipo', 'activo')
        }),
        ('Contenido', {
            'fields': ('contenido',)
        }),
        ('Información del sistema', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_estado_badge(self, obj):
        """Badge del estado"""
        if obj.activo:
            return format_html('<span style="color: #28a745;">● Activo</span>')
        else:
            return format_html('<span style="color: #dc3545;">● Inactivo</span>')
    get_estado_badge.short_description = 'Estado'
    
    def get_contenido_preview(self, obj):
        """Preview del contenido"""
        if obj.contenido:
            preview = obj.contenido[:100] + '...' if len(obj.contenido) > 100 else obj.contenido
            return format_html('<small style="color: #666;">{}</small>', preview)
        return '-'
    get_contenido_preview.short_description = 'Preview'
    
    actions = ['activate_contents', 'deactivate_contents']
    
    @admin_log_action('BULK_ACTIVATE_CONTENTS')
    def activate_contents(self, request, queryset):
        """Activar contenidos seleccionados"""
        try:
            updated = queryset.update(activo=True)
            messages.success(request, f"{updated} contenidos activados")
        except Exception as e:
            messages.error(request, f"Error: {str(e)}")
    activate_contents.short_description = "Activar contenidos"
    
    @admin_log_action('BULK_DEACTIVATE_CONTENTS')
    def deactivate_contents(self, request, queryset):
        """Desactivar contenidos seleccionados"""
        try:
            updated = queryset.update(activo=False)
            messages.success(request, f"{updated} contenidos desactivados")
        except Exception as e:
            messages.error(request, f"Error: {str(e)}")
    deactivate_contents.short_description = "Desactivar contenidos"


@admin.register(Contrato)
class ContratoAdmin(BaseAdvancedAdmin):
    """Administrador para contratos"""
    
    list_display = (
        'get_reserva_info', 'get_cliente_info', 'fecha_firma',
        'get_estado_badge', 'get_archivo_link'
    )
    search_fields = (
        'reserva__id', 'reserva__conductor_principal__first_name',
        'reserva__conductor_principal__last_name'
    )
    list_filter = ('fecha_firma', 'estado', DateRangeFilter)
    readonly_fields = ('fecha_firma',)
    
    fieldsets = (        ('Información básica', {
            'fields': ('reserva', 'estado', 'fecha_firma')
        }),
        ('Archivo', {
            'fields': ('archivo_contrato',)
        }),
        ('Contenido del contrato', {
            'fields': ('contenido_contrato',),
            'classes': ('collapse',)
        }),
    )
    
    def get_reserva_info(self, obj):
        """Información de la reserva"""
        url = reverse('admin:api_reserva_change', args=[obj.reserva.id])
        return format_html(
            '<a href="{}">Reserva #{}</a><br>'
            '<small style="color: #666;">{}</small>',
            url, obj.reserva.id,
            obj.reserva.vehiculo.matricula if obj.reserva.vehiculo else 'Sin vehículo'
        )
    get_reserva_info.short_description = 'Reserva'
    
    def get_cliente_info(self, obj):
        """Información del cliente"""
        cliente = obj.reserva.conductor_principal
        if cliente:
            return format_html(
                '{} {}<br><small style="color: #666;">{}</small>',
                cliente.first_name or '', cliente.last_name or '', cliente.email or ''
            )
        return '-'
    get_cliente_info.short_description = 'Cliente'
    
    def get_estado_badge(self, obj):
        """Badge del estado"""
        if obj.firmado:
            return format_html('<span style="color: #28a745;">● Firmado</span>')
        else:
            return format_html('<span style="color: #ffc107;">● Pendiente</span>')
    get_estado_badge.short_description = 'Estado'
    
    def get_archivo_link(self, obj):
        """Link al archivo si existe"""
        if obj.archivo_contrato:
            return format_html(
                '<a href="{}" target="_blank" style="color: #007bff;">📄 Ver archivo</a>',
                obj.archivo_contrato.url
            )
        return format_html('<span style="color: #6c757d;">Sin archivo</span>')
    get_archivo_link.short_description = 'Archivo'
    
    @admin_log_action('GET_QUERYSET')
    def get_queryset(self, request):
        """Optimizar consultas"""
        return super().get_queryset(request).select_related(
            'reserva', 'reserva__conductor_principal', 'reserva__vehiculo'
        )


@admin.register(Factura)
class FacturaAdmin(BaseAdvancedAdmin):
    """Administrador avanzado para facturas"""
    
    list_display = (
        'numero_factura', 'get_reserva_info', 'get_cliente_info',
        'fecha_emision', 'get_importe_formatted', 'get_estado_pago'
    )
    search_fields = (
        'numero_factura', 'reserva__id',
        'reserva__conductor_principal__first_name',
        'reserva__conductor_principal__last_name'
    )
    list_filter = ('fecha_emision', 'estado', DateRangeFilter)
    readonly_fields = ('fecha_emision',)
    
    fieldsets = (
        ('Información básica', {
            'fields': ('numero_factura', 'reserva', 'fecha_emision')
        }),        ('Importes', {
            'fields': ('importe_total', 'importe_impuestos', 'estado')
        }),
        ('Archivos', {
            'fields': ('archivo_factura',)
        }),
        ('Detalles', {
            'fields': ('detalles_factura',),
            'classes': ('collapse',)
        }),
    )
    
    def get_reserva_info(self, obj):
        """Información de la reserva"""
        url = reverse('admin:api_reserva_change', args=[obj.reserva.id])
        return format_html('<a href="{}">Reserva #{}</a>', url, obj.reserva.id)
    get_reserva_info.short_description = 'Reserva'
    
    def get_cliente_info(self, obj):
        """Información del cliente"""
        cliente = obj.reserva.conductor_principal
        if cliente:
            return format_html(
                '{} {}<br><small style="color: #666;">{}</small>',
                cliente.first_name or '', cliente.last_name or '', cliente.email or ''
            )
        return '-'
    get_cliente_info.short_description = 'Cliente'
    
    def get_importe_formatted(self, obj):
        """Importe formateado"""
        return format_html(
            '<span style="color: #28a745; font-weight: bold; font-size: 14px;">{} €</span>',
            obj.importe_total
        )
    get_importe_formatted.short_description = 'Importe'
    
    def get_estado_pago(self, obj):
        """Estado del pago"""
        if obj.pagada:
            return format_html('<span style="color: #28a745;">● Pagada</span>')
        else:
            return format_html('<span style="color: #dc3545;">● Pendiente</span>')
    get_estado_pago.short_description = 'Estado'
    
    @admin_log_action('GET_QUERYSET')
    def get_queryset(self, request):
        """Optimizar consultas"""
        return super().get_queryset(request).select_related(
            'reserva', 'reserva__conductor_principal'
        )
    
    actions = ['mark_as_paid', 'mark_as_unpaid']
    
    @admin_log_action('BULK_MARK_PAID')
    def mark_as_paid(self, request, queryset):
        """Marcar facturas como pagadas"""
        try:
            updated = queryset.update(pagada=True)
            messages.success(request, f"{updated} facturas marcadas como pagadas")
        except Exception as e:
            messages.error(request, f"Error: {str(e)}")
    mark_as_paid.short_description = "Marcar como pagadas"
    
    @admin_log_action('BULK_MARK_UNPAID')
    def mark_as_unpaid(self, request, queryset):
        """Marcar facturas como no pagadas"""
        try:
            updated = queryset.update(pagada=False)
            messages.success(request, f"{updated} facturas marcadas como no pagadas")
        except Exception as e:
            messages.error(request, f"Error: {str(e)}")
    mark_as_unpaid.short_description = "Marcar como no pagadas"


@admin.register(Contacto)
class ContactoAdmin(BaseAdvancedAdmin):
    """Administrador para mensajes de contacto"""
    
    list_display = (
        'nombre', 'email', 'get_asunto_short', 'fecha_creacion',
        'get_estado_badge', 'get_mensaje_preview'
    )
    search_fields = ('nombre', 'email', 'asunto', 'mensaje')
    list_filter = ('estado', 'fecha_creacion', DateRangeFilter)
    readonly_fields = ('fecha_creacion',)
    
    fieldsets = (
        ('Información del contacto', {
            'fields': ('nombre', 'email', 'asunto')
        }),
        ('Mensaje', {
            'fields': ('mensaje',)
        }),
        ('Estado', {
            'fields': ('estado', 'fecha_creacion')
        }),
        ('Respuesta', {
            'fields': ('respuesta',),
            'classes': ('collapse',)
        }),
    )
    
    def get_asunto_short(self, obj):
        """Asunto truncado"""
        if obj.asunto:
            return obj.asunto[:50] + '...' if len(obj.asunto) > 50 else obj.asunto
        return '-'
    get_asunto_short.short_description = 'Asunto'
    
    def get_estado_badge(self, obj):
        """Badge de estado"""
        estado_colors = {
            'pendiente': '#ffc107',
            'en_proceso': '#17a2b8', 
            'resuelto': '#28a745',
            'cerrado': '#6c757d'
        }
        color = estado_colors.get(obj.estado, '#6c757d')
        return format_html('<span style="color: {};">● {}</span>', color, obj.get_estado_display())
    get_estado_badge.short_description = 'Estado'
    
    def get_mensaje_preview(self, obj):
        """Preview del mensaje"""
        if obj.mensaje:
            preview = obj.mensaje[:80] + '...' if len(obj.mensaje) > 80 else obj.mensaje
            return format_html('<small style="color: #666;">{}</small>', preview)
        return '-'
    get_mensaje_preview.short_description = 'Mensaje'
    
    actions = ['mark_as_resolved', 'mark_as_pending']
    
    @admin_log_action('BULK_MARK_RESOLVED')
    def mark_as_resolved(self, request, queryset):
        """Marcar como resueltos"""
        try:
            updated = queryset.update(estado='resuelto')
            messages.success(request, f"{updated} mensajes marcados como resueltos")
        except Exception as e:
            messages.error(request, f"Error: {str(e)}")
    mark_as_resolved.short_description = "Marcar como resueltos"
    
    @admin_log_action('BULK_MARK_PENDING')
    def mark_as_pending(self, request, queryset):
        """Marcar como pendientes"""
        try:
            updated = queryset.update(estado='pendiente')
            messages.success(request, f"{updated} mensajes marcados como pendientes")
        except Exception as e:
            messages.error(request, f"Error: {str(e)}")
    mark_as_pending.short_description = "Marcar como pendientes"


# ===============================
# CONFIGURACIÓN ADICIONAL DEL ADMIN
# ===============================

# Personalizar el título del admin
admin.site.site_header = "Mobility-for-you - Panel de Administración"
admin.site.site_title = "Mobility Admin"
admin.site.index_title = "Bienvenido al Panel de Administración"

# Configuración de logging específica para admin
logger.info("Panel de administración de Mobility-for-you cargado exitosamente")