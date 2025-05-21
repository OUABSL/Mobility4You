# Django backend para integración con Redsys
# archivo: payments/views.py

import json
import base64
import hmac
import hashlib
import logging
from decimal import Decimal
from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.reservas import Reserva
from .models import PagoRedsys
from .serializers import RedsysPaymentSerializer, PagoRedsysSerializer
from .services import prepare_payment, process_notification
import datetime

logger = logging.getLogger('redsys')

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
            serializer = RedsysPaymentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            redsys_params = serializer.validated_data['redsysParams']
            reserva_data = serializer.validated_data['reservaData']

            merchant_parameters, signature, signature_version, redsys_url = prepare_payment(redsys_params, reserva_data)

            # Guardar el pago pendiente
            pago = PagoRedsys.objects.create(
                numero_pedido=redsys_params['DS_MERCHANT_ORDER'],
                importe=Decimal(redsys_params['DS_MERCHANT_AMOUNT']) / 100,  # Redsys usa céntimos
                estado='PENDIENTE',
                merchant_parameters=merchant_parameters,
                signature=signature,
                datos_reserva=reserva_data
            )
            logger.info(f"Pago Redsys preparado: {pago.numero_pedido}")

            return Response({
                'merchantParameters': merchant_parameters,
                'signature': signature,
                'signatureVersion': signature_version,
                'redsysUrl': redsys_url,
                'orderNumber': pago.numero_pedido
            })
        except Exception as e:
            logger.error(f"Error en preparación de pago Redsys: {str(e)}")
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class RedsysNotificationView(APIView):
    """Vista para recibir notificaciones de Redsys"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            merchant_parameters = request.data.get('Ds_MerchantParameters')
            signature = request.data.get('Ds_Signature')
            is_valid, params = process_notification(merchant_parameters, signature)
            order_id = params.get('Ds_Order', None)
            pago = None
            if order_id:
                pago = PagoRedsys.objects.filter(numero_pedido=order_id).first()
            if is_valid and pago:
                # Actualizar pago como completado
                pago.estado = 'COMPLETADO' if params.get('Ds_Response', '') and int(params.get('Ds_Response', '999')) < 100 else 'FALLIDO'
                pago.codigo_autorizacion = params.get('Ds_AuthorisationCode', '')
                pago.codigo_respuesta = params.get('Ds_Response', '')
                pago.fecha_pago = timezone.now()
                pago.save()
                logger.info(f"Pago Redsys notificado: {pago.numero_pedido} - Estado: {pago.estado}")
                return Response({'success': True, 'order': order_id, 'status': pago.estado})
            else:
                if pago:
                    pago.estado = 'FALLIDO'
                    pago.mensaje_error = 'Firma inválida o error en notificación.'
                    pago.save()
                logger.warning(f"Notificación Redsys inválida para pedido {order_id}")
                return Response({'success': False, 'order': order_id, 'status': 'FALLIDO'}, status=400)
        except Exception as e:
            logger.error(f"Error en notificación Redsys: {str(e)}")
            return Response({'detail': str(e)}, status=400)

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
        serializer = PagoRedsysSerializer(pago)
        return Response(serializer.data)
    except PagoRedsys.DoesNotExist:
        return Response({'detail': 'Pago no encontrado'}, status=404)
    except Exception as e:
        logger.error(f"Error verificando estado de pago: {str(e)}")
        return Response({'detail': str(e)}, status=400)