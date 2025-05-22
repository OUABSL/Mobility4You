# api/serializers/reservas.py
from rest_framework import serializers
from ..models.reservas import Reserva, ReservaExtra, ReservaConductor, Penalizacion
from ..serializers.vehiculos import VehiculoDetailSerializer
from ..serializers.lugares import LugarSerializer
from ..serializers.politicasPago import PoliticaPagoSerializer
from .promociones import PromocionSerializer

class ReservaExtraSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservaExtra
        fields = ['id', 'nombre', 'descripcion', 'precio', 'created_at', 'updated_at']

    def validate_precio(self, value):
        if value < 0:
            raise serializers.ValidationError("El precio del extra no puede ser negativo.")
        return value

class ReservaConductorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservaConductor
        fields = [
            'id', 'reserva', 'nombre', 'apellidos', 'email', 'telefono', 'fecha_nacimiento',
            'nacionalidad', 'tipo_documento', 'numero_documento', 'rol',
            'calle', 'ciudad', 'provincia', 'pais', 'codigo_postal',
            'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'email': {'validators': []},  # Permitir emails repetidos en diferentes reservas
        }

    def validate_email(self, value):
        if not value or '@' not in value:
            raise serializers.ValidationError("Debe proporcionar un email válido para el conductor.")
        return value

class PenalizacionSerializer(serializers.ModelSerializer):
    tipo_penalizacion_nombre = serializers.ReadOnlyField(source='tipo_penalizacion.nombre')
    class Meta:
        model = Penalizacion
        fields = [
            'id', 'reserva', 'tipo_penalizacion', 'tipo_penalizacion_nombre',
            'importe', 'fecha', 'descripcion', 'created_at', 'updated_at'
        ]

    def validate_importe(self, value):
        if value < 0:
            raise serializers.ValidationError("El importe de la penalización no puede ser negativo.")
        return value

class ReservaSerializer(serializers.ModelSerializer):
    vehiculo = VehiculoDetailSerializer(read_only=True)
    lugar_recogida = LugarSerializer(read_only=True)
    lugar_devolucion = LugarSerializer(read_only=True)
    politica_pago = PoliticaPagoSerializer(read_only=True)
    promocion = PromocionSerializer(read_only=True)
    extras = ReservaExtraSerializer(many=True, read_only=True)
    conductores = ReservaConductorSerializer(many=True, read_only=True)
    penalizaciones = PenalizacionSerializer(many=True, read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    metodo_pago_inicial_display = serializers.CharField(source='get_metodo_pago_inicial_display', read_only=True)
    dias_alquiler = serializers.SerializerMethodField()
    importe_pendiente_total = serializers.SerializerMethodField()
    importe_pagado_total = serializers.SerializerMethodField()
    codigo_reserva = serializers.ReadOnlyField(source='generar_codigo_reserva')

    class Meta:
        model = Reserva
        fields = [
            'id', 'usuario', 'vehiculo', 'lugar_recogida', 'lugar_devolucion',
            'politica_pago', 'promocion', 'fecha_recogida', 'fecha_devolucion',
            'precio_dia', 'precio_base', 'precio_extras', 'precio_impuestos',
            'descuento_promocion', 'precio_total', 'metodo_pago_inicial',
            'importe_pagado_inicial', 'importe_pendiente_inicial',
            'importe_pagado_extra', 'importe_pendiente_extra', 'estado',
            'estado_display', 'notas_internas', 'referencia_externa',
            'created_at', 'updated_at', 'extras', 'conductores', 'penalizaciones',
            'dias_alquiler', 'importe_pendiente_total', 'importe_pagado_total',
            'codigo_reserva', 'metodo_pago_inicial_display'
        ]

    def get_dias_alquiler(self, obj):
        return obj.dias_alquiler() if hasattr(obj, 'dias_alquiler') else None

    def get_importe_pendiente_total(self, obj):
        return obj.importe_pendiente_total() if hasattr(obj, 'importe_pendiente_total') else None

    def get_importe_pagado_total(self, obj):
        return obj.importe_pagado_total() if hasattr(obj, 'importe_pagado_total') else None

class ReservaDetailSerializer(ReservaSerializer):
    class Meta(ReservaSerializer.Meta):
        fields = ReservaSerializer.Meta.fields

class ReservaCreateSerializer(serializers.ModelSerializer):
    extras_detalles = ReservaExtraSerializer(many=True, required=False)
    conductores = ReservaConductorSerializer(many=True)

    class Meta:
        model = Reserva
        fields = [
            'vehiculo', 'usuario', 'lugar_recogida', 'lugar_devolucion',
            'politica_pago', 'promocion', 'fecha_recogida', 'fecha_devolucion',
            'metodo_pago_inicial', 'notas_internas', 'referencia_externa',
            'extras_detalles', 'conductores'
        ]

    def create(self, validated_data):
        extras_data = validated_data.pop('extras_detalles', [])
        conductores_data = validated_data.pop('conductores', [])
        reserva = Reserva.objects.create(**validated_data)
        for extra in extras_data:
            ReservaExtra.objects.create(reserva=reserva, **extra)
        for conductor in conductores_data:
            ReservaConductor.objects.create(reserva=reserva, **conductor)
        return reserva

class ReservaUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reserva
        fields = '__all__'

    def update(self, instance, validated_data):
        # Verificar si hay cambios en fechas
        hay_cambio_fechas = (
            'fecha_recogida' in validated_data or 
            'fecha_devolucion' in validated_data
        )
        
        # Actualizar campos
        for key, value in validated_data.items():
            setattr(instance, key, value)
        
        # Si hay cambios en fechas, recalcular precios
        if hay_cambio_fechas:
            instance.calcular_precios()
        
        instance.save()
        return instance