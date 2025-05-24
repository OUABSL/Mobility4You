# api/serializers/reservas.py
from rest_framework import serializers
from ..models.reservas import Reserva, ReservaConductor, Penalizacion, ReservaExtra, Extras
from ..serializers.vehiculos import VehiculoDetailSerializer
from ..serializers.lugares import LugarSerializer
from ..serializers.politicasPago import PoliticaPagoSerializer
from ..models.usuarios import Usuario
from .usuarios import UsuarioSerializer
from .promociones import PromocionSerializer

class ReservaConductorSerializer(serializers.ModelSerializer):
    conductor = UsuarioSerializer(read_only=True)
    conductor_id = serializers.PrimaryKeyRelatedField(queryset=Usuario.objects.all(), source='conductor', write_only=True)
    
    class Meta:
        model = ReservaConductor
        fields = ['id', 'reserva', 'conductor', 'conductor_id', 'rol']
        
class PenalizacionSerializer(serializers.ModelSerializer):
    tipo_penalizacion_nombre = serializers.ReadOnlyField(source='tipo_penalizacion.nombre')
    
    class Meta:
        model = Penalizacion
        fields = ['id', 'tipo_penalizacion', 'tipo_penalizacion_nombre', 'importe', 'fecha', 'descripcion']

class ExtrasSerializer(serializers.ModelSerializer):
    class Meta:
        model = Extras
        fields = ['id', 'nombre', 'descripcion', 'precio', 'imagen']

class ReservaExtraSerializer(serializers.ModelSerializer):
    extra = ExtrasSerializer(read_only=True)
    extra_id = serializers.PrimaryKeyRelatedField(queryset=Extras.objects.all(), source='extra', write_only=True)
    class Meta:
        model = ReservaExtra
        fields = ['id', 'extra', 'extra_id', 'cantidad']

class ReservaSerializer(serializers.ModelSerializer):
    extras = ReservaExtraSerializer(many=True, read_only=True)
    conductores = ReservaConductorSerializer(many=True, read_only=True)
    penalizaciones = PenalizacionSerializer(many=True, read_only=True)
    
    # Campos calculados
    importe_pendiente_total = serializers.SerializerMethodField()
    
    class Meta:
        model = Reserva
        fields = [
            'id', 'usuario', 'promocion', 'politica_pago', 'vehiculo',
            'lugar_recogida', 'lugar_devolucion', 'fecha_recogida', 'fecha_devolucion',
            'estado', 'precio_dia', 'precio_impuestos', 'precio_total',
            'metodo_pago', 'importe_pagado_inicial', 'importe_pendiente_inicial',
            'importe_pagado_extra', 'importe_pendiente_extra', 'importe_pendiente_total',
            'notas_internas', 'created_at', 'updated_at',
            'extras', 'conductores', 'penalizaciones'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'importe_pendiente_total']
    
    def get_importe_pendiente_total(self, obj):
        """Calcula el importe pendiente total"""
        return (obj.importe_pendiente_inicial or 0) + (obj.importe_pendiente_extra or 0)

class ReservaDetailSerializer(ReservaSerializer):
    vehiculo = VehiculoDetailSerializer(read_only=True)
    lugar_recogida = LugarSerializer(read_only=True)
    lugar_devolucion = LugarSerializer(read_only=True)
    politica_pago = PoliticaPagoSerializer(read_only=True)
    promocion = PromocionSerializer(read_only=True)
    usuario = UsuarioSerializer(read_only=True)

class ReservaCreateSerializer(serializers.ModelSerializer):
    extras = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)
    conductores = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)
    
    class Meta:
        model = Reserva
        fields = [
            'usuario', 'promocion', 'politica_pago', 'vehiculo',
            'lugar_recogida', 'lugar_devolucion', 'fecha_recogida', 'fecha_devolucion',
            'precio_dia', 'precio_impuestos', 'precio_total',
            'metodo_pago', 'importe_pagado_inicial', 'importe_pendiente_inicial',
            'importe_pagado_extra', 'importe_pendiente_extra',
            'extras', 'conductores'
        ]

    def create(self, validated_data):
        extras_data = validated_data.pop('extras', [])
        conductores_data = validated_data.pop('conductores', [])
        
        # Calcular importes según método de pago
        if validated_data.get('metodo_pago') == 'tarjeta':
            validated_data['importe_pagado_inicial'] = validated_data.get('precio_total', 0)
            validated_data['importe_pendiente_inicial'] = 0
        else:  # efectivo
            validated_data['importe_pagado_inicial'] = 0
            validated_data['importe_pendiente_inicial'] = validated_data.get('precio_total', 0)
        
        reserva = Reserva.objects.create(**validated_data)
        
        # Crear extras
        for extra in extras_data:
            ReservaExtra.objects.create(
                reserva=reserva,
                extra_id=extra['extra_id'],
                cantidad=extra.get('cantidad', 1)
            )
        
        # Crear conductores
        for conductor in conductores_data:
            ReservaConductor.objects.create(
                reserva=reserva,
                conductor_id=conductor['conductor_id'],
                rol=conductor.get('rol', 'principal')
            )
        
        return reserva

class ReservaUpdateSerializer(serializers.ModelSerializer):
    extras = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)
    class Meta:
        model = Reserva
        fields = '__all__'

    def update(self, instance, validated_data):
        extras_data = validated_data.pop('extras', None)
        instance = super().update(instance, validated_data)
        if extras_data is not None:
            instance.extras.all().delete()
            for extra in extras_data:
                ReservaExtra.objects.create(
                    reserva=instance,
                    extra_id=extra['extra_id'],
                    cantidad=extra.get('cantidad', 1)
                )
        return instance