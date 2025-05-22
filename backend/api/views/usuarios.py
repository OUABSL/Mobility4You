from rest_framework import viewsets, filters
from django.contrib.auth import get_user_model
from ..models.usuarios import Perfil
from ..serializers.usuarios import PerfilSerializer

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Perfil.objects.select_related('usuario').all()
    serializer_class = PerfilSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['usuario__username', 'usuario__email', 'nacionalidad', 'tipo_documento', 'numero_documento']
    ordering_fields = ['usuario__username', 'fecha_nacimiento', 'rol', 'verificado']

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Perfil.objects.all()
        return Perfil.objects.filter(usuario=user)

    # Puedes agregar acciones custom aquí si lo necesitas