from django.db import models
from django.utils.translation import gettext_lazy as _

class PoliticaPago(models.Model):
    titulo = models.CharField(_("Título"), max_length=100)
    descripcion = models.TextField(_("Descripción"))
    deductible = models.DecimalField(_("Franquicia"), max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Política de pago")
        verbose_name_plural = _("Políticas de pago")
        ordering = ["titulo"]
        indexes = [
            models.Index(fields=["titulo"]),
        ]
    
    def __str__(self):
        return self.titulo

class PoliticaIncluye(models.Model):
    politica = models.ForeignKey(
        PoliticaPago, related_name="items", 
        on_delete=models.CASCADE
    )
    item = models.CharField(_("Item"), max_length=255)
    incluye = models.BooleanField(_("Incluido"), default=True)
    
    class Meta:
        verbose_name = _("Item de política")
        verbose_name_plural = _("Items de políticas")
        unique_together = (('politica', 'item'),)
        indexes = [
            models.Index(fields=['politica', 'incluye']),
        ]
    
    def __str__(self):
        status = _("Incluido") if self.incluye else _("No incluido")
        return f"{self.item} - {status}"

class TipoPenalizacion(models.Model):
    TIPO_TARIFA_CHOICES = [
        ('porcentaje', _('Porcentaje')),
        ('fijo', _('Importe fijo')),
        ('importe_dia', _('Importe por día')),
    ]
    
    nombre = models.CharField(_("Nombre"), max_length=100, unique=True)
    tipo_tarifa = models.CharField(_("Tipo de tarifa"), max_length=20, choices=TIPO_TARIFA_CHOICES)
    valor_tarifa = models.DecimalField(_("Valor"), max_digits=10, decimal_places=2)
    descripcion = models.TextField(_("Descripción"), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Tipo de penalización")
        verbose_name_plural = _("Tipos de penalización")
        ordering = ["nombre"]
        indexes = [
            models.Index(fields=["nombre", "tipo_tarifa"]),
        ]
    
    def __str__(self):
        return f"{self.nombre} ({self.get_tipo_tarifa_display()}: {self.valor_tarifa})"

class PoliticaPenalizacion(models.Model):
    politica = models.ForeignKey(
        PoliticaPago, related_name="penalizaciones", 
        on_delete=models.CASCADE
    )
    tipo_penalizacion = models.ForeignKey(
        TipoPenalizacion, related_name="politicas_pago", 
        on_delete=models.CASCADE
    )
    horas_previas = models.PositiveSmallIntegerField(_("Horas previas"))
    
    class Meta:
        verbose_name = _("Política de penalización")
        verbose_name_plural = _("Políticas de penalización")
        unique_together = (('politica', 'tipo_penalizacion'),)
        indexes = [
            models.Index(fields=['politica', 'tipo_penalizacion']),
        ]
    
    def __str__(self):
        return f"{self.politica} - {self.tipo_penalizacion} ({self.horas_previas}h)"