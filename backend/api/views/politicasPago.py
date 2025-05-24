from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from ..models.politicasPago import PoliticaPago, PoliticaIncluye, TipoPenalizacion
from ..serializers.politicasPago import PoliticaPagoSerializer, PoliticaIncluyeSerializer

class PoliticaPagoViewSet(viewsets.ModelViewSet):
    queryset = PoliticaPago.objects.all()
    serializer_class = PoliticaPagoSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titulo', 'descripcion']
    ordering_fields = ['titulo', 'deductible']

    @action(detail=True, methods=['get'])
    def incluye(self, request, pk=None):
        """Devuelve los items incluidos en la política"""
        politica = self.get_object()
        serializer = PoliticaIncluyeSerializer(politica.items.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def penalizaciones(self, request, pk=None):
        """Devuelve las penalizaciones asociadas a la política"""
        politica = self.get_object()
        penalizaciones = politica.penalizaciones.select_related('tipo_penalizacion').all()
        data = [
            {
                'tipo': p.tipo_penalizacion.nombre,
                'tipo_tarifa': p.tipo_penalizacion.get_tipo_tarifa_display(),
                'horas_previas': p.horas_previas
            }
            for p in penalizaciones
        ]
        return Response(data)
