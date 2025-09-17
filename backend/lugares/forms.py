# lugares/forms.py
"""
Formularios personalizados para la gestión de lugares y direcciones
"""
import logging

from django import forms
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from .models import Direccion, Lugar

logger = logging.getLogger(__name__)


class DireccionForm(forms.ModelForm):
    """Formulario para direcciones con validación mejorada"""
    
    class Meta:
        model = Direccion
        fields = '__all__'
        widgets = {
            'calle': forms.TextInput(attrs={
                'placeholder': 'Ej: Calle Gran Vía, 123',
                'class': 'form-control'
            }),
            'ciudad': forms.TextInput(attrs={
                'placeholder': 'Ej: Madrid',
                'class': 'form-control'
            }),
            'provincia': forms.TextInput(attrs={
                'placeholder': 'Ej: Madrid',
                'class': 'form-control'
            }),
            'pais': forms.TextInput(attrs={
                'placeholder': 'España',
                'class': 'form-control'
            }),
            'codigo_postal': forms.TextInput(attrs={
                'placeholder': 'Ej: 28013',
                'class': 'form-control'
            }),
        }
    
    def clean_codigo_postal(self):
        codigo_postal = self.cleaned_data.get('codigo_postal')
        if codigo_postal:
            # Validación adicional para códigos postales españoles
            if len(codigo_postal) == 5 and codigo_postal.isdigit():
                return codigo_postal
            elif len(codigo_postal) < 4:
                raise ValidationError(_('El código postal es demasiado corto'))
        return codigo_postal


class LugarForm(forms.ModelForm):
    """Formulario para lugares con dirección integrada"""
    
    # Campos de dirección integrados
    calle = forms.CharField(
        max_length=255,
        required=False,
        label=_("Calle"),
        widget=forms.TextInput(attrs={
            'placeholder': 'Ej: Calle Gran Vía, 123',
            'class': 'form-control'
        })
    )
    ciudad = forms.CharField(
        max_length=100,
        required=False,
        label=_("Ciudad"),
        widget=forms.TextInput(attrs={
            'placeholder': 'Ej: Madrid',
            'class': 'form-control'
        })
    )
    provincia = forms.CharField(
        max_length=100,
        required=False,
        label=_("Provincia"),
        widget=forms.TextInput(attrs={
            'placeholder': 'Ej: Madrid',
            'class': 'form-control'
        })
    )
    pais = forms.CharField(
        max_length=100,
        initial="España",
        required=True,
        label=_("País"),
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'value': 'España'
        })
    )
    codigo_postal = forms.CharField(
        max_length=10,
        label=_("Código Postal"),
        widget=forms.TextInput(attrs={
            'placeholder': 'Ej: 28013',
            'class': 'form-control'
        })
    )
    
    class Meta:
        model = Lugar
        fields = [
            'nombre', 'latitud', 'longitud', 'telefono', 'email',
            'icono_url', 'info_adicional', 'activo', 'popular'
        ]
        widgets = {
            'nombre': forms.TextInput(attrs={
                'placeholder': 'Ej: Estación de Atocha',
                'class': 'form-control'
            }),
            'latitud': forms.NumberInput(attrs={
                'placeholder': 'Ej: 40.4165',
                'step': '0.000001',
                'class': 'form-control'
            }),
            'longitud': forms.NumberInput(attrs={
                'placeholder': 'Ej: -3.7026',
                'step': '0.000001',
                'class': 'form-control'
            }),
            'telefono': forms.TextInput(attrs={
                'placeholder': 'Ej: +34 91 123 45 67',
                'class': 'form-control'
            }),
            'email': forms.EmailInput(attrs={
                'placeholder': 'contacto@lugar.com',
                'class': 'form-control'
            }),
            'icono_url': forms.URLInput(attrs={
                'placeholder': 'https://ejemplo.com/icono.png',
                'class': 'form-control'
            }),
            'info_adicional': forms.Textarea(attrs={
                'rows': 3,
                'placeholder': 'Información adicional sobre el lugar...',
                'class': 'form-control'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Si estamos editando un lugar existente, prellenar campos de dirección
        if self.instance and self.instance.pk:
            try:
                # Verificar si el lugar tiene dirección asociada
                if hasattr(self.instance, 'direccion') and self.instance.direccion:
                    direccion = self.instance.direccion
                    self.fields['calle'].initial = direccion.calle or ''
                    self.fields['ciudad'].initial = direccion.ciudad or ''
                    self.fields['provincia'].initial = direccion.provincia or ''
                    self.fields['pais'].initial = direccion.pais or 'España'
                    self.fields['codigo_postal'].initial = direccion.codigo_postal or ''
            except (AttributeError, Direccion.DoesNotExist):
                # Si no hay dirección asociada, usar valores por defecto
                self.fields['pais'].initial = 'España'
        else:
            # Para nuevos lugares, establecer valores por defecto
            self.fields['pais'].initial = 'España'

    def clean(self):
        cleaned_data = super().clean()
        
        # Asegurar que el país tenga un valor por defecto si está vacío
        if not cleaned_data.get('pais'):
            cleaned_data['pais'] = 'España'
        
        # Validar campos obligatorios para dirección
        ciudad = cleaned_data.get('ciudad', '').strip()
        codigo_postal = cleaned_data.get('codigo_postal', '').strip()
        nombre = cleaned_data.get('nombre', '').strip()
        
        errors = {}
        
        # Validación de nombre del lugar
        if not nombre:
            errors['nombre'] = _('El nombre del lugar es obligatorio')
        else:
            # Verificar si ya existe un lugar con el mismo nombre (excepto si estamos editando)
            existing_lugar = Lugar.objects.filter(nombre__iexact=nombre.strip())
            if self.instance and self.instance.pk:
                existing_lugar = existing_lugar.exclude(pk=self.instance.pk)
            
            if existing_lugar.exists():
                errors['nombre'] = _('Ya existe un lugar con este nombre. Por favor, elija un nombre diferente.')
        
        # Validación de dirección
        if not codigo_postal:
            errors['codigo_postal'] = _('El código postal es obligatorio para crear un lugar')
        
        if not ciudad:
            errors['ciudad'] = _('La ciudad es obligatoria para crear un lugar')
        
        # Validar formato del código postal español básico
        if codigo_postal:
            if len(codigo_postal) < 4:
                errors['codigo_postal'] = _('El código postal debe tener al menos 4 dígitos')
            elif len(codigo_postal) == 5 and not codigo_postal.isdigit():
                errors['codigo_postal'] = _('El código postal debe contener solo números')
            elif len(codigo_postal) > 10:
                errors['codigo_postal'] = _('El código postal es demasiado largo')
        
        # Validar coordenadas (si se proporcionan, deben ser ambas)
        latitud = cleaned_data.get('latitud')
        longitud = cleaned_data.get('longitud')
        
        if (latitud is not None) != (longitud is not None):
            if latitud is not None:
                errors['longitud'] = _('Debe proporcionar la longitud cuando especifica latitud')
            else:
                errors['latitud'] = _('Debe proporcionar la latitud cuando especifica longitud')
        
        # Validar rangos de coordenadas si ambas están presentes
        if latitud is not None and longitud is not None:
            if not (-90 <= latitud <= 90):
                errors['latitud'] = _('La latitud debe estar entre -90 y 90 grados')
            if not (-180 <= longitud <= 180):
                errors['longitud'] = _('La longitud debe estar entre -180 y 180 grados')
        
        # Validar formato de teléfono si se proporciona
        telefono = cleaned_data.get('telefono') or ''
        telefono = telefono.strip() if telefono else ''
        if telefono:
            import re

            # Patrón básico para teléfonos (acepta + al inicio y números)
            if not re.match(r'^\+?[\d\s\-\(\)]{9,20}$', telefono):
                errors['telefono'] = _('Formato de teléfono inválido')
        
        # Validar email si se proporciona
        email = cleaned_data.get('email') or ''
        email = email.strip() if email else ''
        if email:
            import re
            if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
                errors['email'] = _('Formato de email inválido')
        
        if errors:
            raise ValidationError(errors)
        
        return cleaned_data

    def save(self, commit=True):
        """
        Guardar el lugar con manejo correcto de la dirección usando servicio especializado
        """
        lugar = super().save(commit=False)
        
        if not commit:
            return lugar
        
        # Preparar datos para el servicio
        direccion_data = {
            'calle': self.cleaned_data.get('calle', '').strip(),
            'ciudad': self.cleaned_data.get('ciudad', '').strip(),
            'provincia': self.cleaned_data.get('provincia', '').strip(),
            'pais': self.cleaned_data.get('pais', 'España').strip(),
            'codigo_postal': self.cleaned_data.get('codigo_postal', '').strip()
        }
        
        lugar_data = {
            'nombre': lugar.nombre,
            'latitud': lugar.latitud,
            'longitud': lugar.longitud,
            'telefono': lugar.telefono,
            'email': lugar.email,
            'icono_url': lugar.icono_url,
            'info_adicional': lugar.info_adicional,
            'activo': lugar.activo,
            'popular': lugar.popular
        }
        
        try:
            if self.instance.pk:
                # Actualizar lugar existente
                from .services import LugarService
                lugar_actualizado = LugarService.actualizar_lugar_con_direccion(
                    self.instance, lugar_data, direccion_data
                )
                logger.info(f"Lugar '{lugar_actualizado.nombre}' actualizado exitosamente")
                return lugar_actualizado
            else:
                # Crear nuevo lugar
                from .services import LugarService
                lugar_nuevo = LugarService.crear_lugar_con_direccion(lugar_data, direccion_data)
                logger.info(f"Lugar '{lugar_nuevo.nombre}' creado exitosamente")
                return lugar_nuevo
                
        except ValueError as ve:
            logger.error(f"Error de validación: {str(ve)}")
            raise ValidationError(str(ve))
        except Exception as e:
            logger.error(f"Error inesperado al guardar lugar: {str(e)}")
            raise ValidationError(f'Error al guardar lugar: {str(e)}')
