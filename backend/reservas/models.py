# reservas/models.py
import logging
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .services import ReservaService

logger = logging.getLogger(__name__)


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

    # Número de reserva único
    numero_reserva = models.CharField(
        _("Número de reserva"),
        max_length=15,
        unique=True,
        null=True,
        blank=True,
        help_text=_("Número único de reserva con formato M4Y + 6 dígitos"),
        db_index=True,
    )

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
    iva = models.DecimalField(
        _("IVA (simbólico)"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text=_("IVA incluido en el precio total (solo para visualización)")
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
            models.Index(fields=["numero_reserva"], name="idx_reserva_numero"),
        ]

    def __str__(self):
        numero = self.numero_reserva or f"ID-{self.pk}"
        return f"Reserva {numero} - {self.vehiculo}"

    def save(self, *args, **kwargs):
        """Override save para generar número de reserva automáticamente y validar datos"""
        is_new = self.pk is None

        # Actualizar timestamps
        if is_new:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        
        # Calcular precio total si no está establecido
        if not self.precio_total and self.precio_dia:
            self.precio_total = self.calcular_precio_total()
        
        # Calcular IVA simbólico si no está establecido
        if self.iva is None and self.precio_total:
            self.iva = self.calcular_iva_simbolico()
        
        # Generar número de reserva para nuevas reservas
        if is_new and not self.numero_reserva:
            try:
                from .utils import generar_numero_reserva_unico
                self.numero_reserva = generar_numero_reserva_unico()
                logger.info(f"Número de reserva generado: {self.numero_reserva}")
            except Exception as e:
                logger.error(f"Error generando número de reserva: {str(e)}")
                # Continuamos sin número, se puede generar manualmente
        
        # Validar antes de guardar
        self.full_clean()
        
        # GUARDAR UNA SOLA VEZ - Después de todas las operaciones preparatorias
        super().save(*args, **kwargs)
        
        # Operaciones post-save (solo logging, sin saves adicionales)
        if is_new:
            logger.info(f"Reserva {self.pk} creada con número: {self.numero_reserva}")
            
            # Si no se pudo generar el número antes del save, intentar ahora con el ID disponible
            if not self.numero_reserva:
                try:
                    from .utils import generar_numero_reserva_unico
                    self.numero_reserva = generar_numero_reserva_unico()
                    # Actualizar solo el campo numero_reserva sin full_clean() para evitar recursión
                    super().save(update_fields=['numero_reserva'])
                    logger.info(f"Número de reserva generado post-save: {self.numero_reserva}")
                except Exception as e:
                    logger.error(f"Error generando número de reserva post-save: {str(e)}")

    def summary(self):
        return {
            "id": self.pk,
            "numero_reserva": self.numero_reserva,
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

    def calcular_iva_simbolico(self):
        """
        Calcula el IVA simbólico basado en el precio total
        IVA SIMBÓLICO: Simplemente 10% del precio total para mostrar al cliente
        """
        from django.conf import settings
        
        if not self.precio_total:
            return Decimal("0.00")
            
        # Obtener porcentaje IVA de configuración
        iva_percentage = getattr(settings, 'IVA_PERCENTAGE', 0.10)
        
        # IVA SIMBÓLICO: Simplemente el porcentaje del precio total
        iva_amount = self.precio_total * Decimal(str(iva_percentage))
        
        return iva_amount.quantize(Decimal('0.01'))

    def get_iva_display(self):
        """
        Retorna el IVA para mostrar: el calculado automáticamente o el almacenado
        """
        if self.iva is not None:
            return self.iva
        return self.calcular_iva_simbolico()

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
        """
        Calcula el precio total usando el servicio centralizado
        Evita duplicación de lógica
        """
        if not self.precio_dia or not self.fecha_recogida or not self.fecha_devolucion:
            return Decimal("0.00")
        
        try:            
            # Preparar datos para el servicio
            data = {
                "vehiculo_id": self.vehiculo.id if self.vehiculo else None,
                "fecha_recogida": self.fecha_recogida,
                "fecha_devolucion": self.fecha_devolucion,
                "politica_pago_id": self.politica_pago.id if self.politica_pago else None,
                "extras": [
                    {"extra_id": re.extra.id, "cantidad": re.cantidad}
                    for re in self.extras.all()
                ]
            }
            
            # Usar servicio centralizado
            service = ReservaService()
            resultado = service.calcular_precio_reserva(data)
            
            if resultado.get("success"):
                return Decimal(str(resultado.get("precio_total", 0)))
            else:
                logger.warning(f"Error calculando precio para reserva {self.pk}: {resultado.get('error')}")
                return self.precio_total or Decimal("0.00")
                
        except Exception as e:
            logger.error(f"Error en calcular_precio_total para reserva {self.pk}: {str(e)}")
            # Fallback a cálculo simple
            dias = self.dias_alquiler()
            precio_base = self.precio_dia * dias
            return precio_base

    def clean(self):
        """Validaciones unificadas con frontend """
        super().clean()

        try:
            # Validar número de reserva si existe
            if self.numero_reserva:
                from .utils import validar_numero_reserva
                try:
                    validar_numero_reserva(self.numero_reserva)
                except ValidationError as e:
                    raise ValidationError({"numero_reserva": str(e)})

            # Validar fechas
            if self.fecha_recogida and self.fecha_devolucion:
                # 1. Validar orden de fechas
                if self.fecha_recogida >= self.fecha_devolucion:
                    raise ValidationError({
                        "fecha_devolucion": "La fecha de devolución debe ser posterior a la fecha de recogida"
                    })

                # 2. Validar duración (1-30 días)
                duracion = (self.fecha_devolucion - self.fecha_recogida).days
                if duracion < 1:
                    raise ValidationError({
                        "fechas": "El período de alquiler debe ser de al menos 1 día"
                    })

                # 3. Validar fechas futuras según contexto
                from django.utils import timezone
                now = timezone.now()
                is_new_reservation = not self.pk
                is_edit = self.pk and hasattr(self, '_state') and not self._state.adding

                if is_new_reservation:
                    # ✅ NUEVA RESERVA: Margen de 30 minutos (IDÉNTICO AL FRONTEND)
                    margin_time = now - timezone.timedelta(minutes=30)
                    if self.fecha_recogida <= margin_time:
                        raise ValidationError({
                            "fecha_recogida": "La fecha de recogida debe ser al menos 30 minutos en el futuro"
                        })
                elif is_edit:
                    # ✅ EDICIÓN: Margen de 2 horas (IDÉNTICO AL FRONTEND)
                    edit_limit = now + timezone.timedelta(hours=2)
                    if self.fecha_recogida <= edit_limit:
                        raise ValidationError({
                            "fecha_recogida": "No se puede editar una reserva que comienza en menos de 2 horas"
                        })

            # Validar disponibilidad del vehículo
            if self.vehiculo and self.fecha_recogida and self.fecha_devolucion:
                if not self.pk or self._state.adding:
                    if not self.verificar_disponibilidad_vehiculo():
                        raise ValidationError({
                            "vehiculo": "El vehículo no está disponible para las fechas seleccionadas"
                        })

            # Validar importes
            if self.precio_total and self.precio_total <= 0:
                raise ValidationError({
                    "precio_total": "El precio total debe ser mayor que cero"
                })

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error en validación de reserva: {str(e)}")
            raise ValidationError({
                "validacion_general": f"Error en validación: {str(e)}"
            })


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
