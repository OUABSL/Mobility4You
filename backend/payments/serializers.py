from rest_framework import serializers
from .models import PagoRedsys

class RedsysPaymentSerializer(serializers.Serializer):
    """Serializer para preparar pagos con Redsys"""
    redsysParams = serializers.DictField()
    reservaData = serializers.DictField()

    def validate_redsysParams(self, value):
        required = [
            'DS_MERCHANT_AMOUNT', 'DS_MERCHANT_ORDER',
            'DS_MERCHANT_MERCHANTCODE', 'DS_MERCHANT_CURRENCY',
            'DS_MERCHANT_TRANSACTIONTYPE', 'DS_MERCHANT_TERMINAL'
        ]
        for param in required:
            if param not in value:
                raise serializers.ValidationError(f"Falta el parámetro requerido: {param}")
        return value

    def validate_reservaData(self, value):
        if 'precio_total' not in value:
            raise serializers.ValidationError("Falta el campo 'precio_total' en los datos de reserva")
        return value

class PagoRedsysSerializer(serializers.ModelSerializer):
    datos_conductor = serializers.SerializerMethodField()
    datos_vehiculo = serializers.SerializerMethodField()
    email_cliente = serializers.SerializerMethodField()
    class Meta:
        model = PagoRedsys
        fields = '__all__'
    def get_datos_conductor(self, obj):
        return obj.datos_conductor if hasattr(obj, 'datos_conductor') else {}
    def get_datos_vehiculo(self, obj):
        return obj.datos_vehiculo if hasattr(obj, 'datos_vehiculo') else {}
    def get_email_cliente(self, obj):
        return obj.obtener_email_cliente() if hasattr(obj, 'obtener_email_cliente') else ''
