# api/models/politicasPago.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.utils import timezone

class PoliticaPago(models.Model):
    titulo = models.CharField(
        _("Título"),
        max_length=100,
        null=False,
        blank=False
    )
    deductible = models.DecimalField(
        _("Deductible"),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        null=False,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    descripcion = models.TextField(
        _("Descripción"),
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'politica_pago'
        verbose_name = _("Política de pago")
        verbose_name_plural = _("Políticas de pago")
        ordering = ["titulo"]
    
    def save(self, *args, **kwargs):
        """Sobrescribe el método save para actualizar los campos de fecha"""
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)
        
    
    def __str__(self):
        return self.titulo
    

class PoliticaIncluye(models.Model):
    politica = models.ForeignKey(
        PoliticaPago,
        related_name="items",
        on_delete=models.CASCADE,
        null=False
    )
    item = models.CharField(
        _("Item"),
        max_length=255,
        null=False,
        blank=False
    )
    incluye = models.BooleanField(
        _("Incluye"),
        default=True,
        null=False
    )
    
    class Meta:
        db_table = 'politica_incluye'
        verbose_name = _("Item de política")
        verbose_name_plural = _("Items de políticas")
        unique_together = [['politica', 'item']]
    
    def __str__(self):
        status = "Incluido" if self.incluye else "No incluido"
        return f"{self.item} - {status}"


# TipoPenalizacion: Define los tipos de penalizaciones posibles en el sistema, por ejemplo: "cancelación", "devolución tardía", "recogida tardía".
class TipoPenalizacion(models.Model):
    #TODO: Discutir los tipos de penalización y tarifas
    TIPO_TARIFA_CHOICES = [
        ('porcentaje', _('Porcentaje')),
        ('fijo', _('Fijo')),
        ('importe_dia', _('Importe por día')),
    ]
    
    nombre = models.CharField(
        _("Nombre"),
        max_length=100,
        unique=True,
        null=False,
        blank=False,
        help_text=_("Nombre del tipo de penalización p.e cancelación | devolución tardía | recogida tardía | etc.")
    )
    tipo_tarifa = models.CharField(
        _("Tipo de tarifa"),
        max_length=20,
        choices=TIPO_TARIFA_CHOICES,
        null=False,
        blank=False,
        help_text=_("Tipo de tarifa para calcular la penalización")
    )
    
    class Meta:
        db_table = 'tipo_penalizacion'
        verbose_name = _("Tipo de penalización")
        verbose_name_plural = _("Tipos de penalización")
        ordering = ["nombre"]
    
    def __str__(self):
        return f"{self.nombre} ({self.get_tipo_tarifa_display()})"


#PoliticaPenalizacion Relaciona una política de pago concreta con los tipos de penalización que le aplican y bajo qué condiciones.
class PoliticaPenalizacion(models.Model):
    politica_pago = models.ForeignKey(
        PoliticaPago,
        related_name="penalizaciones",
        on_delete=models.CASCADE,
        help_text=_("Política de pago a la que se aplica la penalización: Se define una política de pago y se le pueden asociar penalizaciones."),
        null=False
    )
    tipo_penalizacion = models.ForeignKey(
        TipoPenalizacion,
        related_name="politicas",
        on_delete=models.CASCADE,
        null=False
    )
    horas_previas = models.PositiveSmallIntegerField(
        _("Horas previas"),
        default=0,
        null=False,
        help_text=_("Horas previas a la penalización: Se define el número de horas antes de la penalización, por ejemplo, 24h antes de la recogida."),
        validators=[MinValueValidator(0)]
    )
    
    class Meta:
        db_table = 'politica_penalizacion'
        verbose_name = _("Política de penalización")
        verbose_name_plural = _("Políticas de penalización")
        unique_together = [['politica_pago', 'tipo_penalizacion']]
    
    def __str__(self):
        return f"{self.politica_pago} - {self.tipo_penalizacion} ({self.horas_previas}h)"