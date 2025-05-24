from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models.contenidos import Contenido
from ..serializers.contenidos import ContenidoSerializer
from ..permissions import IsAdminOrReadOnly
class ContenidoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar contenidos estáticos
    """
    queryset = Contenido.objects.filter(activo=True)
    serializer_class = ContenidoSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo', 'activo']
    search_fields = ['titulo', 'subtitulo', 'cuerpo']
    ordering_fields = ['created_at', 'titulo']
    ordering = ['tipo', 'titulo']
    
    def get_queryset(self):
        """
        Filtrar contenidos por tipo si se proporciona
        """
        queryset = super().get_queryset()
        tipo = self.request.query_params.get('tipo', None)
        
        if tipo:
            queryset = queryset.filter(tipo=tipo)
            
        # Solo mostrar contenidos activos a usuarios no admin
        if not self.request.user.is_staff:
            queryset = queryset.filter(activo=True)
            
        return queryset

    @action(detail=False, methods=['get'])
    def activos(self, request):
        """Devuelve los contenidos activos"""
        queryset = self.get_queryset().filter(activo=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def tipo(self, request):
        """Filtra por tipo de contenido (query param: tipo)"""
        tipo = request.query_params.get('tipo')
        if not tipo:
            return Response({'error': 'Debe indicar el tipo'}, status=status.HTTP_400_BAD_REQUEST)
        queryset = self.get_queryset().filter(tipo=tipo, activo=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
