from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from ..models.contenidos import Contenido
from ..serializers.contenidos import ContenidoSerializer

class ContenidoViewSet(viewsets.ModelViewSet):
    queryset = Contenido.objects.all()
    serializer_class = ContenidoSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titulo', 'subtitulo', 'cuerpo', 'tipo']
    ordering_fields = ['tipo', 'orden', 'titulo']

    @action(detail=False, methods=['get'])
    def publicados(self, request):
        """Devuelve los contenidos publicados"""
        queryset = self.get_queryset().filter(publicado=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def destacados(self, request):
        """Devuelve los contenidos destacados"""
        queryset = self.get_queryset().filter(destacado=True, publicado=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def tipo(self, request):
        """Filtra por tipo de contenido (query param: tipo)"""
        tipo = request.query_params.get('tipo')
        if not tipo:
            return Response({'error': 'Debe indicar el tipo'}, status=status.HTTP_400_BAD_REQUEST)
        queryset = self.get_queryset().filter(tipo=tipo, publicado=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
