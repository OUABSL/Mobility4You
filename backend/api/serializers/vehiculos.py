# api/serializers/vehiculos.py
from rest_framework import serializers
from ..models.vehiculos import Categoria, GrupoCoche, Vehiculo, ImagenVehiculo

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'descripcion', 'created_at', 'updated_at']

class GrupoCocheSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrupoCoche
        fields = ['id', 'nombre', 'edad_minima', 'descripcion', 'created_at', 'updated_at']

class ImagenVehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagenVehiculo
        fields = ['id', 'vehiculo', 'url', 'portada', 'ancho', 'alto']

class VehiculoListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = ['id']  # Ajustar según los campos reales definidos en el modelo Vehiculo

class VehiculoDetailSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    grupo = GrupoCocheSerializer(read_only=True)
    imagenes = ImagenVehiculoSerializer(many=True, read_only=True)
    class Meta:
        model = Vehiculo
        fields = '__all__'

class VehiculoDisponibleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = ['id']  # Ajustar según los campos reales definidos en el modelo Vehiculo