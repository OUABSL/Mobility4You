# api/views/lugares.py
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from ..models.lugares import Lugar, Direccion
from ..serializers.lugares import LugarSerializer, DireccionSerializer

class LugarViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Lugar.objects.filter(activo=True)
    serializer_class = LugarSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_fields = ['activo']
    search_fields = ['nombre', 'direccion__ciudad', 'direccion__pais']

    @action(detail=False, methods=['get'])
    def destinos(self, request):
        """Devuelve los destinos destacados o todos los lugares activos"""
        queryset = self.get_queryset().filter(activo=True)
        # Aquí puedes filtrar por algún criterio de destino si lo necesitas
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)