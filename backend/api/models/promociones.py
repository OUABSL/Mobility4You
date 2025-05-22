# api/models/marketing.py
from django.db import models
from django.utils.translation import gettext_lazy as _

class Promocion(models.Model):
    nombre = models.CharField(_("Nombre"), max_length=100)
    descripcion = models.TextField(_("Descripción"), blank=True)
    codigo = models.CharField(_("Código promocional"), max_length=20, blank=True)
    descuento_pct = models.DecimalField(_("Descuento (%)"), max_digits=5, decimal_places=2)
    fecha_inicio = models.DateField(_("Fecha de inicio"))
    fecha_fin = models.DateField(_("Fecha de fin"))
    activo = models.BooleanField(_("Activo"), default=True)
    limitada = models.BooleanField(_("Limitada"), default=False)
    limite_usos = models.PositiveIntegerField(_("Límite de usos"), null=True, blank=True)
    usos_actuales = models.PositiveIntegerField(_("Usos actuales"), default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Promoción")
        verbose_name_plural = _("Promociones")
        ordering = ['-fecha_inicio']
        indexes = [
            models.Index(fields=['activo', 'fecha_inicio', 'fecha_fin']),
        ]
    
    def __str__(self):
        return f"{self.nombre} ({self.descuento_pct}%)"
    
    def esta_vigente(self):
        """Verifica si la promoción está vigente"""
        from django.utils import timezone
        hoy = timezone.now().date()
        
        if not self.activo:
            return False
            
        if self.limitada and self.usos_actuales >= self.limite_usos:
            return False
            
        return self.fecha_inicio <= hoy <= self.fecha_fin