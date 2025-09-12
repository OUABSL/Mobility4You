# usuarios/validations.py
"""
Validadores personalizados para el modelo Usuario
Facilita la gestión de usuarios cliente en el admin
"""
import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

# Constantes para tipos de documento válidos
TIPOS_DOCUMENTO_VALIDOS = ['pasaporte', 'dni', 'nif', 'nie']


def validate_documento_flexible(value):
    """
    Validador flexible para número de documento
    Permite campo vacío y múltiples formatos (DNI, NIE, NIF, Pasaporte)
    
    Args:
        value (str): Número de documento a validar
        
    Raises:
        ValidationError: Si el formato no es válido
        
    Examples:
        Válidos: '', '12345678A', 'AB123456', 'X1234567L', etc.
        Inválidos: '123', 'ABCD', '12345678@'
    """
    if not value or value.strip() == "":
        return  # Campo vacío es válido
    
    # Limpiar espacios y convertir a mayúsculas
    value_clean = value.strip().upper()
    
    # Formato flexible: alfanumérico, 6-20 caracteres
    if not re.match(r'^[A-Z0-9]{6,20}$', value_clean):
        raise ValidationError(
            _('Formato de documento inválido. Use 6-20 caracteres alfanuméricos. '
              'Ejemplos: 12345678A, AB123456, X1234567L')
        )


def validate_telefono_flexible(value):
    """
    Validador flexible para teléfono
    Permite campo vacío y múltiples formatos internacionales
    
    Args:
        value (str): Número de teléfono a validar
        
    Raises:
        ValidationError: Si el formato no es válido
        
    Examples:
        Válidos: '', '123456789', '+34123456789', '+1 555 123 4567', '(555) 123-4567'
        Inválidos: '123', 'abc123', '+123abc'
    """
    if not value or value.strip() == "":
        return  # Campo vacío es válido
    
    # Limpiar espacios, guiones, paréntesis
    value_clean = re.sub(r'[\s\-\(\)]', '', value.strip())
    
    # Formato flexible: opcional + seguido de 9-15 dígitos
    if not re.match(r'^\+?\d{9,15}$', value_clean):
        raise ValidationError(
            _('Formato de teléfono inválido. Use 9-15 dígitos, opcionalmente con + al inicio. '
              'Ejemplos: 123456789, +34123456789, +1555123456')
        )


def validate_tipo_documento_flexible(value):
    """
    Validador flexible para tipo de documento
    Permite campo vacío y valida tipos específicos
    
    Args:
        value (str): Tipo de documento a validar
        
    Raises:
        ValidationError: Si el tipo no es válido
        
    Examples:
        Válidos: '', 'dni', 'nif', 'nie', 'pasaporte'
        Inválidos: 'cedula', 'licencia', 'otro'
    """
    if not value or value.strip() == "":
        return  # Campo vacío es válido
    
    if value not in TIPOS_DOCUMENTO_VALIDOS:
        tipos_mostrar = ', '.join([tipo.upper() for tipo in TIPOS_DOCUMENTO_VALIDOS])
        raise ValidationError(
            _('Tipo de documento inválido. Opciones válidas: %(tipos)s') % {'tipos': tipos_mostrar}
        )


def validate_username_cliente(value):
    """
    Validador para username de cliente
    Permite campo vacío (se generará automáticamente)
    
    Args:
        value (str): Username a validar
        
    Raises:
        ValidationError: Si el formato no es válido
    """
    if not value or value.strip() == "":
        return  # Campo vacío es válido para clientes
    
    # Username básico: alfanumérico y algunos caracteres especiales
    if not re.match(r'^[a-zA-Z0-9._-]+$', value.strip()):
        raise ValidationError(
            _('Username inválido. Use solo letras, números, puntos, guiones y guiones bajos.')
        )


def validate_email_flexible(value):
    """
    Validador flexible para email
    Más permisivo que el validador estándar de Django
    
    Args:
        value (str): Email a validar
        
    Raises:
        ValidationError: Si el formato no es válido
    """
    if not value or value.strip() == "":
        raise ValidationError(_('El email es obligatorio.'))
    
    # Validación básica de email
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, value.strip()):
        raise ValidationError(
            _('Formato de email inválido. Ejemplo: usuario@ejemplo.com')
        )


def limpiar_telefono(telefono):
    """
    Función auxiliar para limpiar formato de teléfono
    Elimina espacios, guiones, paréntesis y otros caracteres
    
    Args:
        telefono (str): Teléfono a limpiar
        
    Returns:
        str: Teléfono limpio solo con números y opcional +
    """
    if not telefono:
        return ''
    
    # Limpiar caracteres especiales excepto +
    telefono_limpio = re.sub(r'[\s\-\(\)]', '', telefono.strip())
    
    # Asegurar que solo contenga + al inicio y números
    if re.match(r'^\+?\d+$', telefono_limpio):
        return telefono_limpio
    
    return telefono


def limpiar_documento(documento):
    """
    Función auxiliar para limpiar formato de documento
    Elimina espacios y convierte a mayúsculas
    
    Args:
        documento (str): Documento a limpiar
        
    Returns:
        str: Documento limpio en mayúsculas
    """
    if not documento:
        return ''
    
    return documento.strip().upper()


def generar_username_desde_email(email):
    """
    Función auxiliar para generar username único desde email
    
    Args:
        email (str): Email del usuario
        
    Returns:
        str: Username único generado
    """
    if not email:
        return ''
    
    # Extraer parte antes del @
    base_username = email.split('@')[0]
    
    # Limpiar caracteres no válidos
    base_username = re.sub(r'[^a-zA-Z0-9._-]', '', base_username)
    
    # Asegurar que no esté vacío
    if not base_username:
        base_username = 'usuario'
    
    return base_username


# Constantes para validación
TELEFONO_MIN_DIGITS = 9
TELEFONO_MAX_DIGITS = 15
DOCUMENTO_MIN_CHARS = 6
DOCUMENTO_MAX_CHARS = 20

# Patrones regex reutilizables
PATRON_TELEFONO = r'^\+?\d{9,15}$'
PATRON_DOCUMENTO = r'^[A-Z0-9]{6,20}$'
PATRON_EMAIL = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
PATRON_USERNAME = r'^[a-zA-Z0-9._-]+$'

# Mensajes de error estándar
MENSAJES_ERROR = {
    'telefono': _('Formato de teléfono inválido. Use 9-15 dígitos, opcionalmente con + al inicio.'),
    'documento': _('Formato de documento inválido. Use 6-20 caracteres alfanuméricos.'),
    'email': _('Formato de email inválido.'),
    'username': _('Username inválido. Use solo letras, números, puntos, guiones y guiones bajos.'),
    'tipo_documento': _('Tipo de documento inválido.'),
}