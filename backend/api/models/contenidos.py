# api/models/contenidos.py
from django.db import models
from django.utils.translation import gettext_lazy as _
# CAMBIO CRÍTICO: Quitar PostgreSQL JSONField, usar Django JSONField
# from django.contrib.postgres.fields import JSONField  # ❌ ELIMINAR ESTA LÍNEA
from django.utils import timezone


class Contenido(models.Model):
    TIPO_CHOICES = [
        ('blog', _('Blog')),
        ('faq', _('FAQ')),
        ('legal', _('Legal')),
        ('info', _('Información')),
        ('mini_section', _('Sección mínima')),
    ]
    
    tipo = models.CharField(
        _("Tipo"),
        max_length=20,
        choices=TIPO_CHOICES,
        null=False,
        blank=False
    )
    titulo = models.CharField(
        _("Título"),
        max_length=255,
        null=False,
        blank=False
    )
    subtitulo = models.CharField(
        _("Subtítulo"),
        max_length=255,
        null=True,
        blank=True
    )
    cuerpo = models.TextField(
        _("Cuerpo"),
        null=True,
        blank=True
    )
    info_adicional = models.JSONField(  # ✅ USAR models.JSONField (compatible con MySQL)
        _("Información adicional"),
        null=True,
        blank=True
    )
    icono_url = models.CharField(
        _("Icono"),
        max_length=200,
        null=True,
        blank=True
    )
    activo = models.BooleanField(
        _("Activo"),
        default=False,
        null=False
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'contenido'
        verbose_name = _("Contenido")
        verbose_name_plural = _("Contenidos")
        ordering = ['tipo', 'titulo']
        indexes = [
            models.Index(fields=['tipo', 'activo']),
        ]
    
    def __str__(self):
        return f"{self.get_tipo_display()}: {self.titulo}"