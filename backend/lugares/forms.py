# lugares/forms.py
"""
Formularios personalizados para la gestión de lugares y direcciones
"""

from django import forms
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from .models import Direccion, Lugar


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
        label=_("País"),
        widget=forms.TextInput(attrs={
            'class': 'form-control'
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
        if self.instance and self.instance.pk and hasattr(self.instance, 'direccion'):
            direccion = self.instance.direccion
            self.fields['calle'].initial = direccion.calle
            self.fields['ciudad'].initial = direccion.ciudad
            self.fields['provincia'].initial = direccion.provincia
            self.fields['pais'].initial = direccion.pais
            self.fields['codigo_postal'].initial = direccion.codigo_postal

    def clean(self):
        cleaned_data = super().clean()
        
        # Validar que al menos ciudad y código postal estén presentes
        ciudad = cleaned_data.get('ciudad')
        codigo_postal = cleaned_data.get('codigo_postal')
        
        if not codigo_postal:
            raise ValidationError(_('El código postal es obligatorio'))
        
        if not ciudad:
            raise ValidationError(_('La ciudad es obligatoria'))
        
        # Validar coordenadas (si se proporcionan, deben ser ambas)
        latitud = cleaned_data.get('latitud')
        longitud = cleaned_data.get('longitud')
        
        if (latitud is not None) != (longitud is not None):
            raise ValidationError(_('Debe proporcionar tanto latitud como longitud, o ninguna'))
        
        return cleaned_data

    def save(self, commit=True):
        lugar = super().save(commit=False)
        
        # Crear o actualizar la dirección
        if hasattr(lugar, 'direccion') and lugar.direccion:
            # Actualizar dirección existente
            direccion = lugar.direccion
        else:
            # Crear nueva dirección
            direccion = Direccion()
        
        # Asignar valores de dirección
        direccion.calle = self.cleaned_data.get('calle')
        direccion.ciudad = self.cleaned_data.get('ciudad')
        direccion.provincia = self.cleaned_data.get('provincia')
        direccion.pais = self.cleaned_data.get('pais', 'España')
        direccion.codigo_postal = self.cleaned_data.get('codigo_postal')
        
        if commit:
            direccion.save()
            lugar.direccion = direccion
            lugar.save()
        
        return lugar
