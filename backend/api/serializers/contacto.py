from rest_framework import serializers
from ..models.contacto import Contacto


class ContactoSerializer(serializers.ModelSerializer):
    """
    Serializer para crear mensajes de contacto
    """
    class Meta:
        model = Contacto
        fields = ['nombre', 'email', 'asunto', 'mensaje']
        
    def validate_nombre(self, value):
        """
        Validar que el nombre no esté vacío y tenga al menos 2 caracteres
        """
        if len(value.strip()) < 2:
            raise serializers.ValidationError("El nombre debe tener al menos 2 caracteres")
        return value.strip()
    
    def validate_asunto(self, value):
        """
        Validar que el asunto no esté vacío y tenga al menos 5 caracteres
        """
        if len(value.strip()) < 5:
            raise serializers.ValidationError("El asunto debe tener al menos 5 caracteres")
        return value.strip()
    
    def validate_mensaje(self, value):
        """
        Validar que el mensaje no esté vacío y tenga al menos 10 caracteres
        """
        if len(value.strip()) < 10:
            raise serializers.ValidationError("El mensaje debe tener al menos 10 caracteres")
        return value.strip()


class ContactoListSerializer(serializers.ModelSerializer):
    """
    Serializer para listar mensajes de contacto (para administración)
    """
    tiempo_respuesta_dias = serializers.SerializerMethodField()
    es_reciente = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Contacto
        fields = '__all__'
        
    def get_tiempo_respuesta_dias(self, obj):
        """
        Obtiene el tiempo de respuesta en días
        """
        if obj.tiempo_respuesta:
            return obj.tiempo_respuesta.days
        return None


class ContactoRespuestaSerializer(serializers.ModelSerializer):
    """
    Serializer para responder mensajes de contacto
    """
    class Meta:
        model = Contacto
        fields = ['respuesta', 'respondido_por']
        
    def update(self, instance, validated_data):
        """
        Actualiza el mensaje con la respuesta y marca como resuelto
        """
        respuesta = validated_data.get('respuesta', '')
        respondido_por = validated_data.get('respondido_por', '')
        
        instance.marcar_como_resuelto(respuesta, respondido_por)
        return instance