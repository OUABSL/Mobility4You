# vehiculos/serializers.py
import logging
from typing import Any, Optional

from rest_framework import serializers

from .models import (Categoria, GrupoCoche, ImagenVehiculo, Mantenimiento,
                     TarifaVehiculo, Vehiculo)

logger = logging.getLogger(__name__)


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ["id", "nombre", "descripcion", "created_at", "updated_at"]


class GrupoCocheSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrupoCoche
        fields = [
            "id",
            "nombre",
            "edad_minima",
            "descripcion",
            "created_at",
            "updated_at",
        ]


class ImagenVehiculoSerializer(serializers.ModelSerializer):
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = ImagenVehiculo
        fields = ["id", "vehiculo", "imagen", "imagen_url", "portada", "ancho", "alto"]

    def get_imagen_url(self, obj: ImagenVehiculo) -> Optional[str]:
        """Obtener la URL de la imagen para compatibilidad con el frontend"""
        if obj.imagen:
            # Construir URL absoluta para imágenes
            from django.conf import settings

            # En desarrollo, usar la URL del request o construir manualmente
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.imagen.url)
            else:
                # Fallback cuando no hay request (ej. en seeds, tests, etc.)
                base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
                return f"{base_url}{obj.imagen.url}"
        return None


class TarifaVehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TarifaVehiculo
        fields = "__all__"


class MantenimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mantenimiento
        fields = "__all__"


class VehiculoListSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    grupo = GrupoCocheSerializer(read_only=True)
    imagenes = ImagenVehiculoSerializer(many=True, read_only=True)
    precio_dia = serializers.SerializerMethodField()

    class Meta:
        model = Vehiculo
        fields = [
            "id",
            "marca",
            "modelo",
            "anio",
            "color",
            "combustible",
            "num_puertas",
            "num_pasajeros",
            "categoria",
            "grupo",
            "precio_dia",
            "imagenes",
            "disponible",
            "activo",
        ]

    def get_precio_dia(self, obj: Vehiculo) -> float:
        """Obtener precio día actual del vehículo - CORREGIDO"""
        try:
            # Priorizar precio temporal asignado en vista
            if hasattr(obj, "_precio_dia_temp"):
                return float(obj._precio_dia_temp)

            # Usar precio actual como fallback
            precio = obj.precio_dia_actual
            return float(precio) if precio else 0.0

        except (AttributeError, TypeError, ValueError) as e:
            logger.warning(f"Error obteniendo precio para vehículo {obj.id}: {str(e)}")
            return 0.0


class VehiculoDetailSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    grupo = GrupoCocheSerializer(read_only=True)
    imagenes = ImagenVehiculoSerializer(many=True, read_only=True)
    precio_dia = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    imagen_principal = serializers.SerializerMethodField()

    class Meta:
        model = Vehiculo
        fields = "__all__"

    def get_imagen_principal(self, obj: Vehiculo) -> Optional[str]:
        """Obtener la URL de la imagen principal del vehículo"""
        imagen_principal = obj.imagenes.filter(portada=True).first()
        if imagen_principal and imagen_principal.imagen:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(imagen_principal.imagen.url)
            return imagen_principal.imagen.url
        return None


class VehiculoDisponibleSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    grupo = GrupoCocheSerializer(read_only=True)
    imagenes = ImagenVehiculoSerializer(many=True, read_only=True)
    precio_dia = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    imagen_principal = serializers.SerializerMethodField()

    class Meta:
        model = Vehiculo
        fields = [
            "id",
            "categoria",
            "grupo",
            "combustible",
            "marca",
            "modelo",
            "matricula",
            "anio",
            "color",
            "num_puertas",
            "num_pasajeros",
            "capacidad_maletero",
            "disponible",
            "fianza",
            "kilometraje",
            "imagenes",
            "precio_dia",
            "imagen_principal",
        ]

    def get_imagen_principal(self, obj: Vehiculo) -> Optional[str]:
        """Obtener la URL de la imagen principal del vehículo"""
        imagen_principal = obj.imagenes.filter(portada=True).first()
        if imagen_principal and imagen_principal.imagen:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(imagen_principal.imagen.url)
            return imagen_principal.imagen.url
        return None
