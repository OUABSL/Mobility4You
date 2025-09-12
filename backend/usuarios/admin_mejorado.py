# usuarios/admin.py
import logging
import re
from typing import Any, List, Optional, Union

from django import forms
from django.contrib import admin, messages
from django.contrib.admin import SimpleListFilter
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import BaseUserManager
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import Count, Q, QuerySet
from django.http import HttpRequest
from django.utils import timezone
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from .models import Usuario

# Configuración del logger para el panel de administración
logger = logging.getLogger("admin_operations")


class ClienteAdminForm(forms.ModelForm):
    """
    Formulario simplificado para crear usuarios cliente desde el admin
    Facilita la tarea del administrador al hacer opcionales campos innecesarios
    """
    
    # Campo de teléfono más flexible
    telefono = forms.CharField(
        label=_("Teléfono"),
        max_length=20,
        required=False,
        help_text=_("Formato flexible: +34 123 456 789, 123456789, etc."),
        widget=forms.TextInput(attrs={
            'placeholder': '+34 123 456 789',
            'class': 'vTextField'
        })
    )
    
    # Campo de número de documento opcional
    numero_documento = forms.CharField(
        label=_("Número de documento"),
        max_length=20,
        required=False,
        help_text=_("Opcional para usuarios creados por admin. Formato: 12345678A, AB123456, etc."),
        widget=forms.TextInput(attrs={
            'placeholder': '12345678A',
            'class': 'vTextField'
        })
    )

    class Meta:
        model = Usuario
        fields = [
            'email', 'first_name', 'last_name', 'fecha_nacimiento', 
            'sexo', 'nacionalidad', 'tipo_documento', 'numero_documento',
            'telefono', 'rol', 'is_active', 'registrado', 'verificado',
            'acepta_recibir_ofertas'
        ]
        widgets = {
            'fecha_nacimiento': forms.DateInput(attrs={
                'type': 'date',
                'class': 'vDateField'
            }),
            'email': forms.EmailInput(attrs={
                'placeholder': 'cliente@ejemplo.com',
                'class': 'vTextField'
            }),
            'first_name': forms.TextInput(attrs={
                'placeholder': 'Nombre',
                'class': 'vTextField'
            }),
            'last_name': forms.TextInput(attrs={
                'placeholder': 'Apellidos',
                'class': 'vTextField'
            }),
            'nacionalidad': forms.TextInput(attrs={
                'placeholder': 'España',
                'class': 'vTextField'
            }),
        }

    def clean_telefono(self):
        """Validación flexible para el teléfono"""
        telefono = self.cleaned_data.get('telefono', '').strip()
        
        if not telefono:
            return telefono  # Campo opcional
        
        # Limpiar el teléfono de espacios, guiones y paréntesis
        telefono_limpio = re.sub(r'[\s\-\(\)]', '', telefono)
        
        # Validación flexible: debe contener solo números y opcionalmente un +
        if not re.match(r'^\+?\d{9,15}$', telefono_limpio):
            raise forms.ValidationError(
                _("Formato de teléfono inválido. Use números (9-15 dígitos), "
                  "opcionalmente con + al inicio.")
            )
        
        return telefono_limpio

    def clean_numero_documento(self):
        """Validación flexible para el número de documento"""
        numero = self.cleaned_data.get('numero_documento', '').strip().upper()
        
        if not numero:
            return numero  # Campo opcional para admin
        
        # Validación flexible: alfanumérico, 6-20 caracteres
        if not re.match(r'^[A-Z0-9]{6,20}$', numero):
            raise forms.ValidationError(
                _("Formato de documento inválido. Use 6-20 caracteres alfanuméricos.")
            )
        
        # Verificar unicidad si se proporciona
        if self.instance.pk:
            # Editando usuario existente
            if Usuario.objects.filter(numero_documento=numero).exclude(pk=self.instance.pk).exists():
                raise forms.ValidationError(_("Este número de documento ya está en uso."))
        else:
            # Creando nuevo usuario
            if Usuario.objects.filter(numero_documento=numero).exists():
                raise forms.ValidationError(_("Este número de documento ya está en uso."))
        
        return numero

    def clean(self):
        """Validación del formulario completo"""
        cleaned_data = super().clean()
        
        # Si se especifica tipo_documento, se recomienda numero_documento
        tipo_documento = cleaned_data.get('tipo_documento')
        numero_documento = cleaned_data.get('numero_documento')
        
        if tipo_documento and not numero_documento:
            self.add_error('numero_documento', 
                          _("Se recomienda especificar el número si se selecciona un tipo de documento."))
        
        return cleaned_data


