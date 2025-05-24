from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.contrib.auth.models import User
import phonenumbers
from .models import Categoria, GrupoCoche, Mantenimiento, Penalizacion, PoliticaIncluye, PoliticaPenalizacion, ReservaConductor, TarifaVehiculo, TipoPenalizacion, Usuario, Lugar, Vehiculo, ImagenVehiculo, PoliticaPago, Promocion, Reserva, Contenido


class RegisterUserSerializer(serializers.ModelSerializer):
    """ Añadir un usuario usando el user de django.                
    """
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=6)
    #Usamos el write_only para no devolver la contraseña en la respuesta 
    
    class Meta:
        model = get_user_model()
        fields = ['first_name', 'last_name', 'email', 'password']
        
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este email ya está registrado.")
        return value
    
    def create(self, validated_data):
        email = validated_data['email']
        user = User(
            username=email,  #usamos el email como nombre de usuario, porque django valida el campo username por defecto como un campo unique
            email=email,
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name']
        )
        user.set_password(validated_data['password'])  # guardar la contraseña en DB codificado usando set_password 
        user.save()
        return user

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'

class GrupoCocheSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrupoCoche
        fields = '__all__'

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = '__all__'
    def validate_numero_documento(self, value):
        """
        Validación genérica para DNI o documento de identidad:
        - Acepta letras y números.
        - Longitud mínima: 6, máxima: 15.
        """
        if value:
            if len(value) < 6 or len(value) > 12:
                raise serializers.ValidationError("El documento debe tener entre 6 y 15 caracteres.")
            if not value.replace('-', '').replace(' ', '').isalnum():
                raise serializers.ValidationError("El documento debe contener solo letras, números o guiones.")
        return value
    
    def validate_telefono(self, value):
        try:
            parsed = phonenumbers.parse(value, None)  # `None` = detectar automáticamente
            if not phonenumbers.is_valid_number(parsed):
                raise serializers.ValidationError("Número de teléfono inválido.")
        except phonenumbers.NumberParseException:
            raise serializers.ValidationError("Formato de teléfono no válido.")
        return value
    
class LugarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lugar
        fields = '__all__'

class VehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = '__all__'

class ImagenVehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagenVehiculo
        fields = '__all__'

class PoliticaPagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoliticaPago
        fields = '__all__'

class PromocionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promocion
        fields = '__all__'

class ReservaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reserva
        fields = '__all__'

class ContenidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contenido
        fields = '__all__'

class PenalizacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Penalizacion
        fields = '__all__'
        
        
class ReservaConductorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservaConductor
        fields = '__all__'
        
class TipoPenalizacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoPenalizacion
        fields = '__all__'
        
class PoliticaPenalizacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoliticaPenalizacion
        fields = '__all__'

class PoliticaIncluyeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoliticaIncluye
        fields = '__all__'

class TarifaVehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TarifaVehiculo
        fields = '__all__'

class MantenimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mantenimiento
        fields = '__all__'