# lugares/models.py
import os
from typing import Any

from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Direccion(models.Model):
    calle = models.CharField(_("Calle"), max_length=255, null=True, blank=True)
    ciudad = models.CharField(_("Ciudad"), max_length=100, null=True, blank=True)
    provincia = models.CharField(_("Provincia"), max_length=100, null=True, blank=True)
    pais = models.CharField(
        _("País"),
        max_length=100,
        default="España",
        null=False,
        blank=False,
    )
    codigo_postal = models.CharField(
        _("Código Postal"),
        max_length=10,
        null=False,
        blank=False,
        validators=[
            RegexValidator(regex=r"^\d{4,10}$", message="Código postal inválido")
        ],
    )

    class Meta:
        db_table = "direccion"
        verbose_name = _("Dirección")
        verbose_name_plural = _("Direcciones")
        ordering = ["ciudad", "provincia"]

    def __str__(self) -> str:
        partes = []
        if self.calle:
            partes.append(self.calle)
        if self.ciudad:
            partes.append(self.ciudad)
        if self.provincia:
            partes.append(self.provincia)
        if self.codigo_postal:
            partes.append(self.codigo_postal)
        return ", ".join(partes) if partes else f"Dirección #{self.id}"

    def save(self, *args: Any, **kwargs: Any) -> None:
        # Normalizar datos antes de guardar
        if self.ciudad:
            self.ciudad = self.ciudad.strip().title()
        if self.provincia:
            self.provincia = self.provincia.strip().title()
        if self.pais:
            self.pais = self.pais.strip().title()
        super().save(*args, **kwargs)


class Lugar(models.Model):
    nombre = models.CharField(_("Nombre"), max_length=100, null=False, blank=False)
    direccion = models.OneToOneField(
        Direccion, related_name="lugar", on_delete=models.RESTRICT, null=False
    )
    latitud = models.DecimalField(
        _("Latitud"), max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitud = models.DecimalField(
        _("Longitud"), max_digits=9, decimal_places=6, null=True, blank=True
    )
    telefono = models.CharField(
        _("Teléfono"),
        max_length=20,
        null=True,
        blank=True,
        validators=[
            RegexValidator(
                regex=r"^\+?1?\d{9,15}$", message="Número de teléfono inválido"
            )
        ],
    )
    email = models.EmailField(_("Email"), null=True, blank=True)
    icono_url = models.CharField(_("Icono"), max_length=200, null=True, blank=True)
    info_adicional = models.TextField(_("Información adicional"), null=True, blank=True)
    activo = models.BooleanField(_("Activo"), default=True)
    popular = models.BooleanField(_("Lugar popular"), default=False)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "lugar"
        verbose_name = _("Lugar")
        verbose_name_plural = _("Lugares")
        ordering = ["nombre"]

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    def get_full_address(self) -> str:
        """Obtiene la dirección completa del lugar"""
        if self.direccion:
            return str(self.direccion)
        return ""

    def get_coordinates(self) -> dict[str, Any]:
        """Obtiene las coordenadas del lugar"""
        return {
            "latitud": float(self.latitud) if self.latitud else None,
            "longitud": float(self.longitud) if self.longitud else None,
        }

    def __str__(self) -> str:
        return self.nombre
