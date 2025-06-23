# facturas_contratos/permissions.py
from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permiso personalizado que permite acceso completo a administradores
    y solo lectura a usuarios autenticados
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permiso personalizado que permite editar solo al propietario del objeto
    """

    def has_object_permission(self, request, view, obj):
        # Permisos de lectura para cualquier request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Permisos de escritura solo para el propietario del objeto
        # Verificar si el objeto tiene relación con usuario (factura o contrato)
        if hasattr(obj, "reserva") and hasattr(obj.reserva, "usuario"):
            return obj.reserva.usuario == request.user
        elif hasattr(obj, "usuario"):
            return obj.usuario == request.user

        return False
