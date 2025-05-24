from rest_framework import serializers
from ..models.usuarios import Usuario
from ..models.lugares import Direccion

# 2. Agregar nuevo serializer para direcciones
class DireccionSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Direccion
        fields = ['id', 'calle', 'ciudad', 'provincia', 'pais', 'codigo_postal']

# 3. Actualizar UsuarioSerializer completamente
class UsuarioSerializer(serializers.ModelSerializer):
    direccion = DireccionSimpleSerializer(read_only=True)
    direccion_id = serializers.PrimaryKeyRelatedField(
        queryset=Direccion.objects.all(), 
        source='direccion', 
        write_only=True,
        required=False
    )
    nombre_completo = serializers.SerializerMethodField()
    edad = serializers.SerializerMethodField()
    
    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'fecha_nacimiento', 'sexo', 'nacionalidad', 'tipo_documento', 
            'numero_documento', 'imagen_carnet', 'direccion', 'direccion_id',
            'telefono', 'rol', 'idioma', 'activo', 'acepta_recibir_ofertas',
            'registrado', 'verificado', 'nombre_completo', 'edad',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'nombre_completo', 'edad']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'imagen_carnet': {'required': False}
        }
    
    def get_nombre_completo(self, obj):
        return obj.get_full_name()
    
    def get_edad(self, obj):
        return obj.edad()

# 4. Agregar UsuarioCreateSerializer
class UsuarioCreateSerializer(serializers.ModelSerializer):
    direccion_data = serializers.DictField(write_only=True, required=False)
    
    class Meta:
        model = Usuario
        fields = [
            'username', 'email', 'password', 'first_name', 'last_name',
            'fecha_nacimiento', 'sexo', 'nacionalidad', 'tipo_documento',
            'numero_documento', 'telefono', 'rol', 'idioma', 
            'acepta_recibir_ofertas', 'direccion_data'
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'username': {'required': True}
        }
    
    def create(self, validated_data):
        direccion_data = validated_data.pop('direccion_data', None)
        password = validated_data.pop('password', None)
        
        # Crear dirección si se proporciona
        if direccion_data:
            direccion = Direccion.objects.create(**direccion_data)
            validated_data['direccion'] = direccion
        
        # Crear usuario
        usuario = Usuario(**validated_data)
        
        # Establecer contraseña si se proporciona
        if password:
            usuario.set_password(password)
        else:
            # Para usuarios sin login (clientes que no se registran)
            usuario.set_unusable_password()
        
        usuario.save()
        return usuario

# 5. Agregar ConductorSerializer
class ConductorSerializer(serializers.ModelSerializer):
    """Serializer simplificado para conductores en reservas"""
    class Meta:
        model = Usuario
        fields = [
            'id', 'first_name', 'last_name', 'email', 'fecha_nacimiento',
            'tipo_documento', 'numero_documento', 'telefono'
        ]
        read_only_fields = ['id']