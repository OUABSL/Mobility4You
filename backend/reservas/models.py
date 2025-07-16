# reservas/models.py
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Reserva(models.Model):
    ESTADO_CHOICES = [
        ("pendiente", _("Pendiente")),
        ("confirmada", _("Confirmada")),
        ("cancelada", _("Cancelada")),
    ]

    METODO_PAGO_CHOICES = [
        ("tarjeta", _("Tarjeta")),
        ("efectivo", _("Efectivo")),
    ]

    # Relaciones con otras aplicaciones    
    usuario = models.ForeignKey(
        "usuarios.Usuario",
        related_name="reservas",
        on_delete=models.CASCADE,
        null=False,
        blank=False,
    )
    promocion = models.ForeignKey(
        "politicas.Promocion",
        related_name="reservas",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    politica_pago = models.ForeignKey(
        "politicas.PoliticaPago",
        related_name="reservas",
        on_delete=models.RESTRICT,
        null=False,
        blank=False,
    )
    vehiculo = models.ForeignKey(
        "vehiculos.Vehiculo",
        related_name="reservas",
        on_delete=models.RESTRICT,
        null=False,
        blank=False,
    )
    lugar_recogida = models.ForeignKey(
        "lugares.Lugar",
        related_name="recogidas",
        on_delete=models.RESTRICT,
        null=False,
        blank=False,
    )
    lugar_devolucion = models.ForeignKey(
        "lugares.Lugar",
        related_name="devoluciones",
        on_delete=models.RESTRICT,
        null=False,
        blank=False,
    )

    # Fechas
    fecha_recogida = models.DateTimeField(_("Fecha de recogida"), null=False)
    fecha_devolucion = models.DateTimeField(_("Fecha de devolución"), null=False)

    # Estado
    estado = models.CharField(
        _("Estado"),
        max_length=20,
        choices=ESTADO_CHOICES,
        default="pendiente",
        null=False,
    )

    # Precios
    precio_dia = models.DecimalField(
        _("Precio por día"),
        max_digits=10,
        decimal_places=2,
        null=False,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    precio_impuestos = models.DecimalField(
        _("Precio impuestos"),
        max_digits=10,
        decimal_places=2,
        null=False,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    precio_total = models.DecimalField(
        _("Precio total"),
        max_digits=10,
        decimal_places=2,
        null=False,
        validators=[MinValueValidator(Decimal("0.01"))],
    )

    # Métodos de pago
    metodo_pago = models.CharField(
        _("Método de pago"),
        max_length=20,
        choices=METODO_PAGO_CHOICES,
        default="tarjeta",
        help_text=_("Método de pago utilizado para la reserva"),
        null=False,
    )

    # Pagos
    importe_pagado_inicial = models.DecimalField(
        _("Importe pagado inicial"),
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        null=False,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    importe_pendiente_inicial = models.DecimalField(
        _("Importe pendiente inicial"),
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        null=False,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    importe_pagado_extra = models.DecimalField(
        _("Importe pagado extra"),
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        null=True,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    importe_pendiente_extra = models.DecimalField(
        _("Importe pendiente extra"),
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        null=True,
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    # Notas
    notas_internas = models.TextField(_("Notas internas"), null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "reserva"
        verbose_name = _("Reserva")
        verbose_name_plural = _("Reservas")
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["fecha_recogida", "fecha_devolucion"], name="idx_reserva_fechas"
            ),
            models.Index(fields=["estado", "created_at"]),
        ]

    def __str__(self):
        return f"Reserva {self.pk} - {self.vehiculo}"

    def save(self, *args, **kwargs):
        """Sobrescribe save con validaciones y cálculo automático de precios"""
        # Calcular precio total si no está establecido
        if not self.precio_total and self.precio_dia:
            self.precio_total = self.calcular_precio_total()

        # Actualizar timestamps
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()

        # Validar antes de guardar
        self.full_clean()

        super().save(*args, **kwargs)

    def summary(self):
        return {
            "id": self.pk,
            "usuario": str(self.usuario),
            "vehiculo": str(self.vehiculo),
            "politica_pago": str(self.politica_pago),
            "promocion": str(self.promocion) if self.promocion else None,
            "fecha_recogida": self.fecha_recogida,
            "fecha_devolucion": self.fecha_devolucion,
            "estado": self.estado,
            "precio_total": self.precio_total,
            "metodo_pago": self.metodo_pago,
            "importe_pagado_inicial": self.importe_pagado_inicial,
            "importe_pendiente_inicial": self.importe_pendiente_inicial,
            "importe_pagado_extra": self.importe_pagado_extra,
            "importe_pendiente_extra": self.importe_pendiente_extra,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    def dias_alquiler(self):
        """Calcula los días de alquiler"""
        if self.fecha_recogida and self.fecha_devolucion:
            fecha_rec = (
                self.fecha_recogida.date()
                if hasattr(self.fecha_recogida, "date")
                else self.fecha_recogida
            )
            fecha_dev = (
                self.fecha_devolucion.date()
                if hasattr(self.fecha_devolucion, "date")
                else self.fecha_devolucion
            )
            dias = (fecha_dev - fecha_rec).days
            return dias if dias > 0 else 1
        return 1

    def verificar_disponibilidad_vehiculo(self):
        """Verifica si el vehículo está disponible para las fechas de la reserva"""
        if not self.vehiculo or not self.fecha_recogida or not self.fecha_devolucion:
            return False

        reservas_conflicto = Reserva.objects.filter(
            vehiculo=self.vehiculo, estado__in=["confirmada", "pendiente"]
        ).filter(
            fecha_recogida__lt=self.fecha_devolucion,
            fecha_devolucion__gt=self.fecha_recogida,
        )

        # Excluir la reserva actual si estamos editando
        if self.pk:
            reservas_conflicto = reservas_conflicto.exclude(pk=self.pk)

        return not reservas_conflicto.exists()

    def calcular_precio_total(self):
        """Calcula el precio total de la reserva incluyendo extras"""
        if not self.precio_dia or not self.fecha_recogida or not self.fecha_devolucion:
            return Decimal("0.00")

        # Precio base
        dias = self.dias_alquiler()
        precio_base = self.precio_dia * dias

        # Precio extras
        precio_extras = Decimal("0.00")
        for reserva_extra in self.extras.all():
            precio_extras += reserva_extra.extra.precio * reserva_extra.cantidad * dias

        # Aplicar descuento de promoción si existe
        descuento = Decimal("0.00")
        if self.promocion:
            if hasattr(self.promocion, "descuento_pct"):
                descuento = (precio_base + precio_extras) * (
                    self.promocion.descuento_pct / 100
                )

        # Subtotal
        subtotal = precio_base + precio_extras - descuento

        # Impuestos (IVA 21%)
        impuestos = subtotal * Decimal("0.21")

        # Total
        total = subtotal + impuestos

        return total

    def clean(self):
        """Validaciones personalizadas del modelo"""
        super().clean()

        try:
            # Validar fechas
            if self.fecha_recogida and self.fecha_devolucion:
                if self.fecha_recogida >= self.fecha_devolucion:
                    raise ValidationError(
                        {
                            "fecha_devolucion": "La fecha de devolución debe ser posterior a la fecha de recogida"
                        }
                    )

                if not self.pk:  # Solo para nuevas reservas
                    from django.utils import timezone

                    now = timezone.now()
                    margen = timezone.timedelta(minutes=30)
                    limite_minimo = now - margen

                    if self.fecha_recogida < limite_minimo:
                        raise ValidationError(
                            {
                                "fecha_recogida": "La fecha de recogida debe ser futura (con margen de 30 minutos para procesamiento)"
                            }
                        )

            # Validar disponibilidad del vehículo
            if self.vehiculo and self.fecha_recogida and self.fecha_devolucion:
                if not self.pk or self._state.adding:
                    if not self.verificar_disponibilidad_vehiculo():
                        raise ValidationError(
                            {
                                "vehiculo": "El vehículo no está disponible para las fechas seleccionadas"
                            }
                        )

            # Validar importes
            if self.precio_total and self.precio_total <= 0:
                raise ValidationError(
                    {"precio_total": "El precio total debe ser mayor que cero"}
                )

        except ValidationError:
            raise
        except Exception as e:
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Error en validación de reserva: {str(e)}")
            raise ValidationError(
                {"validacion_general": f"Error en validación: {str(e)}"}
            )


class ReservaConductor(models.Model):
    ROL_CHOICES = [
        ("principal", _("Principal")),
        ("secundario", _("Secundario")),
    ]

    reserva = models.ForeignKey(
        Reserva, related_name="conductores", on_delete=models.CASCADE, null=False
    )
    conductor = models.ForeignKey(
        "usuarios.Usuario",
        related_name="conducciones",
        on_delete=models.CASCADE,
        null=False,
    )
    rol = models.CharField(
        _("Rol"),
        max_length=20,
        choices=ROL_CHOICES,
        default="principal",
        help_text=_("Rol del conductor en la reserva"),
        null=False,
        blank=False,
    )

    class Meta:
        db_table = "reserva_conductor"
        verbose_name = _("Conductor de reserva")
        verbose_name_plural = _("Conductores de reserva")
        unique_together = [["reserva", "conductor"]]

    def __str__(self):
        return f"{self.conductor} - {self.rol} ({self.reserva})"


class Penalizacion(models.Model):
    reserva = models.ForeignKey(
        Reserva, related_name="penalizaciones", on_delete=models.CASCADE, null=False
    )
    tipo_penalizacion = models.ForeignKey(
        "politicas.TipoPenalizacion",
        related_name="penalizaciones",
        on_delete=models.CASCADE,
        null=False,
    )
    importe = models.DecimalField(
        _("Importe"),
        max_digits=10,
        decimal_places=2,
        null=False,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    fecha = models.DateTimeField(_("Fecha"), null=False, default=timezone.now)
    descripcion = models.TextField(_("Descripción"), null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "penalizacion"
        verbose_name = _("Penalización")
        verbose_name_plural = _("Penalizaciones")
        ordering = ["-fecha"]
        indexes = [
            models.Index(fields=["reserva", "tipo_penalizacion"]),
        ]

    def save(self, *args, **kwargs):
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)


class Extras(models.Model):
    nombre = models.CharField(_("Nombre"), max_length=100)
    descripcion = models.TextField(_("Descripción"), blank=True)
    precio = models.DecimalField(_("Precio"), max_digits=10, decimal_places=2)
    imagen = models.ImageField(_("Imagen"), upload_to="extras/", null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = _("Extra")
        verbose_name_plural = _("Extras")
        db_table = "extras"
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.nombre} ({self.precio}€)"


class ReservaExtra(models.Model):
    reserva = models.ForeignKey(
        Reserva, related_name="extras", on_delete=models.CASCADE
    )
    extra = models.ForeignKey(
        "Extras", related_name="reservas_extra", on_delete=models.CASCADE
    )
    cantidad = models.PositiveIntegerField(_("Cantidad"), default=1)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = _("Extra de reserva")
        verbose_name_plural = _("Extras de reserva")
        ordering = ["extra__nombre"]
        db_table = "reserva_extra"
        unique_together = [["reserva", "extra"]]

    def save(self, *args, **kwargs):
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.extra.nombre} x{self.cantidad} ({self.reserva})"
