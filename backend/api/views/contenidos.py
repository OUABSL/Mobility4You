from rest_framework import viewsets
from ..models.politicasPago import PoliticaPago
from ..serializers.politicasPago import PoliticaPagoSerializer

class PoliticaPagoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PoliticaPago.objects.all()
    serializer_class = PoliticaPagoSerializer
