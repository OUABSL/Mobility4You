# api/views/extras.py
import logging
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models.reservas import Extras
from ..serializers.reservas import ExtrasSerializer
from ..permissions import IsAdminOrReadOnly, PublicAccessPermission

logger = logging.getLogger(__name__)

class ExtrasViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para gestionar extras disponibles.
    Solo lectura para usuarios públicos, gestión completa vía Django Admin.
    """
    queryset = Extras.objects.all()
    serializer_class = ExtrasSerializer
    permission_classes = [PublicAccessPermission]  # Acceso público para consultas
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre', 'precio']
    ordering = ['nombre']
    
    def get_permissions(self):
        """
        Personalizar permisos: acceso público para listar/ver, admin para modificar
        """
        if self.action in ['list', 'retrieve']:
            return [PublicAccessPermission()]
        else:
            return [IsAdminOrReadOnly()]
    
    def list(self, request, *args, **kwargs):
        """
        Lista todos los extras disponibles con logging
        """
        logger.info("Solicitando lista de extras disponibles")
        
        try:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            
            logger.info(f"Devolviendo {len(serializer.data)} extras")
            return Response({
                'success': True,
                'count': len(serializer.data),
                'results': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error obteniendo extras: {str(e)}")
            return Response(
                {'error': 'Error interno obteniendo extras'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def retrieve(self, request, *args, **kwargs):
        """
        Obtiene detalle de un extra específico
        """
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            
            logger.info(f"Devolviendo detalle del extra {instance.id}: {instance.nombre}")
            return Response({
                'success': True,
                'result': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error obteniendo detalle del extra: {str(e)}")
            return Response(
                {'error': 'Extra no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def disponibles(self, request):
        """
        Obtiene solo los extras que están disponibles (activos)
        En el futuro se podría agregar un campo 'activo' al modelo
        """
        logger.info("Solicitando extras disponibles")
        
        try:
            # Por ahora, todos los extras en BD están disponibles
            # En el futuro se podría filtrar por un campo 'activo'
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            
            return Response({
                'success': True,
                'count': len(serializer.data),
                'results': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error obteniendo extras disponibles: {str(e)}")
            return Response(
                {'error': 'Error interno obteniendo extras disponibles'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def por_precio(self, request):
        """
        Obtiene extras ordenados por precio (ascendente o descendente)
        Parámetro: orden=asc|desc (por defecto: asc)
        """
        try:
            orden = request.query_params.get('orden', 'asc')
            
            if orden.lower() == 'desc':
                queryset = self.get_queryset().order_by('-precio')
            else:
                queryset = self.get_queryset().order_by('precio')
            
            serializer = self.get_serializer(queryset, many=True)
            
            logger.info(f"Devolviendo extras ordenados por precio ({orden})")
            return Response({
                'success': True,
                'count': len(serializer.data),
                'results': serializer.data,
                'orden': orden
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error ordenando extras por precio: {str(e)}")
            return Response(
                {'error': 'Error interno ordenando extras'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
