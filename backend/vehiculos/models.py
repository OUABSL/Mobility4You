# vehiculos/models.py
import logging
import os
from decimal import Decimal
from typing import Any, Optional

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.validators import (MaxValueValidator, MinValueValidator,
                                    RegexValidator)
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


def imagen_vehiculo_upload_path(instance: Any, filename: str) -> str:
    """
    Genera la ruta de carga para las imágenes de vehículos
    Usa un sistema de nombrado predecible y único que permite recuperación
    """
    import uuid
    from datetime import datetime

    # Extraer la extensión del archivo original
    ext = filename.split(".")[-1].lower() if "." in filename else "jpg"
    
    # Generar un nombre único pero recuperable
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    
    # ID del vehículo para organización y recuperación
    vehiculo_id = getattr(instance.vehiculo, 'id', 'new') if hasattr(instance, 'vehiculo') and instance.vehiculo else 'new'
    
    # Crear un nombre estructurado: vehiculo_ID_timestamp_uuid.ext
    filename = f"vehiculo_{vehiculo_id}_{timestamp}_{unique_id}.{ext}"

    # Retornar la ruta organizada por año/mes para mejor estructura
    year_month = datetime.now().strftime("%Y/%m")
    return os.path.join("vehiculos", year_month, filename)


# ======================
# MODELOS DE VEHÍCULOS
# ======================


class Categoria(models.Model):
    nombre = models.CharField(
        _("Nombre"), max_length=100, unique=True, null=False, blank=False
    )
    descripcion = models.TextField(_("Descripción"), null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "categoria"
        verbose_name = _("Categoría")
        verbose_name_plural = _("Categorías")
        ordering = ["nombre"]

    def __str__(self) -> str:
        return self.nombre


class GrupoCoche(models.Model):
    nombre = models.CharField(
        _("Nombre"), max_length=100, unique=True, null=False, blank=False
    )
    edad_minima = models.PositiveSmallIntegerField(
        _("Edad mínima"),
        null=False,
        default=21,
        validators=[MinValueValidator(18), MaxValueValidator(99)],
    )
    descripcion = models.TextField(_("Descripción"), null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "grupo_coche"
        verbose_name = _("Grupo de coche (catalogue)")
        verbose_name_plural = _("Grupos de coches (catalogue)")
        ordering = ["nombre"]

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.nombre


class Vehiculo(models.Model):
    COMBUSTIBLE_CHOICES = [
        ("Gasolina", _("Gasolina")),
        ("Diesel", _("Diésel")),
        ("Híbrido", _("Híbrido")),
        ("Eléctrico", _("Eléctrico")),
    ]

    categoria = models.ForeignKey(
        Categoria, related_name="vehiculos", on_delete=models.RESTRICT, null=False, blank=False
    )
    grupo = models.ForeignKey(
        GrupoCoche, related_name="vehiculos", on_delete=models.RESTRICT, null=False, blank=False
    )
    combustible = models.CharField(
        _("Combustible"),
        max_length=20,
        choices=COMBUSTIBLE_CHOICES,
        null=False,
        blank=False,
    )
    marca = models.CharField(_("Marca"), max_length=100, null=False, blank=False)
    modelo = models.CharField(_("Modelo"), max_length=100, null=False, blank=False)
    matricula = models.CharField(
        _("Matrícula"), max_length=20, unique=True, null=False, blank=False
    )
    anio = models.PositiveIntegerField(
        _("Año"),
        null=False,
        validators=[MinValueValidator(2000), MaxValueValidator(2030)],
    )
    color = models.CharField(_("Color"), max_length=50, null=False, blank=False)
    num_puertas = models.PositiveSmallIntegerField(
        _("Número de puertas"),
        null=False,
        validators=[MinValueValidator(2), MaxValueValidator(5)],
    )
    num_pasajeros = models.PositiveSmallIntegerField(
        _("Número de pasajeros"),
        null=False,
        validators=[MinValueValidator(2), MaxValueValidator(9)],
    )
    capacidad_maletero = models.PositiveIntegerField(
        _("Capacidad maletero (L)"), null=False, validators=[MinValueValidator(0)]
    )
    disponible = models.BooleanField(_("Disponible"), default=False, null=False)
    activo = models.BooleanField(_("Activo"), default=False, null=False)
    notas_internas = models.TextField(_("Notas internas"), null=True, blank=True)
    fianza = models.DecimalField(
        _("Fianza"),
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        null=False,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    kilometraje = models.PositiveIntegerField(
        _("Kilometraje"), blank=True, null=True, validators=[MinValueValidator(0)]
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "vehiculo"
        verbose_name = _("Vehículo")
        verbose_name_plural = _("Vehículos")
        ordering = ["marca", "modelo"]
        indexes = [
            models.Index(fields=["disponible", "activo"]),
            models.Index(fields=["marca", "modelo"]),
            models.Index(fields=["matricula"]),
        ]

    def __str__(self) -> str:
        return f"{self.marca} {self.modelo} ({self.matricula})"

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def precio_dia_actual(self) -> Decimal:
        """
        Obtiene el precio por día actual del vehículo desde las tarifas vigentes
        """
        from django.db.models import Q
        from django.utils import timezone

        try:
            today = timezone.now().date()

            # Buscar tarifa vigente
            tarifa = (
                self.tarifas.filter(fecha_inicio__lte=today)
                .filter(Q(fecha_fin__gte=today) | Q(fecha_fin__isnull=True))
                .order_by("-fecha_inicio")
                .first()
            )

            if tarifa and hasattr(tarifa, "precio_dia"):
                return tarifa.precio_dia
            return Decimal("0.00")
        except Exception as e:
            import logging
            
            logger.error(
                f"Error obteniendo precio actual para vehículo {self.id}: {str(e)}"
            )
            return Decimal("0.00")

    @property
    def precio_dia(self) -> Decimal:
        """Alias para compatibilidad con código existente"""
        return self.precio_dia_actual

    def get_precio_para_fechas(
        self, fecha_inicio: Any, fecha_fin: Optional[Any] = None
    ) -> Decimal:
        """
        Obtiene el precio por día para un rango de fechas específico
        """
        from django.db.models import Q
        from django.utils import timezone

        try:
            if isinstance(fecha_inicio, str):
                fecha_inicio = timezone.datetime.fromisoformat(
                    fecha_inicio.replace("Z", "+00:00")
                ).date()
            elif hasattr(fecha_inicio, "date"):
                fecha_inicio = fecha_inicio.date()

            # Buscar tarifa vigente para la fecha de inicio
            tarifa = (
                self.tarifas.filter(fecha_inicio__lte=fecha_inicio)
                .filter(Q(fecha_fin__gte=fecha_inicio) | Q(fecha_fin__isnull=True))
                .order_by("-fecha_inicio")
                .first()
            )

            if tarifa and hasattr(tarifa, "precio_dia"):
                return tarifa.precio_dia
            return Decimal("0.00")
        except Exception as e:
            import logging

            logger = logging.getLogger(__name__)
            logger.error(
                f"Error obteniendo precio para fechas en vehículo {self.id}: {str(e)}"
            )
            return Decimal("0.00")


class ImagenVehiculo(models.Model):
    vehiculo = models.ForeignKey(
        Vehiculo, related_name="imagenes", on_delete=models.CASCADE, null=False
    )
    imagen = models.ImageField(
        _("Imagen del vehículo"),
        upload_to=imagen_vehiculo_upload_path,
        null=True,
        blank=True,
        help_text=_("Imagen del vehículo que se guardará en la carpeta especificada"),
    )
    portada = models.BooleanField(
        _("¿Es Imagen de portada?"), default=False, null=False
    )
    ancho = models.PositiveIntegerField(_("Ancho"), null=True, blank=True)
    alto = models.PositiveIntegerField(_("Alto"), null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "imagen_vehiculo"
        verbose_name = _("Imagen de vehículo")
        verbose_name_plural = _("Imágenes de vehículos")
        ordering = ["vehiculo", "-portada"]
        indexes = [
            models.Index(fields=["vehiculo", "portada"]),
        ]

    def __str__(self) -> str:
        return f"Imagen de {self.vehiculo}"

    def save(self, *args: Any, **kwargs: Any) -> None:
        # Actualizar timestamps
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()

        # Si esta imagen se marca como portada, desmarcar las demás portadas del mismo vehículo
        if self.portada and self.vehiculo_id:
            ImagenVehiculo.objects.filter(
                vehiculo=self.vehiculo, portada=True
            ).exclude(id=self.id).update(portada=False)

        # Guardar directamente - el upload_path genera nombres únicos
        super().save(*args, **kwargs)
        
        # Extraer dimensiones de la imagen si está disponible
        if self.imagen and hasattr(self.imagen, 'width') and hasattr(self.imagen, 'height'):
            if not self.ancho or not self.alto:
                self.ancho = self.imagen.width
                self.alto = self.imagen.height
                # Guardar solo los campos de dimensiones para evitar loop infinito
                ImagenVehiculo.objects.filter(id=self.id).update(
                    ancho=self.ancho, alto=self.alto
                )


class TarifaVehiculo(models.Model):
    vehiculo = models.ForeignKey(
        Vehiculo, related_name="tarifas", on_delete=models.CASCADE, null=False
    )
    fecha_inicio = models.DateField(
        _("Fecha de inicio"), default=timezone.now, null=False
    )
    fecha_fin = models.DateField(
        _("Fecha de fin"),
        null=True,
        blank=True,
        help_text=_("Dejar en blanco para tarifa indefinida"),
    )
    precio_dia = models.DecimalField(
        _("Precio por día"),
        max_digits=8,
        decimal_places=2,
        null=False,
        validators=[MinValueValidator(Decimal("0.01"))],
    )

    class Meta:
        db_table = "tarifa_vehiculo"
        verbose_name = _("Tarifa de vehículo")
        verbose_name_plural = _("Tarifas de vehículos")
        unique_together = [["vehiculo", "fecha_inicio"]]
        indexes = [
            models.Index(
                fields=["vehiculo", "fecha_inicio", "fecha_fin"],
                name="idx_tarifa_vehiculo_periodo",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.vehiculo} - {self.precio_dia}€/día ({self.fecha_inicio} a {self.fecha_fin})"

    def save(self, *args: Any, **kwargs: Any) -> None:
        if hasattr(self, "fecha") and isinstance(
            self._meta.get_field("fecha"), models.DateField
        ):
            if self.fecha and hasattr(self.fecha, "date"):
                self.fecha = self.fecha.date()
        super().save(*args, **kwargs)


class Mantenimiento(models.Model):
    vehiculo = models.ForeignKey(
        Vehiculo, related_name="mantenimientos", on_delete=models.CASCADE, null=False
    )
    fecha = models.DateTimeField(_("Fecha"), default=timezone.now, null=False)
    tipo_servicio = models.CharField(
        _("Tipo de servicio"), max_length=200, null=False, blank=False
    )
    coste = models.DecimalField(
        _("Coste"),
        max_digits=10,
        decimal_places=2,
        null=True,
        help_text=_(
            "Coste del servicio de mantenimiento: Se puede dejar en blanco si se desea."
        ),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    notas = models.TextField(_("Notas"), blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "mantenimiento"
        verbose_name = _("Mantenimiento")
        verbose_name_plural = _("Mantenimientos")
        ordering = ["-fecha"]
        indexes = [
            models.Index(fields=["vehiculo", "fecha"]),
        ]

    def __str__(self) -> str:
        return f"{self.vehiculo} - {self.tipo_servicio} ({self.fecha:%Y-%m-%d})"

    def save(self, *args: Any, **kwargs: Any) -> None:
        if hasattr(self, "fecha") and isinstance(
            self._meta.get_field("fecha"), models.DateField
        ):
            if self.fecha and hasattr(self.fecha, "date"):
                self.fecha = self.fecha.date()
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)
