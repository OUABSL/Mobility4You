"""
Test base class para admin tests
Incluye configuración común y utilities para tests del admin
"""
import re

from django.contrib.auth import get_user_model
from django.contrib.messages.storage.fallback import FallbackStorage
from django.test import Client, RequestFactory, TestCase
from django.urls import reverse
from django.utils.safestring import SafeString


class AdminTestBase(TestCase):
    """Clase base para tests del admin"""
    
    def setUp(self):
        """Configuración común para todos los tests del admin"""
        self.client = Client()
        self.factory = RequestFactory()
        User = get_user_model()
        
        # Crear superusuario para tests
        self.admin_user = User.objects.create_superuser(
            username='admin_test',
            email='admin@test.com',
            password='testpass123'
        )
        
        # Login como admin
        self.client.force_login(self.admin_user)
    
    def get_messages_storage(self, request):
        """Helper para obtener storage de mensajes para requests"""
        setattr(request, 'session', {})
        setattr(request, '_messages', FallbackStorage(request))
        return request._messages
    
    def is_safe_html(self, html_string):
        """Verifica si un string HTML es seguro (usa SafeString o format_html)"""
        if isinstance(html_string, SafeString):
            return True
        
        # Verificar patrones comunes de HTML no escapado
        unsafe_patterns = [
            r'<[^>]+>[^<]*</[^>]+>',  # Tags HTML básicos
            r'<[^>]+/>',  # Tags auto-cerrados
        ]
        
        for pattern in unsafe_patterns:
            if re.search(pattern, str(html_string)):
                # Si contiene HTML, debe ser SafeString
                return isinstance(html_string, SafeString)
        
        return True  # Si no contiene HTML, es seguro
    
    def assert_admin_access(self, url_name, *args, **kwargs):
        """Verifica que se puede acceder a una página del admin"""
        url = reverse(url_name, args=args, kwargs=kwargs)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        return response
    
    def assert_admin_changelist_access(self, app_label, model_name):
        """Verifica acceso a changelist del admin"""
        url_name = f'admin:{app_label}_{model_name}_changelist'
        return self.assert_admin_access(url_name)
    
    def assert_admin_add_access(self, app_label, model_name):
        """Verifica acceso a add form del admin"""
        url_name = f'admin:{app_label}_{model_name}_add'
        return self.assert_admin_access(url_name)
    
    def assert_admin_change_access(self, app_label, model_name, object_id):
        """Verifica acceso a change form del admin"""
        url_name = f'admin:{app_label}_{model_name}_change'
        return self.assert_admin_access(url_name, object_id)
    
    def assert_no_html_errors(self, response):
        """Verifica que no hay errores críticos de HTML en la respuesta"""
        content = response.content.decode('utf-8')
        
        # Verificar que el content-type es correcto
        self.assertEqual(response['Content-Type'], 'text/html; charset=utf-8')
        
        # Verificar que no hay errores específicos de Django admin
        self.assertNotIn('FieldError', content)
        self.assertNotIn('AttributeError', content) 
        self.assertNotIn('TypeError', content)
        self.assertNotIn('ValueError', content)
        self.assertNotIn('Internal Server Error', content)
        
        # Verificar que hay contenido de admin válido
        self.assertIn('<!DOCTYPE html>', content)
        self.assertIn('</html>', content)
    def assert_form_fields_present(self, response, fields):
        """Verifica que los campos del formulario están presentes"""
        content = response.content.decode('utf-8')
        for field in fields:
            self.assertIn(f'name="{field}"', content, f'Campo {field} no encontrado en el formulario')
    
    def assert_display_fields_present(self, response, fields):
        """Verifica que las columnas de display están presentes en changelist"""
        content = response.content.decode('utf-8')
        for field in fields:
            self.assertIn(f'column-{field}', content, f'Columna {field} no encontrada en changelist')


# Alias para compatibilidad con tests existentes
BaseAdminTestCase = AdminTestBase
