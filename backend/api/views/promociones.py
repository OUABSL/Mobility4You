# api/views/promociones.py  # ← CORREGIR COMENTARIO
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from ..models.promociones import Promocion
from ..serializers.promociones import PromocionSerializer

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