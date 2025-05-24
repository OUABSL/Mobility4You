from rest_framework import serializers
from ..models.facturacion import Factura, Contrato


# Serializador para el modelo Contrato
class ContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contrato
        fields = [
            'id', 'reserva', 'numero_contrato', 'fecha_firma', 'condiciones',
            'url_pdf', 'estado', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']



# Serializador para el modelo Factura
class FacturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Factura
        fields = [
            'id', 'reserva', 'numero_factura', 'fecha_emision', 'base_imponible',
            # Agrega aquí los demás campos definidos en el modelo Factura cuando estén completos
        ]
        read_only_fields = ['id']