class AdminUsuarioCreationForm(UserCreationForm):
    """Formulario para crear usuarios admin/empresa con contraseña"""
    
    class Meta:
        model = Usuario
        fields = ('username', 'email', 'first_name', 'last_name', 'rol')


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
                    extra={
                        "user_id": user.id,
                        "model": model_name,
                        "action": action_type,
                    },
                )

                # Ejecutar la función original
                result = func(self, request, *args, **kwargs)

                # Log de éxito
                execution_time = (timezone.now() - start_time).total_seconds()
                logger.info(
                    f"ÉXITO {action_type}: Completado en {execution_time:.2f}s "
                    f"por {user.username} en {model_name}",
                    extra={
                        "user_id": user.id,
                        "model": model_name,
                        "action": action_type,
                        "execution_time": execution_time,
                        "status": "success",
                    },
                )

                return result

            except PermissionDenied as e:
                logger.warning(
                    f"PERMISO DENEGADO {action_type}: Usuario {user.username} "
                    f"sin permisos para {action_type} en {model_name}: {str(e)}",
                    extra={
                        "user_id": user.id,
                        "model": model_name,
                        "action": action_type,
                        "error": str(e),
                    },
                )
                messages.error(
                    request, f"No tienes permisos para realizar esta acción: {str(e)}"
                )
                raise

            except ValidationError as e:
                logger.error(
                    f"ERROR VALIDACIÓN {action_type}: {str(e)} por {user.username} en {model_name}",
                    extra={
                        "user_id": user.id,
                        "model": model_name,
                        "action": action_type,
                        "error": str(e),
                    },
                )
                messages.error(request, f"Error de validación: {str(e)}")
                raise

            except (DatabaseError, IntegrityError) as e:
                logger.error(
                    f"ERROR BASE DATOS {action_type}: {str(e)} por {user.username} en {model_name}",
                    extra={
                        "user_id": user.id,
                        "model": model_name,
                        "action": action_type,
                        "error": str(e),
                    },
                )
                messages.error(request, f"Error de base de datos: {str(e)}")
                raise

            except Exception as e:
                execution_time = (timezone.now() - start_time).total_seconds()
                logger.error(
                    f"ERROR INESPERADO {action_type}: {str(e)} tras {execution_time:.2f}s "
                    f"por {user.username} en {model_name}",
                    extra={
                        "user_id": user.id,
                        "model": model_name,
                        "action": action_type,
                        "execution_time": execution_time,
                        "error": str(e),
                        "status": "error",
                    },
                )
                messages.error(request, f"Error inesperado: {str(e)}")
                raise

        return wrapper

    return decorator


class BaseAdvancedAdmin(admin.ModelAdmin):
    """Clase base con funcionalidades avanzadas comunes para todos los admins"""

    actions_on_top = True
    actions_on_bottom = True
    save_on_top = True

    def get_actions(self, request):
        """Personalizar acciones disponibles según permisos"""
        actions = super().get_actions(request)
        if not request.user.is_superuser:
            # Remover acción de eliminación masiva para usuarios no super
            if "delete_selected" in actions:
                del actions["delete_selected"]
        return actions


