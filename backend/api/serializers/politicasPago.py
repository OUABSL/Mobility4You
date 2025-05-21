# api/serializers/politicasPago.py
from rest_framework import serializers
from ..models.politicas import PoliticaPago, PoliticaIncluye, TipoPenalizacion

class PoliticaIncluyeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoliticaIncluye
        fields = ['item', 'incluye']

class PoliticaPagoSerializer(serializers.ModelSerializer):
    items = PoliticaIncluyeSerializer(many=True, read_only=True)
    
    class Meta:
        model = PoliticaPago
        fields = ['id', 'titulo', 'descripcion', 'deductible', 'items']