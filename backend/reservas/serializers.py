# reservas/serializers.py
import logging

from django.conf import settings
from lugares.models import Direccion
from lugares.serializers import LugarSerializer
from politicas.serializers import PoliticaPagoSerializer, PromocionSerializer
from rest_framework import serializers
from usuarios.models import Usuario
from vehiculos.serializers import VehiculoDetailSerializer

from .models import (Extras, Penalizacion, Reserva, ReservaConductor,
                     ReservaExtra)

logger = logging.getLogger(__name__)


class ReservaConductorSerializer(serializers.ModelSerializer):
    conductor_detail = serializers.SerializerMethodField()

    class Meta:
        model = ReservaConductor
        fields = ['id', 'rol', 'conductor_detail']
    
    def get_conductor_detail(self, obj):
        """✅ SIN QUERY ADICIONAL: Conductor ya cargado con prefetch_related"""
        if not obj.conductor:
            return None
            
        conductor = obj.conductor
        
        # Formatear datos completos del conductor
        conductor_data = {
            "id": conductor.id,
            "nombre": conductor.first_name or "",
            "apellidos": conductor.last_name or "",
            "apellido": conductor.last_name or "",  # Alias para compatibilidad
            "email": conductor.email or "",
            "telefono": conductor.telefono or "",
            "documento": conductor.numero_documento or "",
            "numero_documento": conductor.numero_documento or "",  # Alias para compatibilidad
            "tipo_documento": conductor.tipo_documento or "",
            "nacionalidad": conductor.nacionalidad or "",
            "fecha_nacimiento": conductor.fecha_nacimiento.isoformat() if conductor.fecha_nacimiento else None,
            "sexo": conductor.sexo or "",
        }
        
        # Incluir datos de dirección si existe
        if conductor.direccion:
            conductor_data["direccion"] = {
                "calle": conductor.direccion.calle or "",
                "ciudad": conductor.direccion.ciudad or "",
                "provincia": conductor.direccion.provincia or "",
                "codigo_postal": conductor.direccion.codigo_postal or "",
                "pais": conductor.direccion.pais or "",
            }
        else:
            conductor_data["direccion"] = None
            
        return conductor_data


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
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = Extras
        fields = ["id", "nombre", "descripcion", "precio", "imagen", "imagen_url"]

    def get_imagen_url(self, obj):
        """Obtener URL absoluta de la imagen del extra"""
        if obj.imagen:
            from django.conf import settings
            
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.imagen.url)
            else:
                # Fallback cuando no hay request
                base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
                return f"{base_url}{obj.imagen.url}"
        return None


class ReservaExtraSerializer(serializers.ModelSerializer):
    extra_id = serializers.IntegerField(source="extra.id", read_only=True)
    extra_nombre = serializers.CharField(source="extra.nombre", read_only=True)
    extra_precio = serializers.DecimalField(
        source="extra.precio", max_digits=10, decimal_places=2, read_only=True
    )
    extra_imagen = serializers.SerializerMethodField()
    extra_descripcion = serializers.CharField(source="extra.descripcion", read_only=True)

    class Meta:
        model = ReservaExtra
        fields = [
            "id", 
            "extra_id", 
            "extra_nombre", 
            "extra_precio", 
            "extra_imagen", 
            "extra_descripcion",
            "cantidad"
        ]

    def get_extra_imagen(self, obj):
        """Obtener URL absoluta de la imagen del extra"""
        if obj.extra and obj.extra.imagen:
            from django.conf import settings
            
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.extra.imagen.url)
            else:
                # Fallback cuando no hay request
                base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
                return f"{base_url}{obj.extra.imagen.url}"
        return None


class ReservaSerializer(serializers.ModelSerializer):
    # Campos básicos del vehículo para listados (evitar joins innecesarios)
    vehiculo_marca = serializers.CharField(source='vehiculo.marca', read_only=True)
    vehiculo_modelo = serializers.CharField(source='vehiculo.modelo', read_only=True)
    vehiculo_categoria = serializers.CharField(source='vehiculo.categoria.nombre', read_only=True)
    
    # Campos básicos de ubicaciones para listados
    lugar_recogida_nombre = serializers.CharField(source='lugar_recogida.nombre', read_only=True)
    lugar_devolucion_nombre = serializers.CharField(source='lugar_devolucion.nombre', read_only=True)
    
    # Datos básicos del usuario para listados
    usuario_email = serializers.CharField(source='usuario.email', read_only=True)
    usuario_nombre_completo = serializers.SerializerMethodField()
    
    # Política de pago básica
    politica_pago_titulo = serializers.CharField(source='politica_pago.titulo', read_only=True)
    
    # Contadores optimizados usando prefetch_related
    total_extras = serializers.SerializerMethodField()
    conductores_count = serializers.SerializerMethodField()
    
    # IVA simbólico para mostrar al cliente
    iva_display = serializers.SerializerMethodField()
    iva_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Reserva
        fields = [
            'id', 'numero_reserva', 'estado', 'metodo_pago',
            'fecha_recogida', 'fecha_devolucion', 'precio_total',
            'created_at', 'updated_at',
            'vehiculo_marca', 'vehiculo_modelo', 'vehiculo_categoria',
            'lugar_recogida_nombre', 'lugar_devolucion_nombre',
            'usuario_email', 'usuario_nombre_completo',
            'politica_pago_titulo',
            'total_extras', 'conductores_count',
            'iva_display', 'iva_percentage'
        ]
    
    def get_usuario_nombre_completo(self, obj):
        """Nombre completo del usuario titular"""
        if obj.usuario:
            return f"{obj.usuario.first_name} {obj.usuario.last_name}".strip()
        return ""
    
    def get_total_extras(self, obj):
        """Cantidad total de extras contratados"""
        return obj.extras.count()

    def get_conductores_count(self, obj):
        """Cantidad de conductores registrados"""
        return obj.conductores.count()
    
    def get_iva_display(self, obj):
        """IVA simbólico para mostrar al cliente (ya incluido en precios)"""
        return float(obj.get_iva_display())
    
    def get_iva_percentage(self, obj):
        """Porcentaje de IVA configurado"""
        from django.conf import settings
        return getattr(settings, 'IVA_PERCENTAGE', 0.10)



class ReservaDetailSerializer(ReservaSerializer):
    vehiculo_detail = VehiculoDetailSerializer(source='vehiculo', read_only=True)
    lugar_recogida_detail = LugarSerializer(source='lugar_recogida', read_only=True)
    lugar_devolucion_detail = LugarSerializer(source='lugar_devolucion', read_only=True)
    politica_pago_detail = PoliticaPagoSerializer(source='politica_pago', read_only=True)
    
    # Usuario/titular de la reserva - solo incluir datos básicos
    usuario_detail = serializers.SerializerMethodField()
    
    # Relaciones optimizadas
    extras_detail = ReservaExtraSerializer(source='extras', many=True, read_only=True)
    conductores_detail = ReservaConductorSerializer(source='conductores', many=True, read_only=True)
    penalizaciones_detail = PenalizacionSerializer(source='penalizaciones', many=True, read_only=True)
    
    # Campos de desglose de precios para la vista de éxito
    precio_base = serializers.SerializerMethodField()
    precio_extras = serializers.SerializerMethodField()
    tarifa_politica = serializers.SerializerMethodField()
    importe_pagado_inicial = serializers.SerializerMethodField()
    importe_pendiente_inicial = serializers.SerializerMethodField()
    
    # Campos optimizados para el frontend
    dias_alquiler = serializers.SerializerMethodField()

    class Meta(ReservaSerializer.Meta):
        fields = ReservaSerializer.Meta.fields + [
            'vehiculo_detail', 'lugar_recogida_detail', 'lugar_devolucion_detail',
            'politica_pago_detail', 'usuario_detail', 'extras_detail', 'conductores_detail',
            'penalizaciones_detail', 'notas_internas',
            'precio_base', 'precio_extras', 'tarifa_politica',
            'importe_pagado_inicial', 'importe_pendiente_inicial', 'dias_alquiler'
        ]
    
    def get_usuario_detail(self, obj):
        """Datos básicos del usuario titular de la reserva"""
        if not obj.usuario:
            return None
        
        usuario = obj.usuario
        return {
            "id": usuario.id,
            "nombre": usuario.first_name or "",
            "apellidos": usuario.last_name or "",
            "email": usuario.email or "",
            "telefono": usuario.telefono or "",
            "documento": usuario.numero_documento or "",
            "tipo_documento": usuario.tipo_documento or "",
            "nacionalidad": usuario.nacionalidad or "",
        }
    
    def get_dias_alquiler(self, obj):
        """Calcular días de alquiler"""
        if obj.fecha_recogida and obj.fecha_devolucion:
            dias = (obj.fecha_devolucion.date() - obj.fecha_recogida.date()).days
            return max(dias, 1)  # Mínimo 1 día
        return 1
    
    def get_precio_base(self, obj):
        """Precio del vehículo (ya incluye IVA)"""
        if obj.vehiculo and obj.fecha_recogida and obj.fecha_devolucion:
            dias = self.get_dias_alquiler(obj)
            precio_dia = obj.vehiculo.precio_dia_actual or 0
            return float(precio_dia * dias)
        return 0.0
    
    def get_precio_extras(self, obj):
        """Precio total de extras (ya incluye IVA)"""
        from decimal import Decimal
        total_extras = Decimal('0.00')
        dias = self.get_dias_alquiler(obj)
        for reserva_extra in obj.extras.all():
            if reserva_extra.extra and reserva_extra.extra.precio:
                total_extras += reserva_extra.extra.precio * reserva_extra.cantidad * dias
        return float(total_extras)
    
    def get_tarifa_politica(self, obj):
        """Tarifa de la política de pago (ya incluye IVA)"""
        if obj.politica_pago and obj.fecha_recogida and obj.fecha_devolucion:
            dias = self.get_dias_alquiler(obj)
            if obj.politica_pago.tarifa:
                return float(obj.politica_pago.tarifa * dias)
        return 0.0
    
    def get_importe_pagado_inicial(self, obj):
        """Importe pagado inicial (implementar según lógica de pagos)"""
        # Por ahora retornamos el precio total ya que se paga todo inicial
        return float(obj.precio_total or 0)
    
    def get_importe_pendiente_inicial(self, obj):
        """Importe pendiente inicial (implementar según lógica de pagos)"""
        # Por ahora retornamos 0 ya que se paga todo inicial
        return 0.0


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
            "iva",
            "precio_total",
            "metodo_pago",
            "importe_pagado_inicial",
            "importe_pendiente_inicial",
            "importe_pagado_extra",
            "importe_pendiente_extra",
            "extras",
            "conductores",
        ]

    def to_internal_value(self, data):
        """Sobreescribir para aplicar redondeo antes de la validación"""
        import logging
        logger = logging.getLogger(__name__)
        
        # Log de datos recibidos para debugging
        logger.info(f"🔍 Datos recibidos en serializer: {data}")
        
        # Redondear campos monetarios para evitar problemas de precisión
        from decimal import ROUND_HALF_UP, Decimal
        
        def round_currency(value):
            if value is None:
                return None
            # Convertir a Decimal y redondear a 2 decimales
            decimal_value = Decimal(str(value))
            return decimal_value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # Log del valor original
        if 'iva' in data:
            logger.info(f"ANTES redondeo - iva: {data['iva']} (tipo: {type(data['iva'])})")
        else:
            data['iva'] = 0.0 
        
        # Aplicar redondeo a campos monetarios antes de la validación
        for field in ['precio_dia', 'iva', 'precio_total', 
                      'importe_pagado_inicial', 'importe_pendiente_inicial',
                      'importe_pagado_extra', 'importe_pendiente_extra']:
            if field in data and data[field] is not None:
                original_value = data[field]
                rounded_value = round_currency(original_value)
                data[field] = float(rounded_value)
                if field == 'iva':
                    logger.info(f"DESPUÉS redondeo - iva: {data[field]} (original: {original_value})")
        
        # Calcular precio_dia automáticamente si no se proporciona
        if 'precio_dia' not in data or data['precio_dia'] is None:
            if data.get('precio_total') and data.get('fecha_recogida') and data.get('fecha_devolucion'):
                from datetime import datetime
                from decimal import Decimal
                
                precio_total = Decimal(str(data['precio_total']))
                
                # Manejar fechas que pueden venir como strings o datetime
                fecha_recogida = data['fecha_recogida']
                fecha_devolucion = data['fecha_devolucion']
                
                if isinstance(fecha_recogida, str):
                    fecha_recogida = datetime.fromisoformat(fecha_recogida.replace('Z', '+00:00'))
                if isinstance(fecha_devolucion, str):
                    fecha_devolucion = datetime.fromisoformat(fecha_devolucion.replace('Z', '+00:00'))
                
                # Calcular días de alquiler
                dias_totales = (fecha_devolucion - fecha_recogida).total_seconds() / (24 * 3600)
                if dias_totales <= 0:
                    dias_totales = 1  # Mínimo 1 día
                
                # Calcular precio por día
                precio_dia_calculado = precio_total / Decimal(str(dias_totales))
                data['precio_dia'] = float(precio_dia_calculado)
                logger.info(f"Precio por día calculado automáticamente: {data['precio_dia']}")
            else:
                logger.warning("No se puede calcular precio_dia: faltan datos de precio_total o fechas")
        
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
        for field in ['precio_dia', 'iva', 'precio_total', 
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
