# backend/payments/models.py

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class PagoStripe(models.Model):
    """Modelo para almacenar información de pagos con Stripe"""

    ESTADO_CHOICES = [
        ("PENDIENTE", "Pendiente"),
        ("PROCESANDO", "Procesando"),
        ("COMPLETADO", "Completado"),
        ("FALLIDO", "Fallido"),
        ("CANCELADO", "Cancelado"),
        ("REEMBOLSADO", "Reembolsado"),
        ("REEMBOLSO_PARCIAL", "Reembolso Parcial"),
    ]

    TIPO_PAGO_CHOICES = [
        ("INICIAL", "Pago Inicial"),
        ("DIFERENCIA", "Pago de Diferencia"),
        ("EXTRA", "Pago Extra"),
        ("PENALIZACION", "Penalización"),
    ]

    # Identificadores únicos
    numero_pedido = models.CharField(
        max_length=50, unique=True, help_text="Número de pedido único interno"
    )
    stripe_payment_intent_id = models.CharField(
        max_length=255, unique=True, help_text="ID del Payment Intent de Stripe"
    )
    stripe_charge_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="ID del Charge de Stripe (después de confirmación)",
    )

    # Información del pago
    importe = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Importe del pago en euros",
    )
    moneda = models.CharField(
        max_length=3, default="EUR", help_text="Código de moneda ISO"
    )
    estado = models.CharField(
        max_length=20, choices=ESTADO_CHOICES, default="PENDIENTE"
    )
    tipo_pago = models.CharField(
        max_length=20,
        choices=TIPO_PAGO_CHOICES,
        default="INICIAL",
        help_text="Tipo de pago dentro del flujo de reserva",
    )

    # Metadatos de Stripe
    stripe_client_secret = models.CharField(
        max_length=255, help_text="Client secret para confirmación en frontend"
    )
    stripe_status = models.CharField(
        max_length=50, blank=True, null=True, help_text="Estado reportado por Stripe"
    )
    stripe_metadata = models.JSONField(
        default=dict, help_text="Metadatos adicionales de Stripe"
    )

    # Información de la transacción
    metodo_pago = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Método de pago usado (card, sepa_debit, etc.)",
    )
    ultimos_4_digitos = models.CharField(
        max_length=4, blank=True, null=True, help_text="Últimos 4 dígitos de la tarjeta"
    )
    marca_tarjeta = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Marca de la tarjeta (visa, mastercard, etc.)",
    )

    # Reembolsos
    importe_reembolsado = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Importe total reembolsado",
    )

    # Datos de la reserva y cliente
    datos_reserva = models.JSONField(
        default=dict, help_text="Datos completos de la reserva en formato JSON"
    )
    email_cliente = models.EmailField(help_text="Email del cliente para el pago")
    nombre_cliente = models.CharField(
        max_length=255, help_text="Nombre completo del cliente"
    )

    # Información de error
    mensaje_error = models.TextField(
        blank=True, null=True, help_text="Mensaje de error en caso de fallo"
    )
    codigo_error_stripe = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Código de error específico de Stripe",
    )

    # Fechas
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    fecha_confirmacion = models.DateTimeField(
        null=True, blank=True, help_text="Fecha de confirmación del pago"
    )
    fecha_vencimiento = models.DateTimeField(
        null=True, blank=True, help_text="Fecha de vencimiento del Payment Intent"
    )
    # Relación con reserva
    reserva = models.ForeignKey(
        "reservas.Reserva",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pagos_stripe",
    )

    class Meta:
        db_table = "pagos_stripe"
        verbose_name = "Pago Stripe"
        verbose_name_plural = "Pagos Stripe"
        ordering = ["-fecha_creacion"]
        indexes = [
            models.Index(fields=["stripe_payment_intent_id"]),
            models.Index(fields=["numero_pedido"]),
            models.Index(fields=["estado", "fecha_creacion"]),
            models.Index(fields=["reserva", "tipo_pago"]),
        ]

    def save(self, *args, **kwargs):
        """Override save para validaciones adicionales"""
        # Validar que el importe sea positivo
        if self.importe <= 0:
            raise ValueError("El importe debe ser mayor a 0")

        # Validar email del cliente
        if not self.email_cliente:
            raise ValueError("El email del cliente es obligatorio")

        # Auto-generar nombre del cliente si falta
        if not self.nombre_cliente and self.email_cliente:
            self.nombre_cliente = self.email_cliente.split("@")[0]

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Pago {self.numero_pedido} - {self.estado} - {self.importe}€"

    @property
    def es_exitoso(self):
        """Verifica si el pago fue exitoso"""
        return self.estado == "COMPLETADO"

    @property
    def puede_reembolsar(self):
        """Verifica si el pago puede ser reembolsado"""
        if self.importe is None:
            return False
        return self.estado == "COMPLETADO" and self.importe_reembolsado < self.importe

    @property
    def importe_disponible_reembolso(self):
        """Calcula el importe disponible para reembolso"""
        if self.importe is None:
            return Decimal("0.00")
        return self.importe - self.importe_reembolsado

    def actualizar_desde_stripe(self, payment_intent_data):
        """Actualiza el objeto con datos de Stripe"""
        self.stripe_status = payment_intent_data.get("status")
        self.stripe_metadata = payment_intent_data.get("metadata", {})

        # Actualizar estado interno basado en estado de Stripe
        stripe_status = payment_intent_data.get("status")
        if stripe_status == "succeeded":
            self.estado = "COMPLETADO"
            self.fecha_confirmacion = timezone.now()

            # Extraer información de la tarjeta si está disponible
            if (
                "charges" in payment_intent_data
                and payment_intent_data["charges"]["data"]
            ):
                charge = payment_intent_data["charges"]["data"][0]
                self.stripe_charge_id = charge["id"]

                if "payment_method_details" in charge:
                    pm_details = charge["payment_method_details"]
                    if "card" in pm_details:
                        card = pm_details["card"]
                        self.ultimos_4_digitos = card.get("last4")
                        self.marca_tarjeta = card.get("brand")
                        self.metodo_pago = "card"

        elif stripe_status == "canceled":
            self.estado = "CANCELADO"
        elif stripe_status in ["processing", "requires_capture"]:
            self.estado = "PROCESANDO"
        elif stripe_status in ["requires_payment_method", "requires_confirmation"]:
            self.estado = "PENDIENTE"
        else:
            self.estado = "FALLIDO"

        self.save()


