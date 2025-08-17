# politicas/serializers.py
from rest_framework import serializers

from .models import (PoliticaIncluye, PoliticaPago, PoliticaPenalizacion,
                     Promocion, TipoPenalizacion)


class PoliticaIncluyeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoliticaIncluye
        fields = ['item', 'incluye']


class TipoPenalizacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoPenalizacion
        fields = ['id', 'nombre', 'tipo_tarifa', 'valor_tarifa']


class PoliticaPenalizacionSerializer(serializers.ModelSerializer):
    tipo_penalizacion = TipoPenalizacionSerializer(read_only=True)
    
    class Meta:
        model = PoliticaPenalizacion
        fields = ['tipo_penalizacion', 'horas_previas']


class PoliticaPagoSerializer(serializers.ModelSerializer):
    items = PoliticaIncluyeSerializer(many=True, read_only=True)
    penalizaciones = PoliticaPenalizacionSerializer(many=True, read_only=True)
    
    class Meta:
        model = PoliticaPago
        fields = [
            'id', 'titulo', 'deductible', 'descripcion', 'activo', 'tarifa',
            'items', 'penalizaciones', 'created_at', 'updated_at'
        ]


class PromocionSerializer(serializers.ModelSerializer):
    is_vigente = serializers.BooleanField(read_only=True)
    dias_restantes = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Promocion
        fields = [
            'id', 'nombre', 'descripcion', 'descuento_pct',
            'fecha_inicio', 'fecha_fin', 'activo', 
            'is_vigente', 'dias_restantes'
        ]
