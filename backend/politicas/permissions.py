# politicas/permissions.py
from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permiso personalizado para permitir solo a los propietarios editar sus objetos.
    """

    def has_object_permission(self, request, view, obj):
        # Permisos de lectura para cualquier request,
        # por lo que siempre permitimos GET, HEAD o OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Permisos de escritura solo para el propietario del objeto.
        return obj.owner == request.user
