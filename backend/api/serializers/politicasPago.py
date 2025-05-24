# api/serializers/politicasPago.py
from rest_framework import serializers
from ..models.politicasPago import PoliticaPago, PoliticaIncluye, TipoPenalizacion, PoliticaPenalizacion

class PoliticaIncluyeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoliticaIncluye
        fields = ['item', 'incluye']

class TipoPenalizacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoPenalizacion
        fields = ['id', 'nombre', 'tipo_tarifa']

class PoliticaPenalizacionSerializer(serializers.ModelSerializer):
    tipo_penalizacion = TipoPenalizacionSerializer(read_only=True)
    class Meta:
        model = PoliticaPenalizacion
        fields = ['id', 'politica_pago', 'tipo_penalizacion']

class PoliticaPagoSerializer(serializers.ModelSerializer):
    items = PoliticaIncluyeSerializer(many=True, read_only=True)
    penalizaciones = PoliticaPenalizacionSerializer(many=True, read_only=True)
    class Meta:
        model = PoliticaPago
        fields = ['id', 'titulo', 'descripcion', 'deductible', 'items', 'penalizaciones', 'created_at', 'updated_at']