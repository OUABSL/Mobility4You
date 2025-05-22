# api/views/vehiculos.py
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime
from ..models.vehiculos import Categoria, GrupoCoche, Vehiculo, ImagenVehiculo
from ..serializers.vehiculos import (
    CategoriaSerializer, GrupoCocheSerializer, 
    VehiculoListSerializer, VehiculoDetailSerializer,
    ImagenVehiculoSerializer
)
from ..filters import VehiculoFilter
import logging

logger = logging.getLogger(__name__)

class CategoriaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']

class GrupoCocheViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GrupoCoche.objects.all()
    serializer_class = GrupoCocheSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_fields = ['categoria']
    search_fields = ['nombre']

class VehiculoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Vehiculo.objects.filter(activo=True)
    filterset_class = VehiculoFilter
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['marca', 'modelo', 'categoria__nombre']
    ordering_fields = ['precio_dia', 'marca', 'modelo', 'num_pasajeros']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return VehiculoListSerializer
        return VehiculoDetailSerializer
    
    @action(detail=False, methods=['post'])
    def disponibilidad(self, request):
        """Verifica disponibilidad de vehículos en fechas específicas"""
        from api.serializers.vehiculos import VehiculoDisponibleSerializer

        try:
            fecha_inicio = parse_datetime(request.data.get('fecha_inicio'))
            fecha_fin = parse_datetime(request.data.get('fecha_fin'))
            lugar_id = request.data.get('lugar_id')
            categoria_id = request.data.get('categoria_id')
            grupo_id = request.data.get('grupo_id')

            logger.info(f"Búsqueda de disponibilidad: inicio={fecha_inicio}, fin={fecha_fin}, lugar_id={lugar_id}, categoria_id={categoria_id}, grupo_id={grupo_id}")

            if not fecha_inicio or not fecha_fin:
                logger.warning("Fechas inválidas en la búsqueda de disponibilidad")
                return Response({'error': 'Fechas inválidas'}, status=400)

            # Filtrar vehículos disponibles
            from api.services.vehiculos import buscar_vehiculos_disponibles
            vehiculos = buscar_vehiculos_disponibles(
                fecha_inicio, fecha_fin, lugar_id, categoria_id, grupo_id
            )

            serializer = VehiculoDisponibleSerializer(vehiculos, many=True, context={'request': request})
            logger.info(f"{vehiculos.count()} vehículos disponibles encontrados")
            return Response(serializer.data, status=200)

        except Exception as e:
            logger.exception("Error inesperado al verificar disponibilidad")
            return Response({'error': 'Error interno del servidor'}, status=500)