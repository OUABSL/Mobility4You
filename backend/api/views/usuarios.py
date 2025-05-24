from rest_framework import viewsets, filters
from ..models.usuarios import Usuario
from ..serializers.usuarios import UsuarioSerializer

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'nacionalidad', 'tipo_documento', 'numero_documento']
    ordering_fields = ['username', 'fecha_nacimiento']

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Usuario.objects.all()
        return Usuario.objects.filter(id=user.id)

    # Puedes agregar acciones custom aquí si lo necesitas