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
        try:
            direccion_data = validated_data.pop("direccion")
            
            # Crear la dirección primero
            direccion = Direccion.objects.create(**direccion_data)
            
            # Luego crear el lugar con la dirección
            lugar = Lugar.objects.create(direccion=direccion, **validated_data)
            
            logger.info(f"Lugar '{lugar.nombre}' creado exitosamente con dirección {direccion.id}")
            return lugar
            
        except Exception as e:
            logger.error(f"Error al crear lugar: {str(e)}")
            # Si falla la creación del lugar, intentar limpiar la dirección creada
            if 'direccion' in locals() and direccion.pk:
                try:
                    direccion.delete()
                    logger.info(f"Dirección {direccion.id} eliminada tras error en creación de lugar")
                except:
                    pass
            raise serializers.ValidationError(f"Error al crear lugar: {str(e)}")

    def update(self, instance, validated_data):
        """Actualizar lugar y dirección"""
        try:
            direccion_data = validated_data.pop("direccion", None)
            
            if direccion_data:
                direccion_serializer = DireccionSerializer(
                    instance.direccion, data=direccion_data, partial=True
                )
                if direccion_serializer.is_valid(raise_exception=True):
                    direccion_serializer.save()
                    logger.info(f"Dirección {instance.direccion.id} actualizada")
            
            # Actualizar campos del lugar
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            
            instance.save()
            logger.info(f"Lugar {instance.id} actualizado exitosamente")
            return instance
            
        except Exception as e:
            logger.error(f"Error al actualizar lugar {instance.id}: {str(e)}")
            raise serializers.ValidationError(f"Error al actualizar lugar: {str(e)}")
