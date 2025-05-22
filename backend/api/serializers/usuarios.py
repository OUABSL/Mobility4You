from rest_framework import serializers
from ..models.usuarios import Perfil

class PerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = Perfil
        fields = ['id', 'usuario', 'fecha_nacimiento', 'sexo', 'nacionalidad', 'tipo_documento', 'numero_documento', 'imagen_carnet', 'direccion', 'telefono', 'rol', 'idioma', 'acepta_marketing', 'verificado', 'created_at', 'updated_at']