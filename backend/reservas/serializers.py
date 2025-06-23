# reservas/serializers.py
from lugares.models import Direccion
from lugares.serializers import LugarSerializer
from politicas.serializers import PoliticaPagoSerializer, PromocionSerializer
from rest_framework import serializers
from usuarios.models import Usuario
from vehiculos.serializers import VehiculoDetailSerializer

from .models import (Extras, Penalizacion, Reserva, ReservaConductor,
                     ReservaExtra)


class ReservaConductorSerializer(serializers.ModelSerializer):
    conductor_id = serializers.IntegerField(write_only=True)
    conductor_nombre = serializers.CharField(source="conductor.nombre", read_only=True)
    conductor_email = serializers.EmailField(source="conductor.email", read_only=True)

    class Meta:
        model = ReservaConductor
        fields = [
            "id",
            "reserva",
            "conductor_id",
            "conductor_nombre",
            "conductor_email",
            "rol",
        ]


class PenalizacionSerializer(serializers.ModelSerializer):
    tipo_penalizacion_nombre = serializers.ReadOnlyField(
        source="tipo_penalizacion.nombre"
    )

    class Meta:
        model = Penalizacion
        fields = [
            "id",
            "tipo_penalizacion",
            "tipo_penalizacion_nombre",
            "importe",
            "fecha",
            "descripcion",
        ]


class ExtrasSerializer(serializers.ModelSerializer):
    class Meta:
        model = Extras
        fields = ["id", "nombre", "descripcion", "precio", "imagen"]


