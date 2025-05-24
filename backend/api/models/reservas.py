# api/models/reservas.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.utils import timezone

class Reserva(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', _('Pendiente')),
        ('confirmada', _('Confirmada')),
        ('cancelada', _('Cancelada')),
    ]
    
    METODO_PAGO_CHOICES = [
        ('tarjeta', _('Tarjeta')),
        ('efectivo', _('Efectivo')),
    ]
    
    # Relaciones
    usuario = models.ForeignKey(
        'Usuario',
        related_name="reservas",
        on_delete=models.SET(-1),
        null=False,
        blank=False
    )
    promocion = models.ForeignKey(
        'Promocion',
        related_name="reservas",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    politica_pago = models.ForeignKey(
        'PoliticaPago',
        related_name="reservas",
        on_delete=models.RESTRICT,
        null=False
    )
    vehiculo = models.ForeignKey(
        'Vehiculo',
        related_name="reservas",
        on_delete=models.RESTRICT,
        null=False
    )
    lugar_recogida = models.ForeignKey(
        'Lugar',
        related_name="recogidas",
        on_delete=models.RESTRICT,
        null=False
    )
    lugar_devolucion = models.ForeignKey(
        'Lugar',
        related_name="devoluciones",
        on_delete=models.RESTRICT,
        null=False
    )
    
    # Fechas
    fecha_recogida = models.DateTimeField(
        _("Fecha de recogida"),
        null=False
    )
    fecha_devolucion = models.DateTimeField(
        _("Fecha de devolución"),
        null=False
    )
    
    # Estado - ✅ SOLO UNA DEFINICIÓN
    estado = models.CharField(
        _("Estado"),
        max_length=20,
        choices=ESTADO_CHOICES,
        default='pendiente',
        null=False
    )
    
    # Precios
    precio_dia = models.DecimalField(
        _("Precio por día"),
        max_digits=10,
        decimal_places=2,
        null=False,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    precio_impuestos = models.DecimalField(
        _("Precio impuestos"),
        max_digits=10,
        decimal_places=2,
        null=False,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    precio_total = models.DecimalField(
        _("Precio total"),
        max_digits=10,
        decimal_places=2,
        null=False,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
     
    # Métodos de pago
    metodo_pago = models.CharField(
        _("Método de pago"),
        max_length=20,
        choices=METODO_PAGO_CHOICES,
        default='tarjeta',
        help_text=_("Método de pago utilizado para la reserva"),
        null=False
    )
    
    # Pagos
    importe_pagado_inicial = models.DecimalField(
        _("Importe pagado inicial"),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        null=False,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    importe_pendiente_inicial = models.DecimalField(
        _("Importe pendiente inicial"),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        null=False,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    importe_pagado_extra = models.DecimalField(
        _("Importe pagado extra"),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        null=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    importe_pendiente_extra = models.DecimalField(
        _("Importe pendiente extra"),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        null=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    
    # Notas
    notas_internas = models.TextField(
        _("Notas internas"),
        null=True,
        blank=True
    )
    
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'reserva'
        verbose_name = _("Reserva")
        verbose_name_plural = _("Reservas")
        ordering = ['-created_at']
        indexes = [
            models.Index(
                fields=['fecha_recogida', 'fecha_devolucion'],
                name='idx_reserva_fechas'
            ),
            models.Index(fields=['estado', 'created_at']),
        ]
    
    def __str__(self):
        return f"Reserva {self.pk} - {self.vehiculo}"
    
    def save(self, *args, **kwargs):
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)
        
    # ✅ CORREGIR summary() - quitar campos inexistentes
    def summary(self):
        return {
            'id': self.pk,
            'usuario': str(self.usuario),
            'vehiculo': str(self.vehiculo),
            'politica_pago': str(self.politica_pago),
            'promocion': str(self.promocion) if self.promocion else None,
            'fecha_recogida': self.fecha_recogida,
            'fecha_devolucion': self.fecha_devolucion,
            'estado': self.estado,
            'precio_total': self.precio_total,
            'metodo_pago': self.metodo_pago,
            'importe_pagado_inicial': self.importe_pagado_inicial,
            'importe_pendiente_inicial': self.importe_pendiente_inicial,
            'importe_pagado_extra': self.importe_pagado_extra,
            'importe_pendiente_extra': self.importe_pendiente_extra,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }
class ReservaConductor(models.Model):
    ROL_CHOICES = [
        ('principal', _('Principal')),
        ('secundario', _('Secundario')),
    ]
    
    reserva = models.ForeignKey(
        Reserva,
        related_name="conductores",
        on_delete=models.CASCADE,
        null=False
    )
    conductor = models.ForeignKey(
        'Usuario',
        related_name="conducciones",
        on_delete=models.CASCADE,
        null=False
    )
    rol = models.CharField(
        _("Rol"),
        max_length=20,
        choices=ROL_CHOICES,
        default='principal',
        help_text=_("Rol del conductor en la reserva"),
        null=False,
        blank=False
    )
    
    class Meta:
        db_table = 'reserva_conductor'
        verbose_name = _("Conductor de reserva")
        verbose_name_plural = _("Conductores de reserva")
        unique_together = [['reserva', 'conductor']]
    
    def __str__(self):
        return f"{self.conductor} - {self.rol} ({self.reserva})"


# Penalizacion: Registra cada penalización concreta aplicada a una reserva.
class Penalizacion(models.Model):
    reserva = models.ForeignKey(
        Reserva,
        related_name="penalizaciones",
        on_delete=models.CASCADE,
        null=False
    )
    tipo_penalizacion = models.ForeignKey(
        'TipoPenalizacion',
        related_name="penalizaciones",
        on_delete=models.CASCADE,
        null=False
    )
    importe = models.DecimalField(
        _("Importe"),
        max_digits=10,
        decimal_places=2,
        null=False,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    fecha = models.DateTimeField(
        _("Fecha"),
        null=False,
        default= timezone.now
    )
    descripcion = models.TextField(
        _("Descripción"),
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'penalizacion'
        verbose_name = _("Penalización")
        verbose_name_plural = _("Penalizaciones")
        ordering = ['-fecha']
        indexes = [
            models.Index(fields=['reserva', 'tipo_penalizacion']),
        ]
    
    def save(self, *args, **kwargs):
        """Sobrescribe el método save para actualizar los campos de fecha"""
        if hasattr(self, 'fecha') and isinstance(self._meta.get_field('fecha'), models.DateField):
            if self.fecha and hasattr(self.fecha, 'date'):
                self.fecha = self.fecha.date()
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)
        
    def __str__(self):
        return f"{self.reserva} - {self.tipo_penalizacion}: {self.importe}€"


class Extras(models.Model):
    nombre = models.CharField(_('Nombre'), max_length=100)
    descripcion = models.TextField(_('Descripción'), blank=True)
    precio = models.DecimalField(_('Precio'), max_digits=10, decimal_places=2)
    imagen = models.ImageField(
        _('Imagen'),
        upload_to='extras/',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = _('Extra')
        verbose_name_plural = _('Extras')
        db_table = 'extras'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.precio}€)"

class ReservaExtra(models.Model):
    reserva = models.ForeignKey(
        Reserva,
        related_name='extras',
        on_delete=models.CASCADE
    )
    extra = models.ForeignKey(
        'Extras',
        related_name='reservas_extra',
        on_delete=models.CASCADE
    )
    cantidad = models.PositiveIntegerField(_('Cantidad'), default=1)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = _('Extra de reserva')
        verbose_name_plural = _('Extras de reserva')
        ordering = ['extra__nombre']
        db_table = 'reserva_extra'
        unique_together = [['reserva', 'extra']]
        
    def save(self, *args, **kwargs):
        """Sobrescribe el método save para actualizar los campos de fecha"""
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.extra.nombre} x{self.cantidad} ({self.reserva})"