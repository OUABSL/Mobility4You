# api/models/vehiculos.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from django.utils import timezone
import os

def imagen_vehiculo_upload_path(instance, filename):
    """
    Genera la ruta de carga para las imágenes de vehículos
    Formato: vehiculos/{vehiculo_id}_{imagenvehiculo_id}.jpg
    """
    # Extraer la extensión del archivo
    ext = filename.split('.')[-1] if '.' in filename else 'jpg'
    
    # Si no tenemos el ID de la imagen aún (primera creación), usamos un placeholder
    image_id = instance.id if instance.id else 'temp'
    
    # Crear el nombre del archivo
    filename = f"{instance.vehiculo.id}_{image_id}.{ext}"
    
    # Retornar la ruta completa - solo vehiculos/ ya que MEDIA_ROOT se añade automáticamente
    return os.path.join('vehiculos', filename)

class Categoria(models.Model):
    nombre = models.CharField(
        _("Nombre"), 
        max_length=100, 
        unique=True,
        null=False,
        blank=False
    )
    descripcion = models.TextField(
        _("Descripción"),
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'categoria'
        verbose_name = _("Categoría")
        verbose_name_plural = _("Categorías")
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre

class GrupoCoche(models.Model):
    nombre = models.CharField(
        _("Nombre"), 
        max_length=100, 
        unique=True,
        null=False,
        blank=False
    )
    edad_minima = models.PositiveSmallIntegerField(
        _("Edad mínima"),
        null=False,
        default=21,
        validators=[
            MinValueValidator(18),
            MaxValueValidator(99)
        ]
    )
    descripcion = models.TextField(
        _("Descripción"),
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'grupo_coche'
        verbose_name = _("Grupo de coche (catalogue)")
        verbose_name_plural = _("Grupos de coches (catalogue)")
        ordering = ['nombre']

    def save(self, *args, **kwargs):
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nombre

class Vehiculo(models.Model):
    COMBUSTIBLE_CHOICES = [
        ('Gasolina', _('Gasolina')),
        ('Diesel', _('Diésel')),
        ('Híbrido', _('Híbrido')),
        ('Eléctrico', _('Eléctrico')),
    ]
    
    categoria = models.ForeignKey(
        Categoria,
        related_name="vehiculos",
        on_delete=models.RESTRICT,
        null=False
    )
    grupo = models.ForeignKey(
        GrupoCoche,
        related_name="vehiculos",
        on_delete=models.RESTRICT,
        null=False
    )
    combustible = models.CharField(
        _("Combustible"),
        max_length=20,
        choices=COMBUSTIBLE_CHOICES,
        null=False,
        blank=False
    )
    marca = models.CharField(
        _("Marca"),
        max_length=100,
        null=False,
        blank=False
    )
    modelo = models.CharField(
        _("Modelo"),
        max_length=100,
        null=False,
        blank=False
    )
    matricula = models.CharField(
        _("Matrícula"),
        max_length=20,
        unique=True,
        null=False,
        blank=False
    )
    anio = models.PositiveIntegerField(
        _("Año"),
        null=False,
        validators=[
            MinValueValidator(2000),
            MaxValueValidator(2030)
        ]
    )
    color = models.CharField(
        _("Color"),
        max_length=50,
        null=False,
        blank=False
    )
    num_puertas = models.PositiveSmallIntegerField(
        _("Número de puertas"),
        null=False,
        validators=[
            MinValueValidator(2),
            MaxValueValidator(5)
        ]
    )
    num_pasajeros = models.PositiveSmallIntegerField(
        _("Número de pasajeros"),
        null=False,
        validators=[
            MinValueValidator(2),
            MaxValueValidator(9)
        ]
    )
    capacidad_maletero = models.PositiveIntegerField(
        _("Capacidad maletero (L)"),
        null=False,
        validators=[MinValueValidator(0)]
    )
    disponible = models.BooleanField(
        _("Disponible"),
        default=False,
        null=False
    )
    activo = models.BooleanField(
        _("Activo"),
        default=False,
        null=False
    )
    notas_internas = models.TextField(
        _("Notas internas"),
        null=True,
        blank=True
    )
    fianza = models.DecimalField(
        _("Fianza"),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        null=False,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    kilometraje = models.PositiveIntegerField(
        _("Kilometraje"),
        blank=True,
        null=True,
        validators=[MinValueValidator(0)]
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'vehiculo'
        verbose_name = _("Vehículo")
        verbose_name_plural = _("Vehículos")
        ordering = ['marca', 'modelo']
        indexes = [
            models.Index(fields=['disponible', 'activo']),
            models.Index(fields=['marca', 'modelo']),
            models.Index(fields=['matricula']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)
        
    def __str__(self):
        return f"{self.marca} {self.modelo} ({self.matricula})"

class ImagenVehiculo(models.Model):
    vehiculo = models.ForeignKey(
        Vehiculo,
        related_name="imagenes",
        on_delete=models.CASCADE,
        null=False
    )
    imagen = models.ImageField(
        _("Imagen del vehículo"),
        upload_to=imagen_vehiculo_upload_path,
        null=True,
        blank=True,
        help_text=_("Imagen del vehículo que se guardará en la carpeta especificada")
    )
    portada = models.BooleanField(
        _("¿Es Imagen de portada?"),
        default=False,
        null=False
    )
    ancho = models.PositiveIntegerField(
        _("Ancho"),
        null=True,
        blank=True
    )
    alto = models.PositiveIntegerField(
        _("Alto"),
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'imagen_vehiculo'
        verbose_name = _("Imagen de vehículo")
        verbose_name_plural = _("Imágenes de vehículos")
        ordering = ["vehiculo", "-portada"]
        indexes = [
            models.Index(fields=["vehiculo", "portada"]),        ]
        
    def save(self, *args, **kwargs):
        # Guardar primero para obtener el ID
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        
        # Si es una nueva instancia y tiene imagen
        if not self.id and self.imagen:
            # Guardar temporalmente para obtener el ID
            super().save(*args, **kwargs)
            
            # Ahora renombrar el archivo con el ID correcto
            if self.imagen:
                old_path = self.imagen.path
                old_name = self.imagen.name
                
                # Extraer la extensión
                ext = old_name.split('.')[-1] if '.' in old_name else 'jpg'
                  # Crear el nuevo nombre
                new_filename = f"{self.vehiculo.id}_{self.id}.{ext}"
                new_path = os.path.join('vehiculos', new_filename)
                
                # Actualizar el campo imagen con el nuevo nombre
                self.imagen.name = new_path
                
                # Guardar nuevamente con el nombre correcto
                super().save(update_fields=['imagen', 'updated_at'])
        else:
            super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Imagen de {self.vehiculo}"

class TarifaVehiculo(models.Model):
    vehiculo = models.ForeignKey(
        Vehiculo,
        related_name="tarifas",
        on_delete=models.CASCADE,
        null=False
    )
    fecha_inicio = models.DateField(
        _("Fecha de inicio"),
        default=timezone.now,
        null=False
    )
    fecha_fin = models.DateField(
        _("Fecha de fin"),
        null=True,
        blank=True,
        help_text=_("Dejar en blanco para tarifa indefinida")
    )
    precio_dia = models.DecimalField(
        _("Precio por día"),
        max_digits=8,
        decimal_places=2,
        null=False,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    
    class Meta:
        db_table = 'tarifa_vehiculo'
        verbose_name = _("Tarifa de vehículo")
        verbose_name_plural = _("Tarifas de vehículos")
        unique_together = [['vehiculo', 'fecha_inicio']]
        indexes = [
            models.Index(
                fields=['vehiculo', 'fecha_inicio', 'fecha_fin'],
                name='idx_tarifa_vehiculo_periodo'
            ),
        ]
    
    def save(self, *args, **kwargs):
        if hasattr(self, 'fecha') and isinstance(self._meta.get_field('fecha'), models.DateField):
            if self.fecha and hasattr(self.fecha, 'date'):
                self.fecha = self.fecha.date()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.vehiculo} - {self.precio_dia}€/día ({self.fecha_inicio} a {self.fecha_fin})"

class Mantenimiento(models.Model):
    vehiculo = models.ForeignKey(
        Vehiculo,
        related_name="mantenimientos",
        on_delete=models.CASCADE,
        null=False
    )
    fecha = models.DateTimeField(
        _("Fecha"),
        default=timezone.now,
        null=False
    )
    tipo_servicio = models.CharField(
        _("Tipo de servicio"),
        max_length=200,
        null=False,
        blank=False
    )
    coste = models.DecimalField(
        _("Coste"),
        max_digits=10,
        decimal_places=2,
        null=True,
        help_text=_("Coste del servicio de mantenimiento: Se puede dejar en blanco si se desea."),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    notas = models.TextField(
        _("Notas"),
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'mantenimiento'
        verbose_name = _("Mantenimiento")
        verbose_name_plural = _("Mantenimientos")
        ordering = ["-fecha"]
        indexes = [
            models.Index(fields=["vehiculo", "fecha"]),
        ]
        
    def save(self, *args, **kwargs):
        if hasattr(self, 'fecha') and isinstance(self._meta.get_field('fecha'), models.DateField):
            if self.fecha and hasattr(self.fecha, 'date'):
                self.fecha = self.fecha.date()
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.vehiculo} - {self.tipo_servicio} ({self.fecha:%Y-%m-%d})"
