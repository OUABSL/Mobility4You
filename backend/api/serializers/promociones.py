from rest_framework import serializers
from ..models.promociones import Promocion

class PromocionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promocion
        fields = [
            'id', 'nombre', 'descripcion', 'descuento_pct', 'fecha_inicio',
            'fecha_fin', 'activo', 'created_at', 'updated_at'
        ]

