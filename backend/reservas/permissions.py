# reservas/permissions.py
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


class PublicAccessPermission(permissions.BasePermission):
    """
    Permiso que permite acceso público a endpoints específicos
    """

    def has_permission(self, request, view):
        return True


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permiso personalizado que permite editar solo al propietario del objeto
    """

    def has_object_permission(self, request, view, obj):
        # Permisos de lectura para cualquier request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Permisos de escritura solo para el propietario del objeto
        return obj.usuario == request.user


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permiso que permite acceso al propietario o administradores
    """

    def has_object_permission(self, request, view, obj):
        return request.user and (request.user.is_staff or obj.usuario == request.user)
