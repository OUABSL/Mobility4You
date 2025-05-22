from rest_framework import serializers
from ..models.promociones import Promocion

class PromocionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promocion
        fields = ['id', 'nombre', 'descripcion', 'codigo', 'descuento_pct', 'fecha_inicio', 'fecha_fin', 'activo', 'limitada', 'limite_usos', 'usos_actuales', 'created_at', 'updated_at']