class ReembolsoStripe(models.Model):
    """Modelo para gestionar reembolsos de Stripe"""

    ESTADO_CHOICES = [
        ("PENDIENTE", "Pendiente"),
        ("PROCESANDO", "Procesando"),
        ("COMPLETADO", "Completado"),
        ("FALLIDO", "Fallido"),
        ("CANCELADO", "Cancelado"),
    ]

    MOTIVO_CHOICES = [
        ("CANCELACION_CLIENTE", "Cancelación por Cliente"),
        ("CANCELACION_EMPRESA", "Cancelación por Empresa"),
        ("MODIFICACION_RESERVA", "Modificación de Reserva"),
        ("ERROR_PAGO", "Error en el Pago"),
        ("FRAUDE", "Fraude"),
        ("OTRO", "Otro Motivo"),
    ]

    pago_stripe = models.ForeignKey(
        PagoStripe, on_delete=models.CASCADE, related_name="reembolsos"
    )
    stripe_refund_id = models.CharField(
        max_length=255, unique=True, help_text="ID del reembolso en Stripe"
    )

    importe = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Importe del reembolso",
    )
    motivo = models.CharField(
        max_length=30, choices=MOTIVO_CHOICES, default="CANCELACION_CLIENTE"
    )
    estado = models.CharField(
        max_length=20, choices=ESTADO_CHOICES, default="PENDIENTE"
    )

    descripcion = models.TextField(
        blank=True, null=True, help_text="Descripción del motivo del reembolso"
    )

    # Metadatos de Stripe
    stripe_status = models.CharField(max_length=50, blank=True, null=True)
    stripe_failure_reason = models.CharField(max_length=255, blank=True, null=True)

    # Fechas
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_procesamiento = models.DateTimeField(
        null=True, blank=True, help_text="Fecha en que se procesó el reembolso"
    )

    class Meta:
        db_table = "reembolsos_stripe"
        verbose_name = "Reembolso Stripe"
        verbose_name_plural = "Reembolsos Stripe"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"Reembolso {self.stripe_refund_id} - {self.importe}€"


class WebhookStripe(models.Model):
    """Modelo para registrar webhooks recibidos de Stripe"""

    stripe_event_id = models.CharField(
        max_length=255, unique=True, help_text="ID único del evento de Stripe"
    )
    tipo_evento = models.CharField(
        max_length=100, help_text="Tipo de evento (payment_intent.succeeded, etc.)"
    )
    procesado = models.BooleanField(
        default=False, help_text="Indica si el webhook fue procesado exitosamente"
    )

    # Datos del webhook
    datos_evento = models.JSONField(help_text="Datos completos del evento de Stripe")

    # Información de procesamiento
    fecha_recepcion = models.DateTimeField(auto_now_add=True)
    fecha_procesamiento = models.DateTimeField(null=True, blank=True)
    intentos_procesamiento = models.PositiveIntegerField(default=0)
    mensaje_error = models.TextField(
        blank=True, null=True, help_text="Mensaje de error si el procesamiento falló"
    )

    class Meta:
        db_table = "webhooks_stripe"
        verbose_name = "Webhook Stripe"
        verbose_name_plural = "Webhooks Stripe"
        ordering = ["-fecha_recepcion"]

    def __str__(self):
        return f"Webhook {self.tipo_evento} - {self.stripe_event_id}"
