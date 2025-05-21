from rest_framework import serializers
from ..models.marketing import Promocion, Contenido

class PromocionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promocion
        fields = [
            'id', 'nombre', 'descripcion', 'codigo',
            'descuento_pct', 'fecha_inicio', 'fecha_fin'
        ]

class ContenidoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Contenido
        fields = [
            'id', 'tipo', 'tipo_display', 'titulo', 'subtitulo',
            'cuerpo', 'icono_url', 'info_adicional', 'destacado', 'orden'
        ]
    
    def get_tipo_display(self, obj):
        return obj.get_tipo_display()