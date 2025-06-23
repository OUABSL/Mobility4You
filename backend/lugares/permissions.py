# lugares/permissions.py
"""
Permisos para las vistas de lugares y direcciones
"""
from typing import Any

from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.views import APIView


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permiso personalizado que permite lectura a todos y escritura solo a administradores
    """

    def has_permission(self, request: Request, view: APIView) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class PublicAccessPermission(permissions.BasePermission):
    """
    Permite acceso público para consultas
    """

    def has_permission(self, request: Request, view: APIView) -> bool:
        return True
