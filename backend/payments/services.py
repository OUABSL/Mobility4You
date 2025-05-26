# payments/services.py
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
import json
import base64
import hmac
import hashlib
import logging

logger = logging.getLogger('payments')

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
    # Codificar parámetros
    merchant_parameters = create_merchant_parameters(redsys_params)
    
    # Crear firma
    signature = create_merchant_signature(merchant_parameters, redsys_params['DS_MERCHANT_ORDER'])
    
    # Versión de firma
    signature_version = 'HMAC_SHA256_V1'
    
    # URL de Redsys
    redsys_url = get_redsys_url()
    
    return {
        'merchantParameters': merchant_parameters,
        'signature': signature,
        'signatureVersion': signature_version,
        'redsysUrl': redsys_url
    }

def process_notification(merchant_parameters, signature):
    """
    Procesa una notificación de pago de Redsys
    
    Args:
        merchant_parameters: Parámetros codificados en base64
        signature: Firma del mensaje
        
    Returns:
        (is_valid, params): Tupla con validez de firma y parámetros decodificados
    """
    # Decodificar parámetros
    decoded = base64.b64decode(merchant_parameters).decode()
    params = json.loads(decoded)
    
    # Validar firma
    order = params.get('Ds_Order', '')
    expected_signature = create_merchant_signature(merchant_parameters, order)
    
    if expected_signature != signature:
        logger.error(f"Firma inválida en notificación de Redsys. Orden: {order}")
        return False, params
    
    return True, params

def get_timestamp():
    """
    Genera un timestamp en formato YYYYMMDDHHMMSS
    """
    now = timezone.now()
    return now.strftime('%Y%m%d%H%M%S')

class PaymentService:
    """
    Servicio para gestionar pagos de reservas
    """
    
    def __init__(self):
        """Inicializa el servicio de pagos"""
        logger.info("Inicializando PaymentService")
    
    def process_payment(self, reserva, payment_data):
        """
        Procesa un pago para una reserva
        
        Args:
            reserva: Objeto Reserva
            payment_data: Dict con datos del pago
                {
                    'metodo_pago': 'tarjeta|paypal|efectivo',
                    'importe': float,
                    'datos_pago': {
                        'titular': str,
                        'email': str,
                        ...campos específicos según método...
                    }
                }
        
        Returns:
            Dict con resultado del pago
        """
        method = payment_data.get('metodo_pago', 'tarjeta')
        amount = Decimal(str(payment_data.get('importe', 0)))
        payment_details = payment_data.get('datos_pago', {})
        
        try:
            logger.info(f"Procesando pago de {amount}€ para reserva {reserva.id} con método {method}")
            
            if method == 'tarjeta':
                return self._process_card_payment(reserva, amount, payment_details)
            elif method == 'paypal':
                return self._process_paypal_payment(reserva, amount, payment_details)
            elif method == 'efectivo':
                return self._process_cash_payment(reserva, amount, payment_details)
            else:
                logger.error(f"Método de pago no soportado: {method}")
                return {
                    'success': False,
                    'error': 'Método de pago no soportado',
                    'reserva_id': reserva.id
                }
                
        except Exception as e:
            logger.exception(f"Error procesando pago: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'reserva_id': reserva.id
            }
    
    def _process_card_payment(self, reserva, amount, payment_details):
        """
        Procesa pago con tarjeta (Redsys)
        """
        # En producción, conectaría con Redsys
        # En este ejemplo, simularemos un pago exitoso
        transaction_id = f"TX-{get_timestamp()}-{reserva.id}"
        
        logger.info(f"Pago con tarjeta exitoso para reserva {reserva.id}. Transaction ID: {transaction_id}")
        
        return {
            'success': True,
            'message': 'Pago procesado correctamente',
            'reserva_id': reserva.id,
            'transaction_id': transaction_id,
            'method': 'tarjeta',
            'amount': float(amount),
            'timestamp': timezone.now().isoformat()
        }
    
    def _process_paypal_payment(self, reserva, amount, payment_details):
        """
        Procesa pago con PayPal
        """
        # En producción, conectaría con PayPal API
        # En este ejemplo, simularemos un pago exitoso
        transaction_id = f"PP-{get_timestamp()}-{reserva.id}"
        
        logger.info(f"Pago con PayPal exitoso para reserva {reserva.id}. Transaction ID: {transaction_id}")
        
        return {
            'success': True,
            'message': 'Pago procesado correctamente',
            'reserva_id': reserva.id,
            'transaction_id': transaction_id,
            'method': 'paypal',
            'amount': float(amount),
            'timestamp': timezone.now().isoformat()
        }
    
    def _process_cash_payment(self, reserva, amount, payment_details):
        """
        Registra pago en efectivo (se paga en oficina)
        """
        transaction_id = f"CASH-{get_timestamp()}-{reserva.id}"
        
        logger.info(f"Pago en efectivo registrado para reserva {reserva.id}. Transaction ID: {transaction_id}")
        
        return {
            'success': True,
            'message': 'Pago en efectivo registrado correctamente',
            'reserva_id': reserva.id,
            'transaction_id': transaction_id,
            'method': 'efectivo',
            'amount': float(amount),
            'timestamp': timezone.now().isoformat()
        }