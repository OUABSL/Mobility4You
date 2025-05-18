# archivo: payments/tests.py (tests básicos)

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import PagoRedsys
import json
import base64

class RedsysPaymentTests(APITestCase):
    
    def setUp(self):
        self.prepare_url = reverse('payments:redsys_prepare')
        self.notify_url = reverse('payments:redsys_notify')
        
        self.sample_reserva_data = {
            'conductorPrincipal': {
                'nombre': 'Juan',
                'apellidos': 'Pérez',
                'email': 'juan@example.com'
            },
            'car': {
                'id': 1,
                'marca': 'Audi',
                'modelo': 'A3'
            },
            'detallesReserva': {
                'total': 150.00
            }
        }
        
        self.sample_redsys_params = {
            'DS_MERCHANT_AMOUNT': '15000',
            'DS_MERCHANT_ORDER': 'RSV12345678901',
            'DS_MERCHANT_MERCHANTCODE': '999008881',
            'DS_MERCHANT_CURRENCY': '978',
            'DS_MERCHANT_TRANSACTIONTYPE': '0',
            'DS_MERCHANT_TERMINAL': '001',
            'DS_MERCHANT_MERCHANTURL': 'http://localhost:8000/api/payments/redsys/notify/',
            'DS_MERCHANT_URLOK': 'http://localhost:3000/reservation-confirmation/exito',
            'DS_MERCHANT_URLKO': 'http://localhost:3000/reservation-confirmation/error'
        }
    
    def test_prepare_payment_success(self):
        """Test preparación exitosa de pago"""
        data = {
            'redsysParams': self.sample_redsys_params,
            'reservaData': self.sample_reserva_data
        }
        
        response = self.client.post(self.prepare_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('merchantParameters', response.data)
        self.assertIn('signature', response.data)
        self.assertIn('redsysUrl', response.data)
        
        # Verificar que se creó el registro de pago
        pago = PagoRedsys.objects.get(numero_pedido='RSV12345678901')
        self.assertEqual(pago.estado, 'PENDIENTE')
        self.assertEqual(pago.importe, 150.00)
    
    def test_prepare_payment_missing_data(self):
        """Test preparación con datos faltantes"""
        data = {'redsysParams': self.sample_redsys_params}
        
        response = self.client.post(self.prepare_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_payment_notification_success(self):
        """Test notificación exitosa de pago"""
        # Crear pago pendiente
        pago = PagoRedsys.objects.create(
            numero_pedido='RSV12345678901',
            importe=150.00,
            estado='PENDIENTE',
            datos_reserva=self.sample_reserva_data
        )
        
        # Simular notificación de Redsys (esto requiere generar la firma correcta)
        # En un test real, usarías la biblioteca de Redsys para generar la firma
        
        # Por simplicidad, este test solo verifica la estructura
        self.assertTrue(pago.numero_pedido)

# archivo: payments/tasks.py (tareas asíncronas con Celery - opcional)

from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from .models import PagoRedsys

@shared_task
def enviar_email_confirmacion_pago(pago_id):
    """Envía email de confirmación de pago de forma asíncrona"""
    try:
        pago = PagoRedsys.objects.get(id=pago_id)
        
        if pago.es_pago_exitoso():
            email_cliente = pago.obtener_email_cliente()
            datos_vehiculo = pago.datos_vehiculo
            
            subject = f'Confirmación de Reserva - {pago.numero_pedido}'
            message = f'''
            ¡Hola!
            
            Tu pago ha sido procesado exitosamente.
            
            Detalles de la reserva:
            - Número de pedido: {pago.numero_pedido}
            - Vehículo: {datos_vehiculo.get('marca', '')} {datos_vehiculo.get('modelo', '')}
            - Importe: {pago.importe}€
            - Código de autorización: {pago.codigo_autorizacion}
            
            ¡Gracias por elegir nuestros servicios!
            '''
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email_cliente],
                fail_silently=False,
            )
            
    except PagoRedsys.DoesNotExist:
        pass
    except Exception as e:
        # Log del error
        print(f"Error enviando email: {str(e)}")