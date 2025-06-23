# politicas/views.py
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import PoliticaPago, Promocion, TipoPenalizacion
from .serializers import (PoliticaPagoSerializer, PromocionSerializer,
                          TipoPenalizacionSerializer)


class PoliticaPagoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para políticas de pago"""
    queryset = PoliticaPago.objects.all()
    serializer_class = PoliticaPagoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['deductible']
    search_fields = ['titulo', 'descripcion']
    ordering_fields = ['created_at', 'deductible']
    ordering = ['-created_at']


class TipoPenalizacionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para tipos de penalización"""
    queryset = TipoPenalizacion.objects.all()
    serializer_class = TipoPenalizacionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['tipo_tarifa']
    search_fields = ['nombre']
    ordering = ['nombre']


class PromocionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para promociones"""
    queryset = Promocion.objects.all()
    serializer_class = PromocionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activo']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['fecha_inicio', 'fecha_fin', 'descuento_pct']
    ordering = ['-fecha_inicio']

    @action(detail=False, methods=['get'])
    def vigentes(self, request):
        """Obtiene promociones vigentes"""
        now = timezone.now().date()
        promociones_vigentes = self.queryset.filter(
            activo=True,
            fecha_inicio__lte=now,
            fecha_fin__gte=now
        )
        serializer = self.get_serializer(promociones_vigentes, many=True)
        return Response(serializer.data)
