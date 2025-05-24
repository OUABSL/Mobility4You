# api/models/facturacion.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.utils import timezone

#TODO: DISCUTIR DETALLES DE LOS CONTRATOS Y FACTURACIONES, ESTABLECER LOS DATOS REQUERIDOS Y POSIBLES CAMBIOS EN LA LÓGICA

class Contrato(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', _('Pendiente')),
        ('firmado', _('Firmado')),
        ('anulado', _('Anulado')),
    ]
    
    reserva = models.ForeignKey(
        'Reserva',
        related_name="contratos",
        on_delete=models.CASCADE,
        null=False
    )
    numero_contrato = models.CharField(
        _("Número de contrato"),
        max_length=50,
        unique=True,
        null=False,
        blank=False
    )
    fecha_firma = models.DateField(
        _("Fecha de firma"),
        null=True,
        blank=True
    )
    condiciones = models.TextField(
        _("Condiciones"),
        null=True,
        blank=True
    )
    url_pdf = models.URLField(
        _("URL del PDF"),
        max_length=500,
        null=True,
        blank=True
    )
    estado = models.CharField(
        _("Estado"),
        max_length=20,
        choices=ESTADO_CHOICES,
        default='pendiente',
        null=False
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'contrato'
        verbose_name = _("Contrato")
        verbose_name_plural = _("Contratos")
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['numero_contrato']),
            models.Index(fields=['estado', 'fecha_firma']),
        ]
    
    def __str__(self):
        return f"Contrato {self.numero_contrato} - {self.estado}"

class Factura(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', _('Pendiente')),
        ('emitida', _('Emitida')),
        ('anulada', _('Anulada')),
    ]
    
    reserva = models.ForeignKey(
        'Reserva',
        related_name="facturas",
        on_delete=models.CASCADE,
        null=False
    )
    numero_factura = models.CharField(
        _("Número de factura"),
        max_length=50,
        unique=True,
        null=False,
        blank=False
    )
    fecha_emision = models.DateField(
        _("Fecha de emisión"),
        null=False
    )
    base_imponible = models.DecimalField(
        _("Base imponible"),
        max_digits=10,
        decimal_places=2,
        null=False,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    iva = models.DecimalField(
        _("IVA"),
        max_digits=10,
        decimal_places=2,
        null=False,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    total = models.DecimalField(
        _("Total"),
        max_digits=10,
        decimal_places=2,
        null=False,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    url_pdf = models.URLField(
        _("URL del PDF"),
        max_length=500,
        null=True,
        blank=True
    )
    estado = models.CharField(
        _("Estado"),
        max_length=20,
        choices=ESTADO_CHOICES,
        default='pendiente',
        null=False
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'factura'
        verbose_name = _("Factura")
        verbose_name_plural = _("Facturas")
        ordering = ['-fecha_emision']
        indexes = [
            models.Index(fields=['numero_factura']),
            models.Index(fields=['estado', 'fecha_emision']),
        ]
    
    def __str__(self):
        return f"Factura {self.numero_factura} - {self.total}€"