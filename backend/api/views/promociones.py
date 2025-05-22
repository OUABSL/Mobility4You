# api/views/contenidos.py
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from ..models.promociones import Promocion
from ..models.contenidos import Contenido
from ..serializers.promociones import PromocionSerializer
from ..serializers.contenidos import ContenidoSerializer

class ContenidoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Contenido.objects.filter(publicado=True)
    serializer_class = ContenidoSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_fields = ['tipo', 'destacado']
    search_fields = ['titulo', 'subtitulo', 'cuerpo']

class PromocionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Promocion.objects.filter(activo=True)
    serializer_class = PromocionSerializer
    
    def get_queryset(self):
        """Filtra promociones vigentes automáticamente"""
        from django.utils import timezone
        hoy = timezone.now().date()
        
        return Promocion.objects.filter(
            activo=True,
            fecha_inicio__lte=hoy,
            fecha_fin__gte=hoy
        )