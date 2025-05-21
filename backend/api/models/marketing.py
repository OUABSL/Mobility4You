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
    
    class Meta:
        verbose_name = _("Promoción")
        verbose_name_plural = _("Promociones")
        ordering = ['-fecha_inicio']
    
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

class Contenido(models.Model):
    TIPO_CHOICES = [
        ('blog', _('Blog')),
        ('faq', _('FAQ')),
        ('legal', _('Legal')),
        ('info', _('Información')),
        ('mini_section', _('Sección mínima')),
    ]
    
    tipo = models.CharField(_("Tipo"), max_length=20, choices=TIPO_CHOICES)
    titulo = models.CharField(_("Título"), max_length=255)
    subtitulo = models.CharField(_("Subtítulo"), max_length=255, blank=True)
    cuerpo = models.TextField(_("Cuerpo"))
    icono_url = models.CharField(_("Icono"), max_length=100, blank=True)
    info_adicional = models.JSONField(_("Información adicional"), default=dict, blank=True)
    publicado = models.BooleanField(_("Publicado"), default=False)
    destacado = models.BooleanField(_("Destacado"), default=False)
    orden = models.PositiveSmallIntegerField(_("Orden"), default=0)
    
    class Meta:
        verbose_name = _("Contenido")
        verbose_name_plural = _("Contenidos")
        ordering = ['tipo', 'orden', 'titulo']
    
    def __str__(self):
        return f"{self.get_tipo_display()}: {self.titulo}"