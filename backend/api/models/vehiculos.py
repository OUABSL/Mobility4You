# api/models/vehiculos.py
from django.db import models
from django.utils.translation import gettext_lazy as _

class Categoria(models.Model):
    nombre = models.CharField(_("Nombre"), max_length=100, unique=True)
    descripcion = models.TextField(_("Descripción"), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Categoría")
        verbose_name_plural = _("Categorías")
        ordering = ['nombre']
        indexes = [
            models.Index(fields=["nombre"]),
        ]
    
    def __str__(self):
        return self.nombre
    
    def get_vehiculos_activos(self):
        """Retorna vehículos activos en esta categoría"""
        return self.vehiculos.filter(activo=True)

class GrupoCoche(models.Model):
    nombre = models.CharField(_("Nombre"), max_length=100, unique=True)
    categoria = models.ForeignKey(
        Categoria, related_name="grupos", 
        on_delete=models.CASCADE
    )
    edad_minima = models.PositiveSmallIntegerField(_("Edad mínima"), default=21)
    descripcion = models.TextField(_("Descripción"), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Grupo de coche")
        verbose_name_plural = _("Grupos de coches")
        ordering = ['nombre']
        indexes = [
            models.Index(fields=["nombre"]),
        ]
    
    def __str__(self):
        return f"{self.nombre} ({self.categoria.nombre})"

class Vehiculo(models.Model):
    COMBUSTIBLE_CHOICES = [
        ('Gasolina', _('Gasolina')),
        ('Diesel', _('Diesel')),
        ('Híbrido', _('Híbrido')),
        ('Eléctrico', _('Eléctrico')),
    ]
    
    categoria = models.ForeignKey(
        Categoria, related_name="vehiculos", 
        on_delete=models.CASCADE
    )
    grupo = models.ForeignKey(
        GrupoCoche, related_name="vehiculos", 
        on_delete=models.CASCADE
    )
    marca = models.CharField(_("Marca"), max_length=100)
    modelo = models.CharField(_("Modelo"), max_length=100)
    matricula = models.CharField(_("Matrícula"), max_length=20, unique=True)
    anio = models.PositiveIntegerField(_("Año"))
    color = models.CharField(_("Color"), max_length=50)
    num_puertas = models.PositiveSmallIntegerField(_("Número de puertas"))
    num_pasajeros = models.PositiveSmallIntegerField(_("Número de pasajeros"))
    capacidad_maletero = models.PositiveIntegerField(_("Capacidad maletero (L)"))
    combustible = models.CharField(_("Combustible"), max_length=20, choices=COMBUSTIBLE_CHOICES)
    disponible = models.BooleanField(_("Disponible"), default=True)
    activo = models.BooleanField(_("Activo"), default=True)
    fianza = models.DecimalField(_("Fianza"), max_digits=10, decimal_places=2, default=0)
    kilometraje = models.PositiveIntegerField(_("Kilometraje"), default=0)
    notas_internas = models.TextField(_("Notas internas"), blank=True)
    
    # Campos de control
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Vehículo")
        verbose_name_plural = _("Vehículos")
        ordering = ['marca', 'modelo']
        indexes = [
            models.Index(fields=['disponible', 'activo']),
            models.Index(fields=['marca', 'modelo']),
        ]
    
    def __str__(self):
        return f"{self.marca} {self.modelo} ({self.matricula})"
    
    def precio_actual(self):
        """Retorna precio actual según tarifas vigentes"""
        from django.utils import timezone
        hoy = timezone.now().date()
        
        tarifa = self.tarifas.filter(
            fecha_inicio__lte=hoy,
            fecha_fin__gte=hoy
        ).order_by('-fecha_inicio').first()
        
        return tarifa.precio_dia if tarifa else 0
    
    def disponibilidad(self, fecha_inicio, fecha_fin):
        """Verifica disponibilidad en fechas específicas"""
        from api.models.reservas import Reserva
        
        # Verificar mantenimientos
        hay_mantenimiento = self.mantenimientos.filter(
            fecha__range=(fecha_inicio, fecha_fin)
        ).exists()
        
        if hay_mantenimiento:
            return False
            
        # Verificar reservas confirmadas
        reservas_activas = Reserva.objects.filter(
            vehiculo=self,
            estado='confirmada',
            fecha_recogida__lt=fecha_fin,
            fecha_devolucion__gt=fecha_inicio
        ).exists()
        
        return not reservas_activas and self.disponible and self.activo

class ImagenVehiculo(models.Model):
    vehiculo = models.ForeignKey(
        Vehiculo, related_name="imagenes", 
        on_delete=models.CASCADE
    )
    url = models.URLField(_("URL de imagen"))
    portada = models.BooleanField(_("Imagen de portada"), default=False)
    ancho = models.PositiveIntegerField(_("Ancho"), null=True, blank=True)
    alto = models.PositiveIntegerField(_("Alto"), null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Imagen de vehículo")
        verbose_name_plural = _("Imágenes de vehículos")
        ordering = ["vehiculo", "-portada"]
        indexes = [
            models.Index(fields=["vehiculo", "portada"]),
        ]
    
    def __str__(self):
        return f"{self.vehiculo} - {self.url}"

class TarifaVehiculo(models.Model):
    vehiculo = models.ForeignKey(
        Vehiculo, related_name="tarifas", 
        on_delete=models.CASCADE
    )
    fecha_inicio = models.DateField(_("Fecha de inicio"))
    fecha_fin = models.DateField(_("Fecha de fin"))
    precio_dia = models.DecimalField(_("Precio por día"), max_digits=8, decimal_places=2)
    
    class Meta:
        verbose_name = _("Tarifa de vehículo")
        verbose_name_plural = _("Tarifas de vehículos")
        unique_together = (('vehiculo', 'fecha_inicio'),)
        indexes = [
            models.Index(fields=['vehiculo', 'fecha_inicio', 'fecha_fin'], name='idx_tarifa_vehiculo_periodo'),
        ]
    
    def __str__(self):
        return f"{self.vehiculo} - {self.fecha_inicio} a {self.fecha_fin}: {self.precio_dia}€"

class Mantenimiento(models.Model):
    vehiculo = models.ForeignKey(
        Vehiculo, related_name="mantenimientos", 
        on_delete=models.CASCADE
    )
    fecha = models.DateTimeField(_("Fecha"))
    tipo_servicio = models.CharField(_("Tipo de servicio"), max_length=200)
    coste = models.DecimalField(_("Coste"), max_digits=10, decimal_places=2)
    notas = models.TextField(_("Notas"), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Mantenimiento")
        verbose_name_plural = _("Mantenimientos")
        ordering = ["-fecha"]
        indexes = [
            models.Index(fields=["vehiculo", "fecha"]),
        ]
    
    def __str__(self):
        return f"{self.vehiculo} - {self.tipo_servicio} ({self.fecha})"