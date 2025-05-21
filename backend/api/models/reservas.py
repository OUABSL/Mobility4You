# api/models/reservas.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import User
from .vehiculos import Vehiculo
from .lugares import Lugar
from .politicasPago import PoliticaPago, TipoPenalizacion
from .marketing import Promocion

class Reserva(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', _('Pendiente')),
        ('confirmada', _('Confirmada')),
        ('cancelada', _('Cancelada')),
    ]
    
    METODO_PAGO_CHOICES = [
        ('tarjeta', _('Tarjeta')),
        ('efectivo', _('Efectivo')),
        ('paypal', _('PayPal')),
    ]
    
    # Relaciones principales
    usuario = models.ForeignKey(
        User, related_name="reservas",
        on_delete=models.SET_NULL, null=True, blank=True
    )
    vehiculo = models.ForeignKey(
        Vehiculo, related_name="reservas",
        on_delete=models.RESTRICT
    )
    lugar_recogida = models.ForeignKey(
        Lugar, related_name="recogidas",
        on_delete=models.RESTRICT
    )
    lugar_devolucion = models.ForeignKey(
        Lugar, related_name="devoluciones",
        on_delete=models.RESTRICT
    )
    politica_pago = models.ForeignKey(
        PoliticaPago, related_name="reservas",
        on_delete=models.RESTRICT
    )
    promocion = models.ForeignKey(
        Promocion, related_name="reservas",
        on_delete=models.SET_NULL, null=True, blank=True
    )
    
    # Fechas
    fecha_recogida = models.DateTimeField(_("Fecha de recogida"))
    fecha_devolucion = models.DateTimeField(_("Fecha de devolución"))
    
    # Precios y cargos
    precio_dia = models.DecimalField(_("Precio por día"), max_digits=10, decimal_places=2)
    precio_base = models.DecimalField(_("Precio base"), max_digits=10, decimal_places=2)
    precio_extras = models.DecimalField(_("Precio extras"), max_digits=10, decimal_places=2, default=0)
    precio_impuestos = models.DecimalField(_("Impuestos"), max_digits=10, decimal_places=2)
    descuento_promocion = models.DecimalField(_("Descuento promoción"), max_digits=10, decimal_places=2, default=0)
    precio_total = models.DecimalField(_("Precio total"), max_digits=10, decimal_places=2)
    
    # Método de pago y estado de pagos
    metodo_pago_inicial = models.CharField(_("Método de pago inicial"), max_length=20, choices=METODO_PAGO_CHOICES)
    importe_pagado_inicial = models.DecimalField(_("Importe pagado inicial"), max_digits=10, decimal_places=2, default=0)
    importe_pendiente_inicial = models.DecimalField(_("Importe pendiente inicial"), max_digits=10, decimal_places=2, default=0)
    importe_pagado_extra = models.DecimalField(_("Importe pagado extra"), max_digits=10, decimal_places=2, default=0)
    importe_pendiente_extra = models.DecimalField(_("Importe pendiente extra"), max_digits=10, decimal_places=2, default=0)
    
    # Estado y notas
    estado = models.CharField(_("Estado"), max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    notas_internas = models.TextField(_("Notas internas"), blank=True)
    referencia_externa = models.CharField(_("Referencia externa"), max_length=100, blank=True)
    
    # Campos de control
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Reserva")
        verbose_name_plural = _("Reservas")
        ordering = ['-fecha_recogida']
        indexes = [
            models.Index(
                fields=['fecha_recogida', 'fecha_devolucion'],
                name='idx_reserva_fechas'
            ),
            models.Index(
                fields=['estado', 'fecha_recogida'],
                name='idx_reserva_estado_fecha'
            ),
            models.Index(
                fields=['usuario', 'estado'],
                name='idx_reserva_usuario_estado'
            ),
        ]
    
    def __str__(self):
        return f"R{self.id} - {self.vehiculo} ({self.fecha_recogida:%d/%m/%Y})"
    
    def dias_alquiler(self):
        """Calcula el número de días de alquiler"""
        import math
        delta = self.fecha_devolucion - self.fecha_recogida
        return math.ceil(delta.total_seconds() / (24 * 3600))
    
    def importe_pendiente_total(self):
        """Calcula el importe total pendiente"""
        return self.importe_pendiente_inicial + self.importe_pendiente_extra
    
    def importe_pagado_total(self):
        """Calcula el importe total pagado"""
        return self.importe_pagado_inicial + self.importe_pagado_extra
    
    def generar_codigo_reserva(self):
        """Genera un código de reserva único"""
        if not self.id:
            return None
        return f"R{self.id:08d}"
    
    def calcular_precios(self):
        """Calcula/recalcula todos los precios de la reserva"""
        from decimal import Decimal
        
        # Cálculo de días
        dias = self.dias_alquiler()
        
        # Precio base (días * precio/día)
        self.precio_base = Decimal(dias) * self.precio_dia
        
        # Precio extras (suma de todos los extras * días)
        extras_total = Decimal('0.00')
        for extra in self.extras.all():
            extras_total += extra.precio
        self.precio_extras = extras_total
        
        # Impuestos (21% sobre base + extras)
        subtotal = self.precio_base + self.precio_extras
        self.precio_impuestos = subtotal * Decimal('0.21')
        
        # Descuento por promoción
        if self.promocion:
            descuento_porcentaje = self.promocion.descuento_pct / Decimal('100.00')
            self.descuento_promocion = subtotal * descuento_porcentaje
        else:
            self.descuento_promocion = Decimal('0.00')
        
        # Precio total
        self.precio_total = subtotal + self.precio_impuestos - self.descuento_promocion
        
        # Importes según método de pago
        if self.metodo_pago_inicial == 'tarjeta' or self.metodo_pago_inicial == 'paypal':
            self.importe_pagado_inicial = self.precio_total
            self.importe_pendiente_inicial = Decimal('0.00')
        else:  # efectivo
            self.importe_pagado_inicial = Decimal('0.00')
            self.importe_pendiente_inicial = self.precio_total
    
    def save(self, *args, **kwargs):
        # Si es nueva, calcular precios
        is_new = self.id is None
        if is_new:
            self.calcular_precios()
        
        super().save(*args, **kwargs)

class ReservaExtra(models.Model):
    reserva = models.ForeignKey(
        Reserva, related_name="extras",
        on_delete=models.CASCADE
    )
    nombre = models.CharField(_("Nombre"), max_length=100)
    descripcion = models.TextField(_("Descripción"), blank=True)
    precio = models.DecimalField(_("Precio"), max_digits=10, decimal_places=2)
    
    class Meta:
        verbose_name = _("Extra de reserva")
        verbose_name_plural = _("Extras de reserva")
    
    def __str__(self):
        return f"{self.nombre} - {self.precio}€"

class ReservaConductor(models.Model):
    ROL_CHOICES = [
        ('principal', _('Principal')),
        ('secundario', _('Secundario')),
    ]
    
    reserva = models.ForeignKey(
        Reserva, related_name="conductores",
        on_delete=models.CASCADE
    )
    nombre = models.CharField(_("Nombre"), max_length=100)
    apellidos = models.CharField(_("Apellidos"), max_length=100)
    email = models.EmailField(_("Email"))
    telefono = models.CharField(_("Teléfono"), max_length=20)
    fecha_nacimiento = models.DateField(_("Fecha de nacimiento"))
    nacionalidad = models.CharField(_("Nacionalidad"), max_length=100)
    tipo_documento = models.CharField(_("Tipo de documento"), max_length=20)
    numero_documento = models.CharField(_("Número de documento"), max_length=30)
    rol = models.CharField(_("Rol"), max_length=20, choices=ROL_CHOICES)
    
    # Dirección
    calle = models.CharField(_("Calle"), max_length=255)
    ciudad = models.CharField(_("Ciudad"), max_length=100)
    provincia = models.CharField(_("Provincia"), max_length=100)
    pais = models.CharField(_("País"), max_length=100)
    codigo_postal = models.CharField(_("Código Postal"), max_length=10)
    
    class Meta:
        verbose_name = _("Conductor")
        verbose_name_plural = _("Conductores")
        constraints = [
            models.UniqueConstraint(
                fields=['reserva', 'rol'],
                name='unique_reserva_rol'
            )
        ]
    
    def __str__(self):
        return f"{self.nombre} {self.apellidos} - {self.get_rol_display()}"
    
    def nombre_completo(self):
        """Retorna nombre completo del conductor"""
        return f"{self.nombre} {self.apellidos}"
    
    def edad(self):
        """Calcula la edad del conductor"""
        from django.utils import timezone
        import datetime
        
        hoy = timezone.now().date()
        return hoy.year - self.fecha_nacimiento.year - (
            (hoy.month, hoy.day) < (self.fecha_nacimiento.month, self.fecha_nacimiento.day)
        )

class Penalizacion(models.Model):
    reserva = models.ForeignKey(
        Reserva, related_name="penalizaciones",
        on_delete=models.CASCADE
    )
    tipo_penalizacion = models.ForeignKey(
        TipoPenalizacion, related_name="penalizaciones",
        on_delete=models.RESTRICT
    )
    importe = models.DecimalField(_("Importe"), max_digits=10, decimal_places=2)
    fecha = models.DateTimeField(_("Fecha"))
    descripcion = models.TextField(_("Descripción"), blank=True)
    aplicada = models.BooleanField(_("Aplicada"), default=False)
    
    class Meta:
        verbose_name = _("Penalización")
        verbose_name_plural = _("Penalizaciones")
        ordering = ['-fecha']
    
    def __str__(self):
        return f"{self.tipo_penalizacion} - {self.importe}€"