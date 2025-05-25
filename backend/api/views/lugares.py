# api/views/lugares.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from ..models.lugares import Lugar
from ..serializers.lugares import LugarSerializer
from ..permissions import IsAdminOrReadOnly, PublicAccessPermission
class LugarViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para gestionar lugares de recogida/devolución
    """
    queryset = Lugar.objects.all()
    serializer_class = LugarSerializer
    permission_classes = [PublicAccessPermission]  # Permitir acceso público para consultas
    
    def get_queryset(self):
        """
        Filtrar lugares activos y por ciudad si se especifica
        """
        queryset = super().get_queryset()
        ciudad = self.request.query_params.get('ciudad', None)
        
        if ciudad:
            queryset = queryset.filter(direccion__ciudad__icontains=ciudad)
            
        return queryset.order_by('nombre')
    
    @action(detail=False, methods=['get'])
    def destinos(self, request):
        """
        Obtiene los destinos populares agrupados por país/ciudad
        """
        # En una implementación real, esto podría venir de una tabla específica
        # o calcularse basándose en las reservas más populares
        destinos_data = [
            {
                'id': 1,
                'nombre': 'España',
                'info_adicional': {
                    'paises': 'España',
                    'ciudades': 'Madrid, Barcelona, Málaga, Sevilla',
                    'imagen': '/images/destinations/spain.jpg',
                    'total_oficinas': 15
                }
            },
            {
                'id': 2,
                'nombre': 'Francia',
                'info_adicional': {
                    'paises': 'Francia',
                    'ciudades': 'París, Lyon, Niza, Marsella',
                    'imagen': '/images/destinations/france.jpg',
                    'total_oficinas': 12
                }
            },
            {
                'id': 3,
                'nombre': 'Italia',
                'info_adicional': {
                    'paises': 'Italia',
                    'ciudades': 'Roma, Milán, Florencia, Venecia',
                    'imagen': '/images/destinations/italy.jpg',
                    'total_oficinas': 10
                }
            },
            {
                'id': 4,
                'nombre': 'Reino Unido',
                'info_adicional': {
                    'paises': 'Reino Unido',
                    'ciudades': 'Londres, Manchester, Edimburgo, Birmingham',
                    'imagen': '/images/destinations/uk.jpg',
                    'total_oficinas': 8
                }
            }
        ]
        
        return Response(destinos_data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def cercanos(self, request):
        """
        Obtiene lugares cercanos a unas coordenadas
        """
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        
        if not lat or not lng:
            return Response(
                {'error': 'Se requieren latitud y longitud'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            lat = float(lat)
            lng = float(lng)
            
            # Aquí se podría implementar una búsqueda por distancia real
            # Por ahora, devolvemos todos los lugares ordenados por nombre
            lugares = self.get_queryset()
            serializer = self.get_serializer(lugares, many=True)
            
            return Response(serializer.data)
            
        except ValueError:
            return Response(
                {'error': 'Latitud y longitud deben ser números válidos'},
                status=status.HTTP_400_BAD_REQUEST
            )