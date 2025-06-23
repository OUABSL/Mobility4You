# usuarios/admin.py
import logging
from typing import Any, List, Optional, Union

from django.contrib import admin, messages
from django.contrib.admin import SimpleListFilter
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import BaseUserManager
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import Count, Q, QuerySet
from django.http import HttpRequest
from django.utils import timezone
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from utils.static_mapping import get_versioned_asset

from .models import Usuario

# Configuración del logger para el panel de administración
logger = logging.getLogger("admin_operations")


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
    """Administrador avanzado para el modelo Usuario"""    # Media para archivos CSS y JS personalizados
    class Media:
        css = {
            "all": (get_versioned_asset("css", "admin/css/custom_admin_v78b65000.css"),)
        }
        js = (get_versioned_asset("js_usuarios", "admin/js/usuarios_admin_vc5b6f7e1.js"),)

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
    # Fieldsets personalizados
    fieldsets = (
        (
            "Información de cuenta",
            {
                "fields": ("username", "email"),
                "description": "Para usuarios admin: username y email obligatorios. Para clientes: solo email.",
            },
        ),
        (
            "Contraseña",
            {
                "fields": ("password",),
                "classes": ("collapse",),
                "description": "Solo para usuarios admin y empresa. Clientes acceden sin contraseña.",
            },
        ),
        (
            "Información personal (solo clientes/empresa)",
            {
                "fields": (
                    ("first_name", "last_name"),
                    "fecha_nacimiento",
                    "sexo",
                    "nacionalidad",
                    ("tipo_documento", "numero_documento"),
                    "imagen_carnet",
                    "telefono",
                    "direccion",
                ),
                "classes": ("collapse",),
                "description": "Solo necesario para usuarios cliente/empresa, no para admin.",
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
    add_fieldsets = (
        (
            "Tipo de usuario",
            {
                "classes": ("wide",),
                "fields": (),
                "description": "ADMIN: Solo username, email y contraseña. CLIENTE/EMPRESA: Datos personales sin username.",
            },
        ),
        (
            "Información básica",
            {
                "classes": ("wide",),
                "fields": ("email", "username"),
                "description": "Email obligatorio para todos. Username solo para admin.",
            },
        ),
        (
            "Contraseña (admin/empresa)",
            {
                "classes": ("wide",),
                "fields": ("password1", "password2"),
                "description": "Solo necesario para admin y empresa. Clientes no requieren contraseña.",
            },
        ),
        (
            "Permisos básicos",
            {
                "classes": ("wide",),
                "fields": ("is_superuser", "is_staff", "rol"),
                "description": "Admin: marcar is_superuser. Empresa: marcar is_staff + rol=empresa. Cliente: solo rol=cliente.",
            },
        ),
        (
            "Información personal (opcional para admin)",
            {
                "classes": ("wide", "collapse"),
                "fields": (
                    "first_name",
                    "last_name",
                    "fecha_nacimiento",
                    "sexo",
                    "nacionalidad",
                    "tipo_documento",
                    "numero_documento",
                    "telefono",
                ),
                "description": "Opcional para admin. Obligatorio para cliente/empresa según sea necesario.",
            },
        ),
        (
            "Configuración inicial",
            {"classes": ("wide",), "fields": ("is_active", "registrado", "verificado")},
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
        """Manejar contraseñas según tipo de usuario"""
        try:
            if not change:  # Nuevo usuario
                if obj.rol in ["admin", "empresa"]:
                    # Usuarios admin/empresa necesitan contraseña
                    if not obj.password:
                        # Generar contraseña temporal si no se proporciona
                        temp_password = BaseUserManager().make_random_password()
                        obj.set_password(temp_password)
                        messages.warning(
                            request,
                            f"Usuario ADMIN creado. Contraseña temporal para {obj.username}: {temp_password} "
                            f"(Se recomienda cambiarla en el primer acceso)",
                        )
                        logger.info(
                            f"Contraseña temporal generada para usuario admin/empresa {obj.username}"
                        )
                    else:
                        # Encriptar contraseña proporcionada
                        obj.set_password(obj.password)
                        messages.success(
                            request,
                            f"Usuario ADMIN creado exitosamente: {obj.username}",
                        )

                    obj.is_staff = True  # Permitir acceso al admin

                else:  # rol == 'cliente'
                    # Clientes no necesitan contraseña
                    obj.set_unusable_password()
                    obj.is_staff = False
                    messages.success(
                        request,
                        f"Usuario CLIENTE creado exitosamente: {obj.username}. "
                        f"Podrá acceder a sus reservas con email + número de reserva.",
                    )
                    logger.info(
                        f"Usuario cliente creado sin contraseña: {obj.username}"
                    )

            super().save_model(request, obj, form, change)

        except Exception as e:
            logger.error(f"Error creando usuario: {str(e)}")
            messages.error(request, f"Error creando usuario: {str(e)}")
            raise

    def get_readonly_fields(self, request, obj=None):
        """Campos de solo lectura dinámicos"""
        readonly = list(self.readonly_fields)

        if obj:  # Editando objeto existente
            readonly.extend(["username"])  # Username no se puede cambiar

        return readonly

    def has_delete_permission(self, request, obj=None):
        """Controlar permisos de eliminación"""
        if obj and obj.is_superuser and not request.user.is_superuser:
            return False
        return super().has_delete_permission(request, obj)

