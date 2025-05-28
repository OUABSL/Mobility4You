# api/models/promociones.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from django.utils import timezone

class Promocion(models.Model):
    nombre = models.CharField(
        _("Nombre"),
        max_length=100,
        null=False,
        blank=False
    )
    descripcion = models.TextField(
        _("Descripción"),
        null=True,
        blank=True
    )
    descuento_pct = models.DecimalField(
        _("Descuento (%)"),
        max_digits=5,
        decimal_places=2,
        null=False,
        validators=[
            MinValueValidator(Decimal('0.00')),
            MaxValueValidator(Decimal('100.00'))
        ]
    )
    fecha_inicio = models.DateField(
        _("Fecha de inicio"),
        null=False
    )
    fecha_fin = models.DateField(
        _("Fecha de fin"),
        null=False
    )
    activo = models.BooleanField(
        _("Activo"),
        default=True,
        null=False
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'promocion'
        verbose_name = _("Promoción")
        verbose_name_plural = _("Promociones")
        ordering = ['-fecha_inicio']
        indexes = [
            models.Index(fields=['activo', 'fecha_inicio', 'fecha_fin']),
        ]
    
    def save(self, *args, **kwargs):
        """Sobrescribe el método save para actualizar los campos de fecha"""
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.nombre} ({self.descuento_pct}%)"
