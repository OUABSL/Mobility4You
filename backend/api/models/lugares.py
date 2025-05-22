# api/models/lugares.py
from django.db import models
from django.utils.translation import gettext_lazy as _

class Direccion(models.Model):
    calle = models.CharField(_("Calle"), max_length=255)
    ciudad = models.CharField(_("Ciudad"), max_length=100)
    provincia = models.CharField(_("Provincia"), max_length=100)
    pais = models.CharField(_("País"), max_length=100)
    codigo_postal = models.CharField(_("Código Postal"), max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Dirección")
        verbose_name_plural = _("Direcciones")
        indexes = [
            models.Index(fields=["ciudad", "provincia", "pais"]),
        ]
    
    def __str__(self):
        return f"{self.calle}, {self.ciudad}, {self.provincia}, {self.pais} ({self.codigo_postal})"
    
    def save(self, *args, **kwargs):
        # Normalizar a minúsculas
        self.ciudad = self.ciudad.lower()
        self.provincia = self.provincia.lower()
        self.pais = self.pais.lower()
        super().save(*args, **kwargs)

class Lugar(models.Model):
    nombre = models.CharField(_("Nombre"), max_length=100)
    direccion = models.ForeignKey(
        Direccion, related_name="lugares", 
        on_delete=models.RESTRICT, null=True, blank=True
    )
    latitud = models.DecimalField(_("Latitud"), max_digits=9, decimal_places=6)
    longitud = models.DecimalField(_("Longitud"), max_digits=9, decimal_places=6)
    telefono = models.CharField(_("Teléfono"), max_length=20, blank=True)
    email = models.EmailField(_("Email"), blank=True)
    activo = models.BooleanField(_("Activo"), default=True)
    horario = models.CharField(_("Horario de apertura"), max_length=100, null=True, blank=True)
    icono_url = models.CharField(_("Icono"), max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Lugar")
        verbose_name_plural = _("Lugares")
        ordering = ["nombre"]
        indexes = [
            models.Index(fields=["nombre", "latitud", "longitud"]),
        ]
    
    def __str__(self):
        return self.nombre
    
    def horario_formateado(self):
        """Retorna horario formateado para mostrar"""
        if self.horario_apertura and self.horario_cierre:
            return f"{self.horario_apertura:%H:%M} - {self.horario_cierre:%H:%M}"
        return "Horario no disponible"