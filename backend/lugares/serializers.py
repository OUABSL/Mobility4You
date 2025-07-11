# lugares/serializers.py
import logging
from typing import Optional

from rest_framework import serializers

from .models import Direccion, Lugar

logger = logging.getLogger(__name__)


class DireccionSerializer(serializers.ModelSerializer):
    """Serializer para direcciones"""

    class Meta:
        model = Direccion
        fields = ["id", "calle", "ciudad", "provincia", "pais", "codigo_postal"]

    def validate_codigo_postal(self, value):
        """Validar formato de código postal"""
        if not value or len(value.strip()) < 4:
            raise serializers.ValidationError(
                "El código postal debe tener al menos 4 caracteres"
            )
        return value.strip()


class LugarSerializer(serializers.ModelSerializer):
    """Serializer completo para lugares"""
    
    direccion = DireccionSerializer(read_only=True)
    direccion_completa = serializers.SerializerMethodField()
    coordenadas = serializers.SerializerMethodField()

    class Meta:
        model = Lugar
        fields = [
            "id",
            "nombre",
            "direccion",
            "direccion_completa",
            "latitud",
            "longitud",
            "coordenadas",
            "telefono",
            "email",
            "icono_url",
            "info_adicional",
            "activo",
            "popular",
            "created_at",
            "updated_at",
        ]

    def get_direccion_completa(self, obj: Lugar) -> str:
        """Obtener dirección completa formateada"""
        return obj.get_full_address()

    def get_coordenadas(self, obj: Lugar) -> dict:
        """Obtener coordenadas del lugar"""
        return obj.get_coordinates()


class LugarListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados de lugares"""
    
    direccion_completa = serializers.SerializerMethodField()

    class Meta:
        model = Lugar
        fields = [
            "id",
            "nombre",
            "direccion_completa",
            "telefono",
            "email",
            "activo",
            "popular",
        ]

    def get_direccion_completa(self, obj: Lugar) -> str:
        """Obtener dirección completa formateada"""
        return obj.get_full_address()


class LugarCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear lugares con dirección"""
    
    direccion = DireccionSerializer()

    class Meta:
        model = Lugar
        fields = [
            "nombre",
            "direccion",
            "latitud",
            "longitud",
            "telefono",
            "email",
            "icono_url",
            "info_adicional",
            "activo",
            "popular",
        ]

    def create(self, validated_data):
        """Crear lugar con dirección"""
        direccion_data = validated_data.pop("direccion")
        direccion = Direccion.objects.create(**direccion_data)
        lugar = Lugar.objects.create(direccion=direccion, **validated_data)
        return lugar

    def update(self, instance, validated_data):
        """Actualizar lugar y dirección"""
        direccion_data = validated_data.pop("direccion", None)
        
        if direccion_data:
            direccion_serializer = DireccionSerializer(
                instance.direccion, data=direccion_data, partial=True
            )
            if direccion_serializer.is_valid():
                direccion_serializer.save()
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance
