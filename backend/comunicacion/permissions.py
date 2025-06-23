# comunicacion/permissions.py
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
