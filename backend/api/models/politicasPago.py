# api/models/politicasPago.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
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
    
    def obtener_penalizacion_aplicable(self, tipo_penalizacion_nombre, horas_previas):
        """
        Obtiene la penalización aplicable según el tipo y las horas previas
        
        Args:
            tipo_penalizacion_nombre: Nombre del tipo de penalización (ej: 'cancelación')
            horas_previas: Horas antes del evento
        
        Returns:
            PoliticaPenalizacion o None
        """
        return self.penalizaciones.filter(
            tipo_penalizacion__nombre=tipo_penalizacion_nombre,
            horas_previas__gte=horas_previas
        ).order_by('horas_previas').first()
    
    
    def get_resumen_incluye(self):
        """Obtiene un resumen de lo que incluye y no incluye la política"""
        incluye = list(self.items.filter(incluye=True).values_list('item', flat=True))
        no_incluye = list(self.items.filter(incluye=False).values_list('item', flat=True))
        
        return {
            'incluye': incluye,
            'no_incluye': no_incluye,
            'total_items': self.items.count()
        }

    def get_resumen_penalizaciones(self):
        """Obtiene un resumen de las penalizaciones de la política"""
        penalizaciones = []
        for pen in self.penalizaciones.select_related('tipo_penalizacion').all():
            penalizaciones.append({
                'tipo': pen.tipo_penalizacion.nombre,
                'horas_previas': pen.horas_previas,
                'tipo_tarifa': pen.tipo_penalizacion.tipo_tarifa,
                'valor_tarifa': pen.tipo_penalizacion.valor_tarifa
            })
        
        return penalizaciones

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
    def clean(self):
        """Validaciones personalizadas"""
        super().clean()
        
        if not self.item or not self.item.strip():
            raise ValidationError({
                'item': 'El item no puede estar vacío'
            })
        
        # Verificar que no se duplique el item para la misma política
        # Solo validar si la política ya está guardada (tiene pk)
        if self.politica and self.politica.pk:
            existing = PoliticaIncluye.objects.filter(
                politica=self.politica,
                item__iexact=self.item.strip()
            )
            if self.pk:
                existing = existing.exclude(pk=self.pk)
            
            if existing.exists():
                raise ValidationError({
                    'item': 'Este item ya existe en la política'
                })
                
    def save(self, *args, **kwargs):
        """Normalizar item antes de guardar"""
        if self.item:
            self.item = self.item.strip()
        super().save(*args, **kwargs)


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
    
    valor_tarifa = models.DecimalField(
        _("Valor de la tarifa"),
        max_digits=10,
        decimal_places=2,
        null=False,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text=_(
            "Valor de la tarifa según el tipo: "
            "para 'porcentaje' es el % a aplicar (ej: 25.00 para 25%), "
            "para 'fijo' es el importe fijo en euros, "
            "para 'importe_dia' es el importe por día de alquiler"
        )
    )
    
    class Meta:
        db_table = 'tipo_penalizacion'
        verbose_name = _("Tipo de penalización")
        verbose_name_plural = _("Tipos de penalización")
        ordering = ["nombre"]
    
    def __str__(self):
        if self.tipo_tarifa == 'porcentaje':
            return f"{self.nombre} ({self.valor_tarifa}%)"
        elif self.tipo_tarifa == 'fijo':
            return f"{self.nombre} ({self.valor_tarifa}€)"
        elif self.tipo_tarifa == 'importe_dia':
            return f"{self.nombre} ({self.valor_tarifa}€/día)"
        else:
            return f"{self.nombre} ({self.get_tipo_tarifa_display()})"

    def clean(self):
        """Validaciones personalizadas"""
        super().clean()
        
        if self.tipo_tarifa == 'porcentaje' and self.valor_tarifa > 100:
            raise ValidationError({
                'valor_tarifa': 'Para tipo porcentaje, el valor no puede ser mayor a 100'
            })
        
        if self.valor_tarifa < 0:
            raise ValidationError({
                'valor_tarifa': 'El valor de la tarifa no puede ser negativo'
            })
                       
    @property
    def descripcion_completa(self):
        """Descripción completa del tipo de penalización"""
        if self.tipo_tarifa == 'porcentaje':
            return f"Penalización del {self.valor_tarifa}% sobre el precio base"
        elif self.tipo_tarifa == 'fijo':
            return f"Penalización fija de {self.valor_tarifa}€"
        elif self.tipo_tarifa == 'importe_dia':
            return f"Penalización de {self.valor_tarifa}€ por día de alquiler"
        else:
            return self.nombre
        
        
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
        unique_together = [['politica_pago', 'tipo_penalizacion', 'horas_previas']]
        indexes = [
            models.Index(fields=['politica_pago', 'tipo_penalizacion']),
            models.Index(fields=['horas_previas']),
        ]
        
    def __str__(self):
        return f"{self.politica_pago} - {self.tipo_penalizacion} ({self.horas_previas}h)"
    
    def calcular_importe(self, precio_base, dias_alquiler=1):
        """
        Calcula el importe de la penalización según el tipo
        
        Args:
            precio_base: Precio base de la reserva
            dias_alquiler: Número de días de alquiler (para tipo importe_dia)
        
        Returns:
            Decimal: Importe de la penalización
        """
        if self.tipo_penalizacion.tipo_tarifa == 'porcentaje':
            return (precio_base * self.tipo_penalizacion.valor_tarifa) / Decimal('100')
        elif self.tipo_penalizacion.tipo_tarifa == 'fijo':
            return self.tipo_penalizacion.valor_tarifa
        elif self.tipo_penalizacion.tipo_tarifa == 'importe_dia':
            return self.tipo_penalizacion.valor_tarifa * Decimal(str(dias_alquiler))
        else:
            return Decimal('0.00')
