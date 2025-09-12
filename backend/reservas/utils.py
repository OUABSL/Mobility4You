# reservas/utils.py
import logging
import random
import string

from django.core.exceptions import ValidationError
from django.db import transaction

logger = logging.getLogger(__name__)


def generar_numero_reserva_unico():
    """
    Genera un número de reserva único siguiendo el patrón M4Y + 6 dígitos aleatorios.
    
    Returns:
        str: Número de reserva único en formato M4Y123456
        
    Raises:
        ValidationError: Si no se puede generar un número único después de múltiples intentos
    """
    from .models import \
        Reserva  # Importación lazy para evitar dependencias circulares
    
    prefijo = "M4Y"
    max_intentos = 100  # Límite de seguridad para evitar bucle infinito
    
    for intento in range(max_intentos):
        # Generar 6 dígitos aleatorios
        numero_aleatorio = ''.join(random.choices(string.digits, k=6))
        numero_reserva = f"{prefijo}{numero_aleatorio}"
        
        # Verificar unicidad usando una consulta atómica
        try:
            with transaction.atomic():
                # Verificar si ya existe
                if not Reserva.objects.filter(numero_reserva=numero_reserva).exists():
                    logger.info(f"Número de reserva generado: {numero_reserva} (intento {intento + 1})")
                    return numero_reserva
                    
        except Exception as e:
            logger.warning(f"Error verificando unicidad en intento {intento + 1}: {str(e)}")
            continue
            
        logger.debug(f"Número de reserva {numero_reserva} ya existe, reintentando... (intento {intento + 1})")
    
    # Si llegamos aquí, no pudimos generar un número único
    error_msg = f"No se pudo generar un número de reserva único después de {max_intentos} intentos"
    logger.error(error_msg)
    raise ValidationError(error_msg)


def validar_numero_reserva(numero_reserva):
    """
    Valida que un número de reserva tenga el formato correcto.
    
    Args:
        numero_reserva (str): Número de reserva a validar
        
    Returns:
        bool: True si el formato es válido
        
    Raises:
        ValidationError: Si el formato no es válido
    """
    if not isinstance(numero_reserva, str):
        raise ValidationError("El número de reserva debe ser una cadena de texto")
        
    if len(numero_reserva) != 9:  # M4Y + 6 dígitos = 9 caracteres
        raise ValidationError("El número de reserva debe tener exactamente 9 caracteres")
        
    if not numero_reserva.startswith("M4Y"):
        raise ValidationError("El número de reserva debe comenzar con 'M4Y'")
        
    # Verificar que los últimos 6 caracteres sean dígitos
    sufijo = numero_reserva[3:]
    if not sufijo.isdigit():
        raise ValidationError("El número de reserva debe terminar con 6 dígitos")
        
    return True


def regenerar_numero_reserva_si_necesario(reserva):
    """
    Regenera el número de reserva si está vacío o duplicado.
    
    Args:
        reserva: Instancia del modelo Reserva
        
    Returns:
        str: Número de reserva válido y único
    """
    from .models import Reserva  # Importación lazy

    # Si ya tiene un número válido y único, lo mantenemos
    if (hasattr(reserva, 'numero_reserva') and 
        reserva.numero_reserva and 
        not Reserva.objects.filter(numero_reserva=reserva.numero_reserva).exclude(pk=reserva.pk).exists()):
        
        try:
            validar_numero_reserva(reserva.numero_reserva)
            return reserva.numero_reserva
        except ValidationError:
            logger.warning(f"Número de reserva {reserva.numero_reserva} tiene formato inválido, regenerando...")
    
    # Generar nuevo número
    nuevo_numero = generar_numero_reserva_unico()
    logger.info(f"Número de reserva regenerado para reserva {reserva.pk}: {nuevo_numero}")
    return nuevo_numero