class ReservaExtraSerializer(serializers.ModelSerializer):
    extra_id = serializers.IntegerField(write_only=True)
    extra_nombre = serializers.CharField(source="extra.nombre", read_only=True)
    extra_precio = serializers.DecimalField(
        source="extra.precio", max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = ReservaExtra
        fields = ["id", "extra_id", "extra_nombre", "extra_precio", "cantidad"]


class ReservaSerializer(serializers.ModelSerializer):
    extras = ReservaExtraSerializer(many=True, read_only=True)
    conductores = ReservaConductorSerializer(many=True, read_only=True)
    penalizaciones = PenalizacionSerializer(many=True, read_only=True)

    # Campos calculados
    importe_pendiente_total = serializers.SerializerMethodField()

    class Meta:
        model = Reserva
        fields = [
            "id",
            "usuario",
            "promocion",
            "politica_pago",
            "vehiculo",
            "lugar_recogida",
            "lugar_devolucion",
            "fecha_recogida",
            "fecha_devolucion",
            "estado",
            "precio_dia",
            "precio_impuestos",
            "precio_total",
            "metodo_pago",
            "importe_pagado_inicial",
            "importe_pendiente_inicial",
            "importe_pagado_extra",
            "importe_pendiente_extra",
            "importe_pendiente_total",
            "notas_internas",
            "created_at",
            "updated_at",
            "extras",
            "conductores",
            "penalizaciones",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "importe_pendiente_total"]

    def get_importe_pendiente_total(self, obj):
        """Calcula el importe pendiente total"""
        return (obj.importe_pendiente_inicial or 0) + (obj.importe_pendiente_extra or 0)


class ReservaDetailSerializer(ReservaSerializer):
    # Campos básicos de relaciones sin serializers anidados para evitar dependencias circulares
    vehiculo_marca = serializers.CharField(source="vehiculo.marca", read_only=True)
    vehiculo_modelo = serializers.CharField(source="vehiculo.modelo", read_only=True)
    vehiculo_matricula = serializers.CharField(
        source="vehiculo.matricula", read_only=True
    )

    lugar_recogida_nombre = serializers.CharField(
        source="lugar_recogida.nombre", read_only=True
    )
    lugar_devolucion_nombre = serializers.CharField(
        source="lugar_devolucion.nombre", read_only=True
    )

    politica_pago_titulo = serializers.CharField(
        source="politica_pago.titulo", read_only=True
    )
    promocion_nombre = serializers.CharField(source="promocion.nombre", read_only=True)
    usuario_nombre = serializers.CharField(source="usuario.first_name", read_only=True)
    usuario_email = serializers.EmailField(source="usuario.email", read_only=True)

    class Meta(ReservaSerializer.Meta):
        fields = ReservaSerializer.Meta.fields + [
            "vehiculo_marca",
            "vehiculo_modelo", 
            "vehiculo_matricula",
            "lugar_recogida_nombre",
            "lugar_devolucion_nombre",
            "politica_pago_titulo",
            "promocion_nombre",
            "usuario_nombre",
            "usuario_email",
        ]


class ReservaCreateSerializer(serializers.ModelSerializer):
    extras = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=False)
    conductores = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=True
    )
    usuario = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = Reserva
        fields = [
            "usuario",
            "promocion",
            "politica_pago",
            "vehiculo",
            "lugar_recogida",
            "lugar_devolucion",
            "fecha_recogida",
            "fecha_devolucion",
            "precio_dia",
            "precio_impuestos",
            "precio_total",
            "metodo_pago",
            "importe_pagado_inicial",
            "importe_pendiente_inicial",            "importe_pagado_extra",
            "importe_pendiente_extra",
            "extras",
            "conductores",
        ]

    def to_internal_value(self, data):
        """Sobreescribir para aplicar redondeo antes de la validación"""
        import logging
        logger = logging.getLogger(__name__)
        
        # Redondear campos monetarios para evitar problemas de precisión
        from decimal import ROUND_HALF_UP, Decimal
        
        def round_currency(value):
            if value is None:
                return None
            # Convertir a Decimal y redondear a 2 decimales
            decimal_value = Decimal(str(value))
            return decimal_value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # Log del valor original
        if 'precio_impuestos' in data:
            logger.info(f"ANTES redondeo - precio_impuestos: {data['precio_impuestos']} (tipo: {type(data['precio_impuestos'])})")
        
        # Aplicar redondeo a campos monetarios antes de la validación
        for field in ['precio_dia', 'precio_impuestos', 'precio_total', 
                      'importe_pagado_inicial', 'importe_pendiente_inicial',
                      'importe_pagado_extra', 'importe_pendiente_extra']:
            if field in data and data[field] is not None:
                original_value = data[field]
                rounded_value = round_currency(original_value)
                data[field] = float(rounded_value)
                if field == 'precio_impuestos':
                    logger.info(f"DESPUÉS redondeo - precio_impuestos: {data[field]} (original: {original_value})")
        
        return super().to_internal_value(data)

    def create(self, validated_data):
        extras_data = validated_data.pop("extras", [])
        conductores_data = validated_data.pop("conductores", [])

        # Verificar que tenemos datos de conductores
        if not conductores_data:
            raise serializers.ValidationError("Se requiere al menos un conductor")        # Convertir usuario_id a instancia de Usuario si viene como entero
        if isinstance(validated_data.get("usuario"), int):
            try:
                validated_data["usuario"] = Usuario.objects.get(id=validated_data["usuario"])
            except Usuario.DoesNotExist:
                raise serializers.ValidationError("Usuario no encontrado")

        # Calcular importes según método de pago
        if validated_data.get("metodo_pago") == "tarjeta":
            validated_data["importe_pagado_inicial"] = validated_data.get(
                "precio_total", 0
            )
            validated_data["importe_pendiente_inicial"] = 0
        else:  # efectivo
            validated_data["importe_pagado_inicial"] = 0
            validated_data["importe_pendiente_inicial"] = validated_data.get(
                "precio_total", 0
            )

        # Crear o asignar usuario principal desde el conductor principal
        if not validated_data.get("usuario"):
            conductor_principal = self._find_conductor_principal(conductores_data)
            if conductor_principal:
                usuario_principal = self._create_or_get_usuario(conductor_principal)
                validated_data["usuario"] = usuario_principal
            else:
                raise serializers.ValidationError("No se encontró conductor principal para crear usuario")

        # Establecer estado por defecto
        if not validated_data.get("estado"):
            validated_data["estado"] = "pendiente"

        reserva = Reserva.objects.create(**validated_data)

        # Crear extras
        for extra in extras_data:
            ReservaExtra.objects.create(
                reserva=reserva,
                extra_id=extra["extra_id"],
                cantidad=extra.get("cantidad", 1),
            )

        # Crear conductores
        for conductor_data in conductores_data:
            conductor_usuario = self._create_or_get_usuario(conductor_data)
            ReservaConductor.objects.create(
                reserva=reserva,
                conductor=conductor_usuario,
                rol=conductor_data.get("rol", "principal"),
            )

        return reserva

    def _find_conductor_principal(self, conductores_data):
        """Encuentra el conductor principal en los datos"""
        for conductor in conductores_data:
            if conductor.get("rol") == "principal":
                return conductor
        # Si no hay rol especificado, tomar el primero
        return conductores_data[0] if conductores_data else None

    def _create_or_get_usuario(self, conductor_data):
        """Crea o obtiene un usuario basado en los datos del conductor"""
        from lugares.models import Direccion
        
        email = conductor_data.get("email")
        numero_documento = conductor_data.get("numero_documento")
        
        # Buscar usuario existente por email o documento
        usuario = None
        if email:
            usuario = Usuario.objects.filter(email=email).first()
        
        if not usuario and numero_documento:
            usuario = Usuario.objects.filter(numero_documento=numero_documento).first()
            
        # Si no existe, crear nuevo usuario
        if not usuario:
            usuario_data = {
                "username": self._generate_username(conductor_data),
                "email": email or "",
                "first_name": conductor_data.get("nombre", ""),
                "last_name": conductor_data.get("apellidos", ""),
                "fecha_nacimiento": conductor_data.get("fecha_nacimiento"),
                "sexo": conductor_data.get("sexo", "no_indicado"),
                "nacionalidad": conductor_data.get("nacionalidad", ""),
                "tipo_documento": conductor_data.get("tipo_documento", "dni"),
                "numero_documento": numero_documento or "",
                "telefono": conductor_data.get("telefono", ""),
                "rol": "cliente",  # Por defecto cliente
                "is_active": True,
            }
            
            # Crear dirección si existe
            direccion_data = conductor_data.get("direccion")
            if direccion_data:
                direccion = Direccion.objects.create(
                    calle=direccion_data.get("calle", ""),
                    ciudad=direccion_data.get("ciudad", ""),
                    provincia=direccion_data.get("provincia", ""),
                    pais=direccion_data.get("pais", "España"),
                    codigo_postal=direccion_data.get("codigo_postal", ""),
                )
                usuario_data["direccion"] = direccion
            
            usuario = Usuario.objects.create(**usuario_data)
            
        return usuario

    def _generate_username(self, conductor_data):
        """Genera un username único basado en los datos del conductor"""
        base_username = f"{conductor_data.get('nombre', 'user')}_{conductor_data.get('numero_documento', '')}"
        base_username = base_username.lower().replace(" ", "_")
        
        from usuarios.models import Usuario
        counter = 1
        username = base_username
        
        while Usuario.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1
            
        return username


class ReservaUpdateSerializer(serializers.ModelSerializer):
    extras = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=False
    )

    class Meta:
        model = Reserva
        fields = "__all__"

    def update(self, instance, validated_data):
        extras_data = validated_data.pop("extras", None)
        
        # Redondear campos monetarios para evitar problemas de precisión
        from decimal import ROUND_HALF_UP, Decimal
        
        def round_currency(value):
            if value is None:
                return None
            # Convertir a Decimal y redondear a 2 decimales
            decimal_value = Decimal(str(value))
            return decimal_value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # Aplicar redondeo a campos monetarios
        for field in ['precio_dia', 'precio_impuestos', 'precio_total', 
                      'importe_pagado_inicial', 'importe_pendiente_inicial',
                      'importe_pagado_extra', 'importe_pendiente_extra']:
            if field in validated_data:
                validated_data[field] = round_currency(validated_data[field])
        
        instance = super().update(instance, validated_data)
        if extras_data is not None:
            instance.extras.all().delete()
            for extra in extras_data:
                ReservaExtra.objects.create(
                    reserva=instance,
                    extra_id=extra["extra_id"],
                    cantidad=extra.get("cantidad", 1),
                )
        return instance
