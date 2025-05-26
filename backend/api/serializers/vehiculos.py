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
    imagen_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ImagenVehiculo
        fields = ['id', 'vehiculo', 'imagen', 'imagen_url', 'portada', 'ancho', 'alto']
        
    def get_imagen_url(self, obj):
        """Obtener la URL de la imagen para compatibilidad con el frontend"""
        if obj.imagen:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.imagen.url)
            return obj.imagen.url
        return None

class VehiculoListSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    grupo = GrupoCocheSerializer(read_only=True)
    imagenes = ImagenVehiculoSerializer(many=True, read_only=True)
    precio_dia = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    imagenPrincipal = serializers.SerializerMethodField()
    
    class Meta:
        model = Vehiculo
        fields = [
            'id', 'categoria', 'grupo', 'combustible', 'marca', 'modelo', 
            'matricula', 'anio', 'color', 'num_puertas', 'num_pasajeros',
            'capacidad_maletero', 'disponible', 'activo', 'fianza', 
            'kilometraje', 'imagenes', 'precio_dia', 'imagenPrincipal', 'descripcion'
        ]
    
    def get_imagenPrincipal(self, obj):
        """Obtener la URL de la imagen principal del vehículo"""
        imagen_principal = obj.imagenes.filter(portada=True).first()
        if imagen_principal and imagen_principal.imagen:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(imagen_principal.imagen.url)
            return imagen_principal.imagen.url
        return None

class VehiculoDetailSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    grupo = GrupoCocheSerializer(read_only=True)
    imagenes = ImagenVehiculoSerializer(many=True, read_only=True)
    precio_dia = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    imagenPrincipal = serializers.SerializerMethodField()
    descripcion = serializers.CharField(read_only=True)
    
    class Meta:
        model = Vehiculo
        fields = '__all__'
    
    def get_imagenPrincipal(self, obj):
        """Obtener la URL de la imagen principal del vehículo"""
        imagen_principal = obj.imagenes.filter(portada=True).first()
        if imagen_principal and imagen_principal.imagen:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(imagen_principal.imagen.url)
            return imagen_principal.imagen.url
        return None

class VehiculoDisponibleSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    grupo = GrupoCocheSerializer(read_only=True)
    imagenes = ImagenVehiculoSerializer(many=True, read_only=True)
    precio_dia = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    imagenPrincipal = serializers.SerializerMethodField()
    
    class Meta:
        model = Vehiculo
        fields = [
            'id', 'categoria', 'grupo', 'combustible', 'marca', 'modelo', 
            'matricula', 'anio', 'color', 'num_puertas', 'num_pasajeros',
            'capacidad_maletero', 'disponible', 'fianza', 'kilometraje', 
            'imagenes', 'precio_dia', 'imagenPrincipal'
        ]
    
    def get_imagenPrincipal(self, obj):
        """Obtener la URL de la imagen principal del vehículo"""
        imagen_principal = obj.imagenes.filter(portada=True).first()
        if imagen_principal and imagen_principal.imagen:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(imagen_principal.imagen.url)
            return imagen_principal.imagen.url
        return None