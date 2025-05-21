# api/serializers/vehiculos.py
from rest_framework import serializers
from ..models.vehiculos import Categoria, GrupoCoche, Vehiculo, ImagenVehiculo, TarifaVehiculo

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'descripcion']

class GrupoCocheSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    
    class Meta:
        model = GrupoCoche
        fields = ['id', 'nombre', 'descripcion', 'categoria', 'edad_minima']

class ImagenVehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagenVehiculo
        fields = ['id', 'url', 'portada', 'ancho', 'alto']

class VehiculoListSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    grupo = GrupoCocheSerializer(read_only=True)
    imagen_principal = serializers.SerializerMethodField()
    
    class Meta:
        model = Vehiculo
        fields = [
            'id', 'marca', 'modelo', 'categoria', 'grupo',
            'num_puertas', 'num_pasajeros', 'combustible',
            'capacidad_maletero', 'imagen_principal', 'precio_dia'
        ]
    
    def get_imagen_principal(self, obj):
        # Obtener la imagen portada o la primera disponible
        imagen = obj.imagenes.filter(portada=True).first()
        if not imagen:
            imagen = obj.imagenes.first()
        
        if imagen:
            return imagen.url
        return None

class VehiculoDetailSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    grupo = GrupoCocheSerializer(read_only=True)
    imagenes = ImagenVehiculoSerializer(many=True, read_only=True)
    imagenPrincipal = serializers.SerializerMethodField()
    fianza = serializers.DecimalField(max_digits=10, decimal_places=2)
    precio_dia = serializers.SerializerMethodField()
    
    class Meta:
        model = Vehiculo
        fields = [
            'id', 'marca', 'modelo', 'matricula', 'categoria', 'grupo',
            'num_puertas', 'num_pasajeros', 'combustible', 'anio', 'color',
            'capacidad_maletero', 'fianza', 'imagenes', 'imagenPrincipal',
            'precio_dia'
        ]
    
    def get_imagenPrincipal(self, obj):
        # Obtener la imagen portada o la primera disponible
        imagen = obj.imagenes.filter(portada=True).first()
        if not imagen:
            imagen = obj.imagenes.first()
        
        if imagen:
            return imagen.url
        return None
    
    def get_precio_dia(self, obj):
        # Obtener precio actual según tarifas vigentes
        return obj.precio_actual()

class VehiculoDisponibleSerializer(VehiculoListSerializer):
    precio_total = serializers.SerializerMethodField()
    dias = serializers.SerializerMethodField()
    
    class Meta(VehiculoListSerializer.Meta):
        fields = VehiculoListSerializer.Meta.fields + ['precio_total', 'dias']
    
    def get_precio_total(self, obj):
        # Calcular precio total según contexto (fechas de alquiler)
        request = self.context.get('request')
        if request:
            fecha_inicio = request.data.get('fecha_inicio')
            fecha_fin = request.data.get('fecha_fin')
            
            from api.services.vehiculos import calcular_precio_alquiler
            precios = calcular_precio_alquiler(obj.id, fecha_inicio, fecha_fin)
            return precios['total']
        return None
    
    def get_dias(self, obj):
        # Calcular días de alquiler según contexto
        request = self.context.get('request')
        if request:
            fecha_inicio = request.data.get('fecha_inicio')
            fecha_fin = request.data.get('fecha_fin')
            
            from datetime import datetime
            import math
            
            if isinstance(fecha_inicio, str):
                fecha_inicio = datetime.fromisoformat(fecha_inicio.replace('Z', '+00:00'))
            if isinstance(fecha_fin, str):
                fecha_fin = datetime.fromisoformat(fecha_fin.replace('Z', '+00:00'))
                
            delta = fecha_fin - fecha_inicio
            return math.ceil(delta.total_seconds() / (24 * 3600))
        return None