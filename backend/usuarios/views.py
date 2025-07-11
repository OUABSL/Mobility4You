# usuarios/views.py
from django.db.models import Q
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Usuario
from .serializers import (
    AdminUsuarioCreateSerializer,
    ClienteUsuarioCreateSerializer,
    ConductorSerializer,
    EmpresaUsuarioCreateSerializer,
    UsuarioSerializer,
)


class UsuarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar usuarios del sistema
    Maneja diferentes tipos: admin, cliente, empresa
    """

    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "username",
        "email",
        "nacionalidad",
        "tipo_documento",
        "numero_documento",
    ]
    ordering_fields = ["username", "fecha_nacimiento"]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filtrar usuarios según permisos del usuario actual"""
        user = self.request.user
        if user.is_staff:
            return Usuario.objects.select_related("direccion").all()
        return Usuario.objects.filter(id=user.id).select_related("direccion")

    def get_serializer_class(self):
        """Usar serializer específico según la acción y tipo de usuario"""
        if self.action == "create":
            # Determinar tipo de usuario a crear basado en parámetros
            tipo_usuario = self.request.data.get("tipo_usuario", "cliente")
            if tipo_usuario == "admin":
                return AdminUsuarioCreateSerializer
            elif tipo_usuario == "empresa":
                return EmpresaUsuarioCreateSerializer
            else:
                return ClienteUsuarioCreateSerializer
        elif self.action == "conductor":
            return ConductorSerializer
        return self.serializer_class

    def get_permissions(self):
        """Personalizar permisos según la acción"""
        if self.action == "create":
            # Permitir creación de clientes sin autenticación
            tipo_usuario = self.request.data.get("tipo_usuario", "cliente")
            if tipo_usuario == "cliente":
                permission_classes = [permissions.AllowAny]
            else:
                # Admin y empresa requieren permisos especiales
                permission_classes = [permissions.IsAdminUser]
        elif self.action in ["conductor"]:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated]

        return [permission() for permission in permission_classes]

    @action(detail=False, methods=["post"])
    def crear_admin(self, request):
        """
        Endpoint específico para crear usuarios admin
        Solo para superusuarios
        """
        if not request.user.is_superuser:
            return Response(
                {"error": "Solo superusuarios pueden crear administradores"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AdminUsuarioCreateSerializer(data=request.data)
        if serializer.is_valid():
            usuario = serializer.save()
            return Response(
                UsuarioSerializer(usuario).data, status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"])
    def crear_empresa(self, request):
        """
        Endpoint específico para crear usuarios empresa
        Solo para admin
        """
        if not request.user.is_staff:
            return Response(
                {"error": "Solo administradores pueden crear usuarios empresa"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = EmpresaUsuarioCreateSerializer(data=request.data)
        if serializer.is_valid():
            usuario = serializer.save()
            return Response(
                UsuarioSerializer(usuario).data, status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"])
    def crear_cliente(self, request):
        """
        Endpoint específico para crear usuarios cliente
        Público (sin autenticación)
        """
        serializer = ClienteUsuarioCreateSerializer(data=request.data)
        if serializer.is_valid():
            usuario = serializer.save()
            return Response(
                UsuarioSerializer(usuario).data, status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def conductores(self, request):
        """
        Endpoint para obtener lista de conductores
        """
        conductores = Usuario.objects.filter(
            Q(rol="cliente") & Q(is_active=True)
        ).select_related("direccion")

        # Filtrar por búsqueda si se proporciona
        search = request.query_params.get("search", None)
        if search:
            conductores = conductores.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(numero_documento__icontains=search)
            )

        serializer = ConductorSerializer(conductores, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def activar(self, request, pk=None):
        """
        Activar usuario
        """
        usuario = self.get_object()
        usuario.activo = True
        usuario.save()
        return Response({"status": "Usuario activado correctamente"})

    @action(detail=True, methods=["post"])
    def desactivar(self, request, pk=None):
        """
        Desactivar usuario
        """
        usuario = self.get_object()
        usuario.activo = False
        usuario.save()
        return Response({"status": "Usuario desactivado correctamente"})

    @action(detail=True, methods=["post"])
    def verificar(self, request, pk=None):
        """
        Marcar usuario como verificado
        """
        usuario = self.get_object()
        usuario.verificado = True
        usuario.save()
        return Response({"status": "Usuario verificado correctamente"})

    def perform_create(self, serializer):
        """Personalizar creación de usuarios"""
        # Lógica adicional durante la creación si es necesario
        usuario = serializer.save()

        # Log de creación
        import logging

        logger = logging.getLogger("usuarios")
        logger.info(
            f"Usuario creado: {usuario.username} ({usuario.email}) - Tipo: {usuario.rol or 'admin'}"
        )

        return usuario
