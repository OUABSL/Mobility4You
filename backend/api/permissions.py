from rest_framework import permissions

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permiso que solo permite a propietarios o administradores
    """
    
    def has_object_permission(self, request, view, obj):
        # Los administradores siempre tienen permiso
        if request.user.is_staff:
            return True
        
        # Para reservas, verificar si el usuario es el propietario
        if hasattr(obj, 'usuario'):
            return obj.usuario == request.user
        
        # Para modelos relacionados con reservas
        if hasattr(obj, 'reserva') and hasattr(obj.reserva, 'usuario'):
            return obj.reserva.usuario == request.user
        
        return False

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permiso que permite lectura a todos, pero solo escritura a admin
    """
    
    def has_permission(self, request, view):
        # Permitir GET, HEAD, OPTIONS a todos
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Solo administradores pueden hacer cambios - ✅ AGREGAR VERIFICACIÓN
        return request.user and request.user.is_staff  # ← CAMBIAR ESTA LÍNEA

class AllowAnyForContactOnly(permissions.BasePermission):
    """
    Permiso que permite a cualquiera enviar el formulario de contacto
    """
    
    def has_permission(self, request, view):
        # Solo para view específica
        if view.__class__.__name__ == 'ContactoView':
            return True
        
        # Para otras vistas, seguir permisos normales
        return request.user.is_authenticated