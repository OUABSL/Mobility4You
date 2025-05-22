# api/models/lugares.py
from django.db import models
from django.utils.translation import gettext_lazy as _

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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Contenido")
        verbose_name_plural = _("Contenidos")
        ordering = ['tipo', 'orden', 'titulo']
        indexes = [
            models.Index(fields=['tipo', 'publicado', 'destacado']),
        ]
    
    def __str__(self):
        return f"{self.get_tipo_display()}: {self.titulo}"