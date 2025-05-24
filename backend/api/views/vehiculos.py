# api/views/vehiculos.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Prefetch
from datetime import datetime
from ..models.vehiculos import Categoria, GrupoCoche, Vehiculo, TarifaVehiculo
from ..models.reservas import Reserva
from ..serializers.vehiculos import (
    CategoriaSerializer, 
    GrupoCocheSerializer, 
    VehiculoListSerializer,
    VehiculoDetailSerializer
)
from ..filters import VehiculoFilter
from ..permissions import IsAdminOrReadOnly
from ..pagination import StandardResultsSetPagination

class CategoriaViewSet(viewsets.ModelViewSet):
    """ViewSet para categorías de vehículos"""
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [IsAdminOrReadOnly]

class GrupoCocheViewSet(viewsets.ModelViewSet):
    """ViewSet para grupos de coches"""
    queryset = GrupoCoche.objects.all()
    serializer_class = GrupoCocheSerializer
    permission_classes = [IsAdminOrReadOnly]

class VehiculoViewSet(viewsets.ModelViewSet):
    """ViewSet para vehículos"""
    queryset = Vehiculo.objects.filter(activo=True).select_related(
        'categoria', 'grupo'
    ).prefetch_related('imagenes', 'tarifas')
    serializer_class = VehiculoDetailSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_class = VehiculoFilter
    pagination_class = StandardResultsSetPagination
    
    def get_serializer_class(self):
        if self.action == 'list':
            return VehiculoListSerializer
        return VehiculoDetailSerializer
    
    @action(detail=False, methods=['post'])
    def disponibilidad(self, request):
        """Busca vehículos disponibles según criterios"""
        try:
            # Extraer parámetros
            fecha_recogida = request.data.get('fecha_recogida') or request.data.get('pickupDate')
            fecha_devolucion = request.data.get('fecha_devolucion') or request.data.get('dropoffDate')
            lugar_recogida_id = request.data.get('lugar_recogida_id') or request.data.get('pickupLocation')
            lugar_devolucion_id = request.data.get('lugar_devolucion_id') or request.data.get('dropoffLocation')
            categoria_id = request.data.get('categoria_id')
            grupo_id = request.data.get('grupo_id')
            
            # Validar fechas
            if not fecha_recogida or not fecha_devolucion:
                return Response(
                    {'error': 'Se requieren fechas de recogida y devolución'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Convertir fechas
            if isinstance(fecha_recogida, str):
                fecha_recogida = datetime.fromisoformat(fecha_recogida.replace('Z', '+00:00'))
            if isinstance(fecha_devolucion, str):
                fecha_devolucion = datetime.fromisoformat(fecha_devolucion.replace('Z', '+00:00'))
            
            # Consulta base
            vehiculos = self.get_queryset().filter(disponible=True)
            
            # Filtrar por categoría y grupo si se especifican
            if categoria_id:
                vehiculos = vehiculos.filter(categoria_id=categoria_id)
            if grupo_id:
                vehiculos = vehiculos.filter(grupo_id=grupo_id)
            
            # Excluir vehículos con reservas confirmadas que se solapen
            reservas_solapadas = Reserva.objects.filter(
                estado='confirmada',
                fecha_recogida__lt=fecha_devolucion,
                fecha_devolucion__gt=fecha_recogida
            ).values_list('vehiculo_id', flat=True)
            
            vehiculos = vehiculos.exclude(id__in=reservas_solapadas)
            
            # Obtener tarifa actual para cada vehículo
            vehiculos_con_precio = []
            for vehiculo in vehiculos:
                # Obtener precio para las fechas
                tarifa = vehiculo.tarifas.filter(
                    Q(fecha_fin__gte=fecha_recogida.date()) | Q(fecha_fin__isnull=True),
                    fecha_inicio__lte=fecha_recogida.date()
                ).order_by('-fecha_inicio').first()
                
                if tarifa:
                    vehiculo.precio_dia = tarifa.precio_dia
                else:
                    vehiculo.precio_dia = 50.00  # Precio por defecto
                
                vehiculos_con_precio.append(vehiculo)
            
            # Serializar resultados
            serializer = VehiculoDetailSerializer(vehiculos_con_precio, many=True)
            
            return Response({
                'count': len(vehiculos_con_precio),
                'results': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def disponibilidad_fechas(self, request, pk=None):
        """Obtiene las fechas en las que un vehículo NO está disponible"""
        vehiculo = self.get_object()
        
        # Obtener reservas confirmadas futuras
        reservas = Reserva.objects.filter(
            vehiculo=vehiculo,
            estado='confirmada',
            fecha_devolucion__gte=datetime.now()
        ).values('fecha_recogida', 'fecha_devolucion')
        
        fechas_no_disponibles = []
        for reserva in reservas:
            fechas_no_disponibles.append({
                'inicio': reserva['fecha_recogida'],
                'fin': reserva['fecha_devolucion']
            })
        
        return Response({
            'vehiculo_id': vehiculo.id,
            'fechas_no_disponibles': fechas_no_disponibles
        })