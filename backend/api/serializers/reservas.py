# api/serializers/reservas.py
from rest_framework import serializers
from ..models.reservas import Reserva, ReservaExtra, ReservaConductor, Penalizacion
from ..serializers.vehiculos import VehiculoDetailSerializer
from ..serializers.lugares import LugarSerializer
from ..serializers.politicas import PoliticaPagoSerializer
from ..serializers.marketing import PromocionSerializer

class ReservaConductorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservaConductor
        fields = [
            'nombre', 'apellidos', 'email', 'telefono', 'fecha_nacimiento',
            'nacionalidad', 'tipo_documento', 'numero_documento', 'rol',
            'calle', 'ciudad', 'provincia', 'pais', 'codigo_postal'
        ]

class ReservaExtraSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservaExtra
        fields = ['id', 'nombre', 'descripcion', 'precio']

class PenalizacionSerializer(serializers.ModelSerializer):
    tipo_penalizacion_nombre = serializers.ReadOnlyField(source='tipo_penalizacion.nombre')
    
    class Meta:
        model = Penalizacion
        fields = ['id', 'tipo_penalizacion_nombre', 'importe', 'fecha', 'descripcion', 'aplicada']

class ReservaSerializer(serializers.ModelSerializer):
    vehiculo_info = serializers.SerializerMethodField()
    fechas = serializers.SerializerMethodField()
    estado_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Reserva
        fields = [
            'id', 'vehiculo_info', 'fechas', 'estado', 'estado_display',
            'precio_total'
        ]
    
    def get_vehiculo_info(self, obj):
        return f"{obj.vehiculo.marca} {obj.vehiculo.modelo}"
    
    def get_fechas(self, obj):
        return {
            'recogida': obj.fecha_recogida,
            'devolucion': obj.fecha_devolucion
        }
    
    def get_estado_display(self, obj):
        return obj.get_estado_display()

class ReservaDetailSerializer(serializers.ModelSerializer):
    vehiculo = VehiculoDetailSerializer(read_only=True)
    lugar_recogida = LugarSerializer(read_only=True)
    lugar_devolucion = LugarSerializer(read_only=True)
    politica_pago = PoliticaPagoSerializer(read_only=True)
    promocion = PromocionSerializer(read_only=True)
    conductores = ReservaConductorSerializer(many=True, read_only=True)
    extras = ReservaExtraSerializer(many=True, read_only=True)
    penalizaciones = PenalizacionSerializer(many=True, read_only=True)
    dias_alquiler = serializers.ReadOnlyField()
    importe_pendiente_total = serializers.ReadOnlyField()
    importe_pagado_total = serializers.ReadOnlyField()
    codigo_reserva = serializers.ReadOnlyField(source='generar_codigo_reserva')
    metodo_pago_inicial_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Reserva
        fields = [
            'id', 'codigo_reserva', 'vehiculo', 'lugar_recogida', 
            'lugar_devolucion', 'fecha_recogida', 'fecha_devolucion',
            'politica_pago', 'promocion', 'conductores', 'extras',
            'penalizaciones', 'estado', 'precio_dia', 'precio_base',
            'precio_extras', 'precio_impuestos', 'descuento_promocion',
            'precio_total', 'metodo_pago_inicial', 'metodo_pago_inicial_display',
            'importe_pagado_inicial', 'importe_pendiente_inicial',
            'importe_pagado_extra', 'importe_pendiente_extra',
            'importe_pendiente_total', 'importe_pagado_total',
            'dias_alquiler', 'creado', 'actualizado'
        ]
    
    def get_metodo_pago_inicial_display(self, obj):
        return obj.get_metodo_pago_inicial_display()

class ReservaCreateSerializer(serializers.ModelSerializer):
    conductores = ReservaConductorSerializer(many=True)
    extras_detalles = ReservaExtraSerializer(many=True, required=False)
    
    class Meta:
        model = Reserva
        fields = [
            'vehiculo', 'lugar_recogida', 'lugar_devolucion',
            'fecha_recogida', 'fecha_devolucion', 'politica_pago',
            'promocion', 'conductores', 'extras_detalles',
            'metodo_pago_inicial'
        ]
    
    def create(self, validated_data):
        conductores_data = validated_data.pop('conductores')
        extras_data = validated_data.pop('extras_detalles', [])
        
        # Crear reserva usando servicio
        from api.services.reservas import crear_reserva
        
        # Preparar datos completos
        datos_reserva = {
            **validated_data,
            'usuario': self.context['request'].user,
            'conductores': conductores_data,
            'extras_detalles': extras_data
        }
        
        reserva = crear_reserva(datos_reserva)
        return reserva

class ReservaUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reserva
        fields = [
            'fecha_recogida', 'fecha_devolucion',
            'lugar_recogida', 'lugar_devolucion',
            'promocion', 'estado', 'notas_internas'
        ]
    
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