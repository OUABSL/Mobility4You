from rest_framework import serializers
from ..models.contenidos import Contenido

# Serializador para el modelo Contenido
class ContenidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contenido
        fields = ['id', 'tipo', 'titulo', 'subtitulo', 'cuerpo', 'icono_url', 'info_adicional', 'publicado', 'destacado', 'orden', 'created_at', 'updated_at']