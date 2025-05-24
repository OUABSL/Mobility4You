# payments/services/redsys_service.py
import hmac
import hashlib
import base64
import json
import urllib.parse
import logging
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger('redsys')

def get_redsys_url():
    """
    Retorna la URL de Redsys según el entorno
    """
    if settings.REDSYS_ENVIRONMENT == 'production':
        return 'https://sis.redsys.es/sis/realizarPago'
    else:
        return 'https://sis-t.redsys.es:25443/sis/realizarPago'

def create_merchant_parameters(params):
    """
    Codifica los parámetros del comerciante para Redsys
    
    Args:
        params: Dict con parámetros para Redsys
        
    Returns:
        String: Parámetros codificados en base64
    """
    params_json = json.dumps(params)
    return base64.b64encode(params_json.encode()).decode()

def create_merchant_signature(merchant_parameters, order_id):
    """
    Crea la firma para Redsys
    
    Args:
        merchant_parameters: Parámetros codificados
        order_id: Número de pedido
        
    Returns:
        String: Firma codificada
    """
    # Decodificar clave secreta
    secret_key = base64.b64decode(settings.REDSYS_SECRET_KEY)
    
    # Preparar mensaje a firmar
    message = merchant_parameters.encode()
    
    # Cifrar el número de pedido con 3DES
    from Crypto.Cipher import DES3
    from Crypto.Util.Padding import pad
    
    # Rellenar hasta múltiplo de 8
    order_padded = pad(order_id.encode(), 8)
    
    # Cifrar con 3DES
    cipher = DES3.new(secret_key, DES3.MODE_CBC, IV=b'\0\0\0\0\0\0\0\0')
    order_encrypted = cipher.encrypt(order_padded)
    
    # Generar firma HMAC SHA256
    signature = hmac.new(order_encrypted, message, hashlib.sha256).digest()
    
    # Codificar en Base64
    return base64.b64encode(signature).decode()

def prepare_payment(redsys_params, reserva_data):
    """
    Prepara los parámetros para enviar a Redsys
    
    Args:
        redsys_params: Dict con parámetros para Redsys
        reserva_data: Dict con datos de la reserva
        
    Returns:
        (merchant_parameters, signature, signature_version, redsys_url)
    """
    try:
        # Verificar parámetros mínimos
        required_params = [
            'DS_MERCHANT_AMOUNT', 'DS_MERCHANT_ORDER',
            'DS_MERCHANT_MERCHANTCODE', 'DS_MERCHANT_CURRENCY',
            'DS_MERCHANT_TRANSACTIONTYPE', 'DS_MERCHANT_TERMINAL'
        ]
        
        for param in required_params:
            if param not in redsys_params:
                raise ValueError(f"Falta el parámetro requerido: {param}")
        
        # Codificar parámetros
        merchant_parameters = create_merchant_parameters(redsys_params)
        
        # Crear firma
        signature = create_merchant_signature(
            merchant_parameters, 
            redsys_params['DS_MERCHANT_ORDER']
        )
        
        return (
            merchant_parameters,
            signature,
            'HMAC_SHA256_V1',
            get_redsys_url()
        )
        
    except Exception as e:
        logger.error(f"Error preparando pago Redsys: {str(e)}")
        raise

def process_notification(merchant_parameters, signature):
    """
    Procesa la notificación de Redsys
    
    Args:
        merchant_parameters: Parámetros codificados
        signature: Firma recibida
        
    Returns:
        (bool, dict): Validez de la firma y datos decodificados
    """
    try:
        # Decodificar parámetros
        decoded_params = base64.b64decode(merchant_parameters).decode()
        params_dict = json.loads(decoded_params)
        
        # Verificar firma
        order_id = params_dict.get('Ds_Order', '')
        calculated_signature = create_merchant_signature(merchant_parameters, order_id)
        
        is_valid = hmac.compare_digest(signature, calculated_signature)
        return is_valid, params_dict
    except Exception as e:
        logger.error(f"Error procesando notificación Redsys: {str(e)}")
        return False, {}

def get_timestamp():
    """
    Retorna timestamp actual formateado
    """
    return timezone.now()