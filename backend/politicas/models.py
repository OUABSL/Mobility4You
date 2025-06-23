# politicas/models.py
from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class PoliticaPago(models.Model):
    titulo = models.CharField(_("Título"), max_length=100, null=False, blank=False)
    deductible = models.DecimalField(
        _("Deductible"),
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        null=False,
        validators=[MinValueValidator(Decimal("0.00"))],
    )    
    descripcion = models.TextField(_("Descripción"), null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = _("Política de Pago")
        verbose_name_plural = _("Políticas de Pago")
        ordering = ["-created_at"]
        db_table = "politica_pago"

    def save(self, *args, **kwargs):
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.titulo} - Deducible: €{self.deductible}"

    def obtener_penalizacion_aplicable(self, tipo_penalizacion_nombre, horas_previas):
        """
        Obtiene la penalización aplicable según el tipo y las horas previas
        """
        try:
            return self.penalizaciones.get(
                tipo_penalizacion__nombre=tipo_penalizacion_nombre,
                horas_previas__lte=horas_previas
            )
        except PoliticaPenalizacion.DoesNotExist:
            return None

    def get_resumen_incluye(self):
        """Devuelve un resumen de qué incluye la política"""
        items = self.items.all()
        if not items.exists():
            return "Sin items definidos"
        
        incluidos = [item.item for item in items if item.incluye]
        no_incluidos = [item.item for item in items if not item.incluye]
        
        resumen = []
        if incluidos:
            resumen.append(f"Incluye: {', '.join(incluidos)}")
        if no_incluidos:
            resumen.append(f"No incluye: {', '.join(no_incluidos)}")
        
        return " | ".join(resumen)

    def get_resumen_penalizaciones(self):
        """Devuelve un resumen de las penalizaciones"""
        penalizaciones = self.penalizaciones.all()
        if not penalizaciones.exists():
            return "Sin penalizaciones"
        
        resumen = []
        for pen in penalizaciones:
            resumen.append(f"{pen.tipo_penalizacion.nombre} ({pen.horas_previas}h)")
        
        return ", ".join(resumen)


class PoliticaIncluye(models.Model):
    politica = models.ForeignKey(
        PoliticaPago, related_name="items", on_delete=models.CASCADE, null=False
    )
    item = models.CharField(_("Item"), max_length=255, null=False, blank=False)
    incluye = models.BooleanField(_("Incluye"), default=True, null=False)

    class Meta:
        verbose_name = _("Item Incluido")
        verbose_name_plural = _("Items Incluidos")
        unique_together = ("politica", "item")
        db_table = "politica_incluye"

    def __str__(self):
        estado = "Incluye" if self.incluye else "No incluye"
        return f"{self.politica.titulo} - {estado}: {self.item}"


class TipoPenalizacion(models.Model):
    TIPO_TARIFA_CHOICES = [
        ("porcentaje", _("Porcentaje")),
        ("fijo", _("Fijo")),
        ("importe_dia", _("Importe por día")),
    ]

    nombre = models.CharField(
        _("Nombre"),
        max_length=100,
        unique=True,
        null=False,
        blank=False,
        help_text=_(
            "Nombre del tipo de penalización p.e cancelación | devolución tardía | recogida tardía | etc."
        ),
    )
    tipo_tarifa = models.CharField(
        _("Tipo de tarifa"),
        max_length=20,
        choices=TIPO_TARIFA_CHOICES,
        null=False,
        blank=False,
        help_text=_("Tipo de tarifa para calcular la penalización"),
    )
    valor_tarifa = models.DecimalField(
        _("Valor de la tarifa"),
        max_digits=10,
        decimal_places=2,
        null=False,
        help_text=_("Valor en euros o porcentaje según el tipo de tarifa"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    class Meta:
        verbose_name = _("Tipo de Penalización")
        verbose_name_plural = _("Tipos de Penalización")
        ordering = ["nombre"]
        db_table = "tipo_penalizacion"

    def __str__(self):
        if self.tipo_tarifa == "porcentaje":
            return f"{self.nombre} - {self.valor_tarifa}%"
        else:
            return f"{self.nombre} - €{self.valor_tarifa}"


class PoliticaPenalizacion(models.Model):
    politica = models.ForeignKey(
        PoliticaPago, related_name="penalizaciones", on_delete=models.CASCADE, null=False
    )
    tipo_penalizacion = models.ForeignKey(
        TipoPenalizacion, related_name="politicas", on_delete=models.CASCADE, null=False
    )
    horas_previas = models.PositiveIntegerField(
        _("Horas previas"),
        null=False,
        help_text=_("Número de horas previas al evento para aplicar esta penalización"),
        validators=[MinValueValidator(1), MaxValueValidator(8760)],  # máximo 1 año
    )

    class Meta:
        verbose_name = _("Penalización de Política")
        verbose_name_plural = _("Penalizaciones de Política")
        unique_together = ("politica", "tipo_penalizacion")
        db_table = "politica_penalizacion"

    def __str__(self):
        return f"{self.politica.titulo} - {self.tipo_penalizacion.nombre} ({self.horas_previas}h)"


class Promocion(models.Model):
    nombre = models.CharField(_("Nombre"), max_length=100, null=False, blank=False)
    descripcion = models.TextField(_("Descripción"), null=True, blank=True)
    descuento_pct = models.DecimalField(
        _("Descuento (%)"),
        max_digits=5,
        decimal_places=2,
        null=False,
        validators=[MinValueValidator(Decimal("0.01")), MaxValueValidator(Decimal("100.00"))],
        help_text=_("Porcentaje de descuento (1.00 = 1%)"),
    )
    fecha_inicio = models.DateField(_("Fecha de inicio"), null=False)
    fecha_fin = models.DateField(_("Fecha de fin"), null=False)
    activo = models.BooleanField(_("Activo"), default=True, null=False)

    class Meta:
        verbose_name = _("Promoción")
        verbose_name_plural = _("Promociones")
        ordering = ["-fecha_inicio"]
        db_table = "promocion"

    def __str__(self):
        return f"{self.nombre} - {self.descuento_pct}%"

    def is_vigente(self):
        """Verifica si la promoción está vigente"""
        now = timezone.now().date()
        return self.activo and self.fecha_inicio <= now <= self.fecha_fin

    def dias_restantes(self):
        """Calcula los días restantes de la promoción"""
        now = timezone.now().date()
        if self.fecha_fin < now:
            return 0
        return (self.fecha_fin - now).days
