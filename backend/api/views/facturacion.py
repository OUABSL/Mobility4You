from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend  # ← AGREGAR
from ..models.facturacion import Contrato, Factura
from ..serializers.facturacion import ContratoSerializer, FacturaSerializer

class ContratoViewSet(viewsets.ModelViewSet):
    queryset = Contrato.objects.all()
    serializer_class = ContratoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]  # ← AGREGAR DjangoFilterBackend
    search_fields = ['numero_contrato', 'estado']
    ordering_fields = ['fecha_firma', 'created_at']

class FacturaViewSet(viewsets.ModelViewSet):
    queryset = Factura.objects.all()
    serializer_class = FacturaSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]  # ← AGREGAR DjangoFilterBackend
    search_fields = ['numero_factura', 'estado']
    ordering_fields = ['fecha_emision', 'created_at']