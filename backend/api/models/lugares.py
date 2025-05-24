# api/models/lugares.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import RegexValidator
from django.utils import timezone

class Direccion(models.Model):
    calle = models.CharField(
        _("Calle"),
        max_length=255,
        null=True,
        blank=True
    )
    ciudad = models.CharField(
        _("Ciudad"),
        max_length=100,
        null=True,
        blank=True
    )
    provincia = models.CharField(
        _("Provincia"),
        max_length=100,
        null=True,
        blank=True
    )
    pais = models.CharField(
        _("País"),
        max_length=100,
        default='España',  # España por defecto
        null=False,
        blank=False
    )
    codigo_postal = models.CharField(
        _("Código Postal"),
        max_length=10,
        null=False,
        blank=False,
        validators=[
            RegexValidator(
                regex=r'^\d{4,10}$',
                message='Código postal inválido'
            )
        ]
    )
    
    class Meta:
        db_table = 'direccion'
        verbose_name = _("Dirección")
        verbose_name_plural = _("Direcciones")
        indexes = [
            models.Index(fields=["ciudad", "provincia", "pais"]),
        ]
    
    def __str__(self):
        return f"{self.calle}, {self.ciudad} {self.codigo_postal}"
    
    def save(self, *args, **kwargs):
        # Normalizar a minúsculas según esquema
        self.ciudad = self.ciudad.lower()
        self.provincia = self.provincia.lower()
        self.pais = self.pais.lower()
        super().save(*args, **kwargs)

class Lugar(models.Model):
    nombre = models.CharField(
        _("Nombre"),
        max_length=100,
        null=False,
        blank=False
    )
    direccion = models.OneToOneField(
        Direccion,
        related_name="lugar",
        on_delete=models.RESTRICT,
        null=False
    )
    latitud = models.DecimalField(
        _("Latitud"),
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )
    longitud = models.DecimalField(
        _("Longitud"),
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )
    telefono = models.CharField(
        _("Teléfono"),
        max_length=20,
        null=True,
        blank=True,
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message='Número de teléfono inválido'
            )
        ]
    )
    email = models.EmailField(
        _("Email"),
        null=True,
        blank=True
    )
    icono_url = models.CharField(
        _("Icono"),
        max_length=200,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'lugar'
        verbose_name = _("Lugar")
        verbose_name_plural = _("Lugares")
        ordering = ["nombre"]
        indexes = [
            models.Index(fields=["nombre"]),
            models.Index(fields=["latitud", "longitud"]),
        ]
    
    def save(self, *args, **kwargs):
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)
        
    def get_full_address(self):
        """Devuelve la dirección completa del lugar."""
        return f"{self.direccion.calle}, {self.direccion.ciudad}, {self.direccion.provincia}, {self.direccion.pais}, {self.direccion.codigo_postal}"
    
    def get_coordinates(self):
        """Devuelve las coordenadas del lugar."""
        return {
            "latitud": self.latitud,
            "longitud": self.longitud
        }
        
    def __str__(self):
        return self.nombre