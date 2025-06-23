# backend/payments/serializers.py
from rest_framework import serializers

from .models import PagoStripe, ReembolsoStripe, WebhookStripe


class PagoStripeSerializer(serializers.ModelSerializer):
    """Serializer para pagos de Stripe"""

    # Campos calculados
    es_exitoso = serializers.ReadOnlyField()
    puede_reembolsar = serializers.ReadOnlyField()
    importe_disponible_reembolso = serializers.ReadOnlyField()

    # Información adicional
    reserva_info = serializers.SerializerMethodField()
    reembolsos_info = serializers.SerializerMethodField()

    class Meta:
        model = PagoStripe
        fields = [
            "id",
            "numero_pedido",
            "stripe_payment_intent_id",
            "stripe_charge_id",
            "importe",
            "moneda",
            "estado",
            "tipo_pago",
            "stripe_status",
            "metodo_pago",
            "ultimos_4_digitos",
            "marca_tarjeta",
            "importe_reembolsado",
            "email_cliente",
            "nombre_cliente",
            "mensaje_error",
            "codigo_error_stripe",
            "fecha_creacion",
            "fecha_actualizacion",
            "fecha_confirmacion",
            "reserva",
            "es_exitoso",
            "puede_reembolsar",
            "importe_disponible_reembolso",
            "reserva_info",
            "reembolsos_info",
        ]
        read_only_fields = [
            "id",
            "stripe_payment_intent_id",
            "stripe_charge_id",
            "stripe_status",
            "fecha_creacion",
            "fecha_actualizacion",
            "fecha_confirmacion",
            "es_exitoso",
            "puede_reembolsar",
            "importe_disponible_reembolso",
        ]

    def get_reserva_info(self, obj):
        """Información básica de la reserva asociada"""
        if obj.reserva:
            return {
                "id": obj.reserva.id,
                "estado": obj.reserva.estado,
                "fecha_recogida": obj.reserva.fecha_recogida,
                "fecha_devolucion": obj.reserva.fecha_devolucion,
                "precio_total": float(obj.reserva.precio_total),
                "vehiculo": (
                    {
                        "marca": obj.reserva.vehiculo.marca,
                        "modelo": obj.reserva.vehiculo.modelo,
                        "matricula": obj.reserva.vehiculo.matricula,
                    }
                    if obj.reserva.vehiculo
                    else None
                ),
            }
        return None

    def get_reembolsos_info(self, obj):
        """Información de reembolsos asociados"""
        reembolsos = obj.reembolsos.all()
        if reembolsos:
            return [
                {
                    "id": r.id,
                    "stripe_refund_id": r.stripe_refund_id,
                    "importe": float(r.importe),
                    "motivo": r.motivo,
                    "estado": r.estado,
                    "fecha_creacion": r.fecha_creacion,
                }
                for r in reembolsos
            ]
        return []


class PagoStripeListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados de pagos"""

    es_exitoso = serializers.ReadOnlyField()
    vehiculo_info = serializers.SerializerMethodField()

    class Meta:
        model = PagoStripe
        fields = [
            "id",
            "numero_pedido",
            "importe",
            "moneda",
            "estado",
            "tipo_pago",
            "metodo_pago",
            "ultimos_4_digitos",
            "marca_tarjeta",
            "fecha_creacion",
            "fecha_confirmacion",
            "es_exitoso",
            "vehiculo_info",
        ]

    def get_vehiculo_info(self, obj):
        """Información básica del vehículo"""
        if obj.reserva and obj.reserva.vehiculo:
            return f"{obj.reserva.vehiculo.marca} {obj.reserva.vehiculo.modelo}"
        return "Información no disponible"


class ReembolsoStripeSerializer(serializers.ModelSerializer):
    """Serializer para reembolsos de Stripe"""

    pago_info = serializers.SerializerMethodField()

    class Meta:
        model = ReembolsoStripe
        fields = [
            "id",
            "stripe_refund_id",
            "importe",
            "motivo",
            "estado",
            "descripcion",
            "stripe_status",
            "stripe_failure_reason",
            "fecha_creacion",
            "fecha_procesamiento",
            "pago_info",
        ]
        read_only_fields = [
            "id",
            "stripe_refund_id",
            "stripe_status",
            "stripe_failure_reason",
            "fecha_creacion",
            "fecha_procesamiento",
        ]

    def get_pago_info(self, obj):
        """Información básica del pago asociado"""
        return {
            "numero_pedido": obj.pago_stripe.numero_pedido,
            "importe_original": float(obj.pago_stripe.importe),
            "fecha_pago": obj.pago_stripe.fecha_confirmacion,
        }


class WebhookStripeSerializer(serializers.ModelSerializer):
    """Serializer para webhooks de Stripe"""

    class Meta:
        model = WebhookStripe
        fields = [
            "id",
            "stripe_event_id",
            "tipo_evento",
            "procesado",
            "fecha_recepcion",
            "fecha_procesamiento",
            "intentos_procesamiento",
            "mensaje_error",
        ]
        read_only_fields = ["id", "fecha_recepcion", "fecha_procesamiento"]


# Serializers para requests/responses específicos


class CreatePaymentIntentRequestSerializer(serializers.Serializer):
    """Serializer para validar requests de creación de Payment Intent"""

    reserva_data = serializers.DictField(help_text="Datos completos de la reserva")
    tipo_pago = serializers.ChoiceField(
        choices=["INICIAL", "DIFERENCIA", "EXTRA", "PENALIZACION"],
        default="INICIAL",
        help_text="Tipo de pago a procesar",
    )
    metadata_extra = serializers.DictField(
        required=False, help_text="Metadatos adicionales para el pago"
    )

    def validate_reserva_data(self, value):
        """Valida que los datos de reserva tengan la información mínima"""
        required_fields = ["precio_total"]

        # Validar campos según tipo de pago
        tipo_pago = self.initial_data.get("tipo_pago", "INICIAL")

        if tipo_pago == "INICIAL":
            required_fields.extend(["id"])
        elif tipo_pago == "DIFERENCIA":
            required_fields.extend(["diferencia"])
        elif tipo_pago == "EXTRA":
            required_fields.extend(["importe_extra"])
        elif tipo_pago == "PENALIZACION":
            required_fields.extend(["importe_penalizacion"])

        # Verificar campos requeridos
        missing_fields = [field for field in required_fields if not value.get(field)]
        if missing_fields:
            raise serializers.ValidationError(
                f"Campos requeridos faltantes: {', '.join(missing_fields)}"
            )

        # Validar email del cliente
        conductor = value.get("conductor") or value.get("conductorPrincipal")
        if not conductor or not conductor.get("email"):
            raise serializers.ValidationError("Se requiere email del conductor/cliente")

        return value


class ConfirmPaymentIntentRequestSerializer(serializers.Serializer):
    """Serializer para validar requests de confirmación de Payment Intent"""

    payment_intent_id = serializers.CharField(
        max_length=255, help_text="ID del Payment Intent de Stripe"
    )
    payment_method_id = serializers.CharField(
        max_length=255, required=False, help_text="ID del método de pago (opcional)"
    )

    def validate_payment_intent_id(self, value):
        """Valida que el Payment Intent existe"""
        if not value.startswith("pi_"):
            raise serializers.ValidationError("ID de Payment Intent inválido")

        # Verificar que existe en nuestra base de datos
        if not PagoStripe.objects.filter(stripe_payment_intent_id=value).exists():
            raise serializers.ValidationError(
                "Payment Intent no encontrado en el sistema"
            )

        return value


class RefundRequestSerializer(serializers.Serializer):
    """Serializer para validar requests de reembolso"""

    importe_reembolso = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        help_text="Importe a reembolsar (vacío = reembolso total)",
    )
    motivo = serializers.ChoiceField(
        choices=[
            "CANCELACION_CLIENTE",
            "CANCELACION_EMPRESA",
            "MODIFICACION_RESERVA",
            "ERROR_PAGO",
            "FRAUDE",
            "OTRO",
        ],
        default="CANCELACION_CLIENTE",
        help_text="Motivo del reembolso",
    )
    descripcion = serializers.CharField(
        max_length=500, required=False, help_text="Descripción adicional del reembolso"
    )

    def validate_importe_reembolso(self, value):
        """Valida que el importe de reembolso sea válido"""
        if value is not None and value <= 0:
            raise serializers.ValidationError(
                "El importe de reembolso debe ser mayor a 0"
            )
        return value


# Serializers de respuesta


class PaymentIntentResponseSerializer(serializers.Serializer):
    """Serializer para respuestas de creación de Payment Intent"""

    success = serializers.BooleanField()
    payment_intent_id = serializers.CharField(required=False)
    client_secret = serializers.CharField(required=False)
    numero_pedido = serializers.CharField(required=False)
    importe = serializers.FloatField(required=False)
    currency = serializers.CharField(required=False)
    publishable_key = serializers.CharField(required=False)
    error = serializers.CharField(required=False)
    error_code = serializers.CharField(required=False)


class PaymentConfirmationResponseSerializer(serializers.Serializer):
    """Serializer para respuestas de confirmación de pago"""

    success = serializers.BooleanField()
    status = serializers.CharField(required=False)
    payment_intent_id = serializers.CharField(required=False)
    charge_id = serializers.CharField(required=False)
    numero_pedido = serializers.CharField(required=False)
    client_secret = serializers.CharField(required=False)
    error = serializers.CharField(required=False)
    error_code = serializers.CharField(required=False)


class RefundResponseSerializer(serializers.Serializer):
    """Serializer para respuestas de reembolso"""

    success = serializers.BooleanField()
    refund_id = serializers.CharField(required=False)
    importe_reembolsado = serializers.FloatField(required=False)
    estado_reembolso = serializers.CharField(required=False)
    reembolso_local_id = serializers.IntegerField(required=False)
    error = serializers.CharField(required=False)
    error_code = serializers.CharField(required=False)


class PaymentStatusResponseSerializer(serializers.Serializer):
    """Serializer para respuestas de estado de pago"""

    success = serializers.BooleanField()
    estado = serializers.CharField(required=False)
    importe = serializers.FloatField(required=False)
    fecha_creacion = serializers.DateTimeField(required=False)
    fecha_confirmacion = serializers.DateTimeField(required=False)
    metodo_pago = serializers.CharField(required=False)
    ultimos_4_digitos = serializers.CharField(required=False)
    marca_tarjeta = serializers.CharField(required=False)
    puede_reembolsar = serializers.BooleanField(required=False)
    importe_reembolsado = serializers.FloatField(required=False)
    payment_intent_id = serializers.CharField(required=False)
    error = serializers.CharField(required=False)
    error_code = serializers.CharField(required=False)