class DateRangeFilter(SimpleListFilter):
    """Filtro por rango de fechas"""

    title = _("Fecha de registro")
    parameter_name = "date_range"

    def lookups(self, request, model_admin):
        return (
            ("today", _("Hoy")),
            ("week", _("Esta semana")),
            ("month", _("Este mes")),
            ("year", _("Este año")),
        )

    def queryset(self, request, queryset):
        if self.value() == "today":
            return queryset.filter(date_joined__date=timezone.now().date())
        elif self.value() == "week":
            start_week = timezone.now().date() - timezone.timedelta(days=7)
            return queryset.filter(date_joined__date__gte=start_week)
        elif self.value() == "month":
            start_month = timezone.now().date().replace(day=1)
            return queryset.filter(date_joined__date__gte=start_month)
        elif self.value() == "year":
            start_year = timezone.now().date().replace(month=1, day=1)
            return queryset.filter(date_joined__date__gte=start_year)


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin, BaseAdvancedAdmin):
    """Administrador avanzado para el modelo Usuario"""
    
    # Usar formularios específicos según el contexto
    form = ClienteAdminForm  # Para editar usuarios existentes
    add_form = AdminUsuarioCreationForm  # Para crear usuarios con contraseña
    
    # Media para archivos CSS y JS personalizados
    class Media:
        css = {
            "all": ('admin/css/custom_admin.css',)
        }
        js = ("admin/js/usuarios_admin.js",)

    # Campos de lista
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "get_rol",
        "fecha_nacimiento",
        "is_active",
        "date_joined",
        "last_login",
    )
    list_filter = (
        "is_active",
        "is_staff",
        "is_superuser",
        "rol",
        "sexo",
        "nacionalidad",
        "tipo_documento",
        DateRangeFilter,
    )
    search_fields = (
        "username",
        "email",
        "first_name",
        "last_name",
        "numero_documento",
        "telefono",
    )
    ordering = ("-date_joined",)
    readonly_fields = ("date_joined", "last_login", "password")
    
    # Fieldsets simplificados para edición
    fieldsets = (
        (
            "Información básica",
            {
                "fields": ("username", "email"),
                "description": "Email obligatorio. Username se genera automáticamente para clientes.",
            },
        ),
        (
            "Información personal",
            {
                "fields": (
                    ("first_name", "last_name"),
                    "fecha_nacimiento",
                    "sexo",
                    "nacionalidad",
                    ("tipo_documento", "numero_documento"),
                    "telefono",
                ),
                "description": "Campos opcionales para usuarios creados por admin. Facilita la creación rápida de clientes.",
            },
        ),
        (
            "Configuración de cuenta",
            {
                "fields": (
                    "rol",
                    "is_active",
                    "registrado", 
                    "verificado",
                    "acepta_recibir_ofertas",
                )
            },
        ),
        (
            "Permisos administrativos",
            {
                "fields": ("is_staff", "is_superuser"),
                "classes": ("collapse",),
                "description": "Para crear admin: marcar is_superuser. Para empresa: marcar is_staff.",
            },
        ),
        (
            "Fechas importantes",
            {"fields": ("last_login", "date_joined"), "classes": ("collapse",)},
        ),
        (
            "Permisos avanzados",
            {"fields": ("groups", "user_permissions"), "classes": ("collapse",)},
        ),
    )

    # Fieldsets para creación
    # Fieldsets simplificados para creación
    add_fieldsets = (
        (
            "Tipo de usuario",
            {
                "classes": ("wide",),
                "fields": ("rol",),
                "description": "Seleccione primero el tipo de usuario. CLIENTE: Formulario simplificado. ADMIN/EMPRESA: Requiere contraseña.",
            },
        ),
        (
            "Información básica",
            {
                "classes": ("wide",),
                "fields": ("email", "first_name", "last_name"),
                "description": "Email obligatorio para todos. Nombres opcionales pero recomendados.",
            },
        ),
        (
            "Contraseña (solo admin/empresa)",
            {
                "classes": ("wide",),
                "fields": ("username", "password1", "password2"),
                "description": "Solo necesario para admin y empresa. Clientes NO requieren username ni contraseña.",
            },
        ),
        (
            "Información personal (opcional)",
            {
                "classes": ("wide", "collapse"),
                "fields": (
                    "fecha_nacimiento",
                    "sexo",
                    "nacionalidad",
                    ("tipo_documento", "numero_documento"),
                    "telefono",
                ),
                "description": "Todos los campos son opcionales para facilitar la creación rápida de clientes.",
            },
        ),
        (
            "Configuración inicial",
            {
                "classes": ("wide",),
                "fields": ("is_active", "registrado", "verificado", "acepta_recibir_ofertas")
            },
        ),
    )

    def get_auth_status(self, obj):
        """Estado de autenticación del usuario"""
        if obj.has_usable_password():
            if obj.is_staff or obj.is_superuser:
                return format_html('<span style="color: #007cba;">🔑 Admin</span>')
            else:
                return format_html(
                    '<span style="color: #28a745;">🔐 Autenticado</span>'
                )
        else:
            return format_html('<span style="color: #6c757d;">👤 Cliente</span>')

    def get_rol(self, obj):
        """Mostrar rol con indicador de acceso"""
        color_map = {"admin": "#dc3545", "empresa": "#007bff", "cliente": "#28a745"}
        color = color_map.get(obj.rol, "#6c757d")

        # Indicador de acceso
        if obj.rol in ["admin", "empresa"]:
            access_icon = "🔑" if obj.has_usable_password() else "⚠️"
            access_text = (
                "Con acceso" if obj.has_usable_password() else "Sin contraseña"
            )
        else:
            access_icon = "👤"
            access_text = "Acceso por email+reserva"

        return format_html(
            '<span style="color: {}; font-weight: bold;">{} {}</span><br>'
            '<small style="color: #666;">{} {}</small>',
            color,
            access_icon,
            obj.get_rol_display(),
            access_icon,
            access_text,
        )


    @admin_log_action("GET_QUERYSET")
    def get_queryset(self, request):
        """Optimizar consultas con select_related"""
        return super().get_queryset(request).select_related("direccion")

    def save_model(self, request, obj, form, change):
        """Manejar usuarios según tipo con validaciones simplificadas para admin"""
        try:
            if not change:  # Nuevo usuario
                
                # Generar username para clientes si no tienen
                if obj.rol == "cliente" and not obj.username:
                    # Generar username único basado en email
                    base_username = obj.email.split("@")[0]
                    username = base_username
                    counter = 1
                    while Usuario.objects.filter(username=username).exists():
                        username = f"{base_username}{counter}"
                        counter += 1
                    obj.username = username
                
                if obj.rol in ["admin", "empresa"]:
                    # Usuarios admin/empresa necesitan contraseña
                    if not obj.password:
                        # Generar contraseña temporal si no se proporciona
                        temp_password = BaseUserManager().make_random_password()
                        obj.set_password(temp_password)
                        messages.warning(
                            request,
                            f"Usuario {obj.rol.upper()} creado. Contraseña temporal para {obj.username}: {temp_password} "
                            f"(Se recomienda cambiarla en el primer acceso)",
                        )
                        logger.info(
                            f"Contraseña temporal generada para usuario {obj.rol}: {obj.username}"
                        )
                    else:
                        # Encriptar contraseña proporcionada
                        obj.set_password(obj.password)
                        messages.success(
                            request,
                            f"Usuario {obj.rol.upper()} creado exitosamente: {obj.username}",
                        )

                    # Configurar permisos según rol
                    if obj.rol == "admin":
                        obj.is_staff = True
                        obj.is_superuser = True
                    else:  # empresa
                        obj.is_staff = True
                        obj.is_superuser = False

                else:  # rol == 'cliente'
                    # Clientes no necesitan contraseña
                    obj.set_unusable_password()
                    obj.is_staff = False
                    obj.is_superuser = False
                    
                    # Marcar como registrado y activo por defecto para clientes creados por admin
                    obj.registrado = True
                    if obj.is_active is None:
                        obj.is_active = True
                    
                    messages.success(
                        request,
                        f"Usuario CLIENTE creado exitosamente: {obj.username} ({obj.email}). "
                        f"Podrá acceder a sus reservas con email + número de reserva.",
                    )
                    logger.info(
                        f"Usuario cliente creado sin contraseña: {obj.username} - Email: {obj.email}"
                    )

            super().save_model(request, obj, form, change)

        except Exception as e:
            logger.error(f"Error creando usuario: {str(e)}")
            messages.error(request, f"Error creando usuario: {str(e)}")
            raise

    def get_form(self, request, obj=None, **kwargs):
        """Usar formulario específico según si es creación o edición"""
        if obj is None:  # Creando nuevo usuario
            # Determinar el tipo de usuario desde los datos POST
            rol = request.POST.get('rol', 'cliente') if request.method == 'POST' else 'cliente'
            
            # Para usuarios cliente, usar formulario simplificado
            if rol == 'cliente':
                kwargs['form'] = ClienteAdminForm
            else:
                kwargs['form'] = AdminUsuarioCreationForm
        else:
            # Para edición, usar formulario cliente simplificado
            kwargs['form'] = ClienteAdminForm
        
        return super().get_form(request, obj, **kwargs)

    def response_add(self, request, obj, post_url_continue=None):
        """Personalizar respuesta después de agregar usuario"""
        response = super().response_add(request, obj, post_url_continue)
        
        # Agregar mensaje informativo adicional para clientes
        if obj.rol == 'cliente':
            messages.info(
                request,
                f"💡 Consejo: El cliente {obj.first_name} {obj.last_name} puede acceder a sus reservas "
                f"usando su email ({obj.email}) + número de reserva. No necesita contraseña."
            )
        
        return response

    def get_readonly_fields(self, request, obj=None):
        """Campos de solo lectura dinámicos"""
        readonly = list(self.readonly_fields)

        if obj:  # Editando objeto existente
            readonly.extend(["username"])  # Username no se puede cambiar después de crear

        return readonly

    def has_delete_permission(self, request, obj=None):
        """Controlar permisos de eliminación"""
        if obj and obj.is_superuser and not request.user.is_superuser:
            return False
        return super().has_delete_permission(request, obj)

