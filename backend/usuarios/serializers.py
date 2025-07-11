# usuarios/serializers.py
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Usuario


class DireccionSimpleSerializer(serializers.ModelSerializer):
    """Serializer simple para direcciones - Importado desde lugares"""

    class Meta:
        model = "lugares.Direccion"  # Sera una string reference
        fields = ["id", "calle", "ciudad", "provincia", "pais", "codigo_postal"]


class AdminUsuarioCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear usuarios admin - Solo username, email, contraseña"""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = Usuario
        fields = [
            "username",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
        ]
        extra_kwargs = {
            "username": {"required": True},
            "email": {"required": True},
            "first_name": {"required": False},
            "last_name": {"required": False},
        }

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError("Las contraseñas no coinciden")
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")

        # Crear usuario admin
        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.is_staff = True
        usuario.is_superuser = True
        usuario.is_active = True
        usuario.rol = None  # Admin no necesita rol específico
        usuario.save()
        return usuario


class ClienteUsuarioCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear usuarios cliente - Sin username ni contraseña"""

    direccion_data = serializers.DictField(write_only=True, required=False)

    class Meta:
        model = Usuario
        fields = [
            "email",
            "first_name",
            "last_name",
            "fecha_nacimiento",
            "sexo",
            "nacionalidad",
            "tipo_documento",
            "numero_documento",
            "telefono",
            "acepta_recibir_ofertas",
            "direccion_data",
        ]
        extra_kwargs = {
            "email": {"required": True},
            "first_name": {"required": True},
            "last_name": {"required": True},
        }

    def create(self, validated_data):
        from lugares.models import Direccion

        direccion_data = validated_data.pop("direccion_data", None)

        # Crear dirección si se proporciona
        if direccion_data:
            direccion = Direccion.objects.create(**direccion_data)
            validated_data["direccion"] = direccion

        # Generar username único basado en email
        email = validated_data["email"]
        username = email.split("@")[0]
        counter = 1
        original_username = username
        while Usuario.objects.filter(username=username).exists():
            username = f"{original_username}{counter}"
            counter += 1

        # Crear usuario cliente
        usuario = Usuario(**validated_data)
        usuario.username = username
        usuario.set_unusable_password()  # Sin contraseña
        usuario.rol = "cliente"
        usuario.is_active = True
        usuario.registrado = True
        usuario.save()
        return usuario


class EmpresaUsuarioCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear usuarios empresa - Con contraseña pero sin username"""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    direccion_data = serializers.DictField(write_only=True, required=False)

    class Meta:
        model = Usuario
        fields = [
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "fecha_nacimiento",
            "sexo",
            "nacionalidad",
            "tipo_documento",
            "numero_documento",
            "telefono",
            "acepta_recibir_ofertas",            "direccion_data",
        ]
        extra_kwargs = {
            "email": {"required": True},
            "first_name": {"required": True},
            "last_name": {"required": True},
        }

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError("Las contraseñas no coinciden")
        return attrs

    def create(self, validated_data):
        from lugares.models import Direccion

        direccion_data = validated_data.pop("direccion_data", None)
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")

        # Crear dirección si se proporciona
        if direccion_data:
            direccion = Direccion.objects.create(**direccion_data)
            validated_data["direccion"] = direccion

        # Generar username único basado en email
        email = validated_data["email"]
        username = email.split("@")[0]
        counter = 1
        original_username = username
        while Usuario.objects.filter(username=username).exists():
            username = f"{original_username}{counter}"
            counter += 1

        # Crear usuario empresa
        usuario = Usuario(**validated_data)
        usuario.username = username
        usuario.set_password(password)
        usuario.rol = "empresa"
        usuario.is_staff = True  # Puede acceder al admin
        usuario.is_active = True
        usuario.registrado = True
        usuario.save()
        return usuario


class UsuarioSerializer(serializers.ModelSerializer):
    """Serializer de lectura para usuarios"""

    direccion = DireccionSimpleSerializer(read_only=True)
    nombre_completo = serializers.SerializerMethodField()
    edad = serializers.SerializerMethodField()
    tipo_usuario = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "fecha_nacimiento",
            "sexo",
            "nacionalidad",
            "tipo_documento",
            "numero_documento",
            "imagen_carnet",
            "direccion",
            "telefono",
            "rol",
            "idioma",
            "activo",
            "acepta_recibir_ofertas",
            "registrado",
            "verificado",
            "nombre_completo",
            "edad",
            "tipo_usuario",
            "created_at",
            "updated_at",
            "is_staff",
            "is_superuser",
        ]
        read_only_fields = [
            "id",
            "username",
            "created_at",
            "updated_at",
            "nombre_completo",
            "edad",
            "tipo_usuario",
        ]

    def get_nombre_completo(self, obj):
        return obj.get_full_name()

    def get_edad(self, obj):
        return obj.edad()

    def get_tipo_usuario(self, obj):
        if obj.is_admin_user():
            return "admin"
        elif obj.is_business_user():
            return "empresa"
        elif obj.is_client_user():
            return "cliente"
        return "indefinido"


class ConductorSerializer(serializers.ModelSerializer):
    """Serializer simplificado para conductores en reservas"""

    class Meta:
        model = Usuario
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "fecha_nacimiento",
            "tipo_documento",
            "numero_documento",
            "telefono",
        ]
        read_only_fields = ["id"]


# Mantener compatibilidad con código existente
UsuarioCreateSerializer = ClienteUsuarioCreateSerializer
