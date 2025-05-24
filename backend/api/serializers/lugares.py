# api/serializers/lugares.py
from rest_framework import serializers
from ..models.lugares import Direccion, Lugar

class DireccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Direccion
        fields = ['id', 'calle', 'ciudad', 'provincia', 'pais', 'codigo_postal']

class LugarSerializer(serializers.ModelSerializer):
    direccion = DireccionSerializer(read_only=True)
    class Meta:
        model = Lugar
        fields = ['id', 'nombre', 'direccion', 'latitud', 'longitud', 'telefono', 'email', 'icono_url', 'created_at']