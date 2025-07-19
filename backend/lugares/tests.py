# lugares/tests.py
"""
Tests para la funcionalidad de lugares
"""

from django.test import TestCase
from django.core.exceptions import ValidationError
from .models import Lugar, Direccion
from .forms import LugarForm
from .services import LugarService


class LugarServiceTest(TestCase):
    """Tests para el servicio de lugares"""
    
    def test_crear_lugar_con_direccion_exitoso(self):
        """Test de creación exitosa de lugar con dirección"""
        lugar_data = {
            'nombre': 'Aeropuerto de Málaga',
            'telefono': '+34 952 048 484',
            'activo': True,
            'popular': True
        }
        
        direccion_data = {
            'calle': 'Avenida del Comandante García Morato',
            'ciudad': 'Málaga',
            'provincia': 'Málaga',
            'pais': 'España',
            'codigo_postal': '29004'
        }
        
        lugar = LugarService.crear_lugar_con_direccion(lugar_data, direccion_data)
        
        # Verificaciones
        self.assertIsNotNone(lugar)
        self.assertIsNotNone(lugar.direccion)
        self.assertEqual(lugar.nombre, 'Aeropuerto de Málaga')
        self.assertEqual(lugar.direccion.ciudad, 'Málaga')
        self.assertEqual(lugar.direccion.codigo_postal, '29004')
        
        # Verificar que está en la base de datos
        lugar_db = Lugar.objects.get(id=lugar.id)
        self.assertEqual(lugar_db.nombre, lugar.nombre)
        self.assertIsNotNone(lugar_db.direccion)
    
    def test_crear_lugar_sin_ciudad_falla(self):
        """Test que falla al crear lugar sin ciudad"""
        lugar_data = {
            'nombre': 'Lugar sin ciudad',
            'activo': True
        }
        
        direccion_data = {
            'calle': 'Alguna calle',
            'pais': 'España',
            'codigo_postal': '28042'
            # ciudad faltante
        }
        
        with self.assertRaises(ValueError):
            LugarService.crear_lugar_con_direccion(lugar_data, direccion_data)
    
    def test_crear_lugar_sin_codigo_postal_falla(self):
        """Test que falla al crear lugar sin código postal"""
        lugar_data = {
            'nombre': 'Lugar sin CP',
            'activo': True
        }
        
        direccion_data = {
            'calle': 'Alguna calle',
            'ciudad': 'Madrid',
            'pais': 'España'
            # codigo_postal faltante
        }
        
        with self.assertRaises(ValueError):
            LugarService.crear_lugar_con_direccion(lugar_data, direccion_data)


class LugarFormTest(TestCase):
    """Tests para el formulario de lugares"""
    
    def test_formulario_valido(self):
        """Test de formulario válido"""
        form_data = {
            'nombre': 'Estación de Atocha',
            'calle': 'Plaza del Emperador Carlos V',
            'ciudad': 'Madrid',
            'provincia': 'Madrid',
            'pais': 'España',
            'codigo_postal': '28045',
            'telefono': '+34912320320',  # Sin espacios para coincidir con el regex del modelo
            'activo': True,
            'popular': False
        }
        
        form = LugarForm(data=form_data)
        if not form.is_valid():
            print(f"Errores del formulario: {form.errors}")
        self.assertTrue(form.is_valid())
        
        lugar = form.save()
        self.assertIsNotNone(lugar)
        self.assertIsNotNone(lugar.direccion)
        self.assertEqual(lugar.nombre, 'Estación de Atocha')
    
    def test_formulario_sin_ciudad_invalido(self):
        """Test que formulario sin ciudad es inválido"""
        form_data = {
            'nombre': 'Lugar sin ciudad',
            'calle': 'Alguna calle',
            'pais': 'España',
            'codigo_postal': '28045',
            'activo': True
        }
        
        form = LugarForm(data=form_data)
        self.assertFalse(form.is_valid())
        self.assertIn('ciudad', form.errors)
    
    def test_formulario_sin_codigo_postal_invalido(self):
        """Test que formulario sin código postal es inválido"""
        form_data = {
            'nombre': 'Lugar sin CP',
            'calle': 'Alguna calle',
            'ciudad': 'Madrid',
            'pais': 'España',
            'activo': True
        }
        
        form = LugarForm(data=form_data)
        self.assertFalse(form.is_valid())
        self.assertIn('codigo_postal', form.errors)
