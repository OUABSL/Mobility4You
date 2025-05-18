# Django backend para integración con Redsys
# archivo: payments/views.py

import json
import base64
import hmac
import hashlib
import datetime
from decimal import Decimal
from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Reserva
from .models import PagoRedsys
# from .serializers import RedsysPaymentSerializer

# Configuración Redsys
REDSYS_CONFIG = {
    'merchant_code': getattr(settings, 'REDSYS_MERCHANT_CODE', '999008881'),
    'terminal': getattr(settings, 'REDSYS_TERMINAL', '001'),
    'secret_key': getattr(settings, 'REDSYS_SECRET_KEY', 'sq7HjrUOBfKmC576ILgskD5srU870gJ7'),
    'currency': '978',  # EUR
    'transaction_type': '0',  # Autorización
    'environment': getattr(settings, 'REDSYS_ENVIRONMENT', 'test')
}

REDSYS_URLS = {
    'test': 'https://sis-t.redsys.es:25443/sis/realizarPago',
    'production': 'https://sis.redsys.es/sis/realizarPago'
}

def generate_redsys_signature(merchant_parameters, secret_key):
    """Genera la firma HMAC SHA256 para Redsys"""
    try:
        # Decodificar la clave secreta
        decoded_key = base64.b64decode(secret_key)
        
        # Obtener el número de pedido de los parámetros
        decoded_params = base64.b64decode(merchant_parameters).decode('utf-8')
        params_dict = json.loads(decoded_params)
        order_number = params_dict.get('DS_MERCHANT_ORDER', '')
        
        # Generar clave específica del pedido
        order_key = hmac.new(
            decoded_key,
            order_number.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        # Generar firma final
        signature = hmac.new(
            order_key,
            merchant_parameters.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        return base64.b64encode(signature).decode('utf-8')
    except Exception as e:
        raise ValueError(f"Error generando firma Redsys: {str(e)}")

class PrepareRedsysPaymentView(APIView):
    """Vista para preparar el pago con Redsys"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            redsys_params = request.data.get('redsysParams')
            reserva_data = request.data.get('reservaData')
            
            if not redsys_params or not reserva_data:
                return Response(
                    {'error': 'Datos de pago incompletos'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validar y ajustar parámetros
            order_number = redsys_params.get('DS_MERCHANT_ORDER')
            amount = redsys_params.get('DS_MERCHANT_AMOUNT')
            
            # Crear registro de pago pendiente
            pago_redsys = PagoRedsys.objects.create(
                numero_pedido=order_number,
                importe=Decimal(amount) / 100,  # Redsys envía en céntimos
                estado='PENDIENTE',
                datos_reserva=reserva_data,
                fecha_creacion=datetime.datetime.now()
            )
            
            # Codificar parámetros en base64
            merchant_parameters = base64.b64encode(
                json.dumps(redsys_params).encode('utf-8')
            ).decode('utf-8')
            
            # Generar firma
            signature = generate_redsys_signature(
                merchant_parameters, 
                REDSYS_CONFIG['secret_key']
            )
            
            # Seleccionar URL según entorno
            redsys_url = REDSYS_URLS[REDSYS_CONFIG['environment']]
            
            # Guardar datos adicionales del pago
            pago_redsys.merchant_parameters = merchant_parameters
            pago_redsys.signature = signature
            pago_redsys.save()
            
            return Response({
                'merchantParameters': merchant_parameters,
                'signature': signature,
                'signatureVersion': 'HMAC_SHA256_V1',
                'redsysUrl': redsys_url,
                'orderNumber': order_number
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error preparando pago: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@method_decorator(csrf_exempt, name='dispatch')
class RedsysNotificationView(APIView):
    """Vista para recibir notificaciones de Redsys"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            # Obtener parámetros de Redsys
            merchant_parameters = request.data.get('Ds_MerchantParameters')
            signature = request.data.get('Ds_Signature')
            signature_version = request.data.get('Ds_SignatureVersion')
            
            if not all([merchant_parameters, signature, signature_version]):
                return HttpResponse('Parámetros incompletos', status=400)
            
            # Verificar firma
            expected_signature = generate_redsys_signature(
                merchant_parameters,
                REDSYS_CONFIG['secret_key']
            )
            
            if signature != expected_signature:
                return HttpResponse('Firma inválida', status=400)
            
            # Decodificar parámetros
            decoded_params = json.loads(
                base64.b64decode(merchant_parameters).decode('utf-8')
            )
            
            response_code = int(decoded_params.get('Ds_Response', '9999'))
            order_number = decoded_params.get('Ds_Order')
            authorisation_code = decoded_params.get('Ds_AuthorisationCode', '')
            amount = decoded_params.get('Ds_Amount')
            merchant_data = decoded_params.get('Ds_MerchantData', '{}')
            
            # Buscar el pago en la base de datos
            try:
                pago_redsys = PagoRedsys.objects.get(numero_pedido=order_number)
            except PagoRedsys.DoesNotExist:
                return HttpResponse('Pedido no encontrado', status=404)
            
            # Verificar si el pago fue exitoso (códigos 0-99 son exitosos)
            if 0 <= response_code <= 99:
                # Pago exitoso
                pago_redsys.estado = 'COMPLETADO'
                pago_redsys.codigo_autorizacion = authorisation_code
                pago_redsys.codigo_respuesta = str(response_code)
                pago_redsys.fecha_pago = datetime.datetime.now()
                
                # Crear o actualizar reserva
                reserva_data = pago_redsys.datos_reserva
                reserva = self._crear_reserva_desde_pago(pago_redsys, reserva_data)
                pago_redsys.reserva = reserva
                
                # Enviar email de confirmación
                self._enviar_email_confirmacion(reserva)
                
            else:
                # Pago fallido
                pago_redsys.estado = 'FALLIDO'
                pago_redsys.codigo_respuesta = str(response_code)
                pago_redsys.mensaje_error = f'Pago rechazado. Código: {response_code}'
            
            pago_redsys.save()
            
            return HttpResponse('OK', status=200)
            
        except Exception as e:
            print(f"Error procesando notificación Redsys: {str(e)}")
            return HttpResponse('Error interno', status=500)
    
    def _crear_reserva_desde_pago(self, pago_redsys, reserva_data):
        """Crea una reserva en la base de datos desde los datos del pago"""
        # Aquí implementas la lógica para crear la reserva
        # según tu modelo de datos específico
        pass
    
    def _enviar_email_confirmacion(self, reserva):
        """Envía email de confirmación al cliente"""
        # Aquí implementas el envío de email
        pass

@api_view(['GET'])
@permission_classes([AllowAny])
def redsys_success(request):
    """Vista para redirección de éxito"""
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    return HttpResponseRedirect(
        f"{frontend_url}/reservation-confirmation/exito?payment=success"
    )

@api_view(['GET'])
@permission_classes([AllowAny])
def redsys_error(request):
    """Vista para redirección de error"""
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    return HttpResponseRedirect(
        f"{frontend_url}/reservation-confirmation/error?payment=failed"
    )

@api_view(['GET'])
@permission_classes([AllowAny])
def check_payment_status(request, order_number):
    """Verificar estado de un pago"""
    try:
        pago = PagoRedsys.objects.get(numero_pedido=order_number)
        return Response({
            'order_number': order_number,
            'status': pago.estado,
            'amount': str(pago.importe),
            'created_at': pago.fecha_creacion,
            'paid_at': pago.fecha_pago,
            'authorization_code': pago.codigo_autorizacion
        })
    except PagoRedsys.DoesNotExist:
        return Response(
            {'error': 'Pago no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )