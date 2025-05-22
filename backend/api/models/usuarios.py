# api/models/usuarios.py
from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _
from .lugares import Direccion

class Perfil(models.Model):
    TIPO_DOCUMENTO_CHOICES = [
        ('dni', 'DNI'),
        ('nie', 'NIE'),
        ('pasaporte', 'Pasaporte'),
    ]
    SEXO_CHOICES = [
        ('masculino', 'Masculino'),
        ('femenino', 'Femenino'),
        ('no_binario', 'No binario'),
    ]
    ROL_CHOICES = [
        ('cliente', 'Cliente'),
        ('admin', 'Administrador'),
        ('empresa', 'Empresa'),
    ]
    usuario = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name='perfil'
    )
    fecha_nacimiento = models.DateField(_("Fecha de nacimiento"), null=True, blank=True)
    sexo = models.CharField(_("Sexo"), max_length=20, choices=SEXO_CHOICES, blank=True)
    nacionalidad = models.CharField(_("Nacionalidad"), max_length=100, blank=True)
    tipo_documento = models.CharField(_("Tipo de documento"), max_length=20, choices=TIPO_DOCUMENTO_CHOICES, blank=True)
    numero_documento = models.CharField(_("Número de documento"), max_length=20, blank=True)
    imagen_carnet = models.ImageField(_("Imagen de carnet"), upload_to='carnets/', blank=True, null=True)
    direccion = models.ForeignKey(
        Direccion, on_delete=models.SET_NULL,
        related_name='perfiles',
        null=True, blank=True
    )
    telefono = models.CharField(_("Teléfono"), max_length=20, blank=True)
    rol = models.CharField(_("Rol"), max_length=20, choices=ROL_CHOICES, default='cliente')
    idioma = models.CharField(_("Idioma"), max_length=10, default='es')
    acepta_marketing = models.BooleanField(_("Acepta marketing"), default=False)
    verificado = models.BooleanField(_("Verificado"), default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Perfil")
        verbose_name_plural = _("Perfiles")
    
    def __str__(self):
        return f"{self.usuario.username} ({self.rol})"
    
    def nombre_completo(self):
        """Retorna nombre completo del usuario"""
        return self.usuario.get_full_name() or self.usuario.username
    
    def edad(self):
        """Calcula la edad del usuario"""
        if not self.fecha_nacimiento:
            return None
            
        from django.utils import timezone
        import datetime
        
        hoy = timezone.now().date()
        return hoy.year - self.fecha_nacimiento.year - (
            (hoy.month, hoy.day) < (self.fecha_nacimiento.month, self.fecha_nacimiento.day)
        )
    
    def es_mayor_que(self, edad_minima):
        """Verifica si el usuario es mayor que la edad mínima especificada"""
        if not self.fecha_nacimiento:
            return False
            
        edad_actual = self.edad()
        return edad_actual is not None and edad_actual >= edad_minima