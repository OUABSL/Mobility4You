# archivo: utils/test_redsys_integration.py
# Script para verificar la integración con Redsys

import requests
import json
from decimal import Decimal

def test_redsys_integration():
    """Script para probar la integración con Redsys localmente"""
    
    # Configuración
    BASE_URL = 'http://localhost:8000'
    
    # Datos de prueba
    test_reserva_data = {
        'conductorPrincipal': {
            'nombre': 'Juan',
            'apellidos': 'Pérez García',
            'email': 'juan.perez@example.com',
            'telefono': '+34600123456',
            'fechaNacimiento': '1985-05-15',
            'nacionalidad': 'Española',
            'tipoDocumento': 'dni',
            'numeroDocumento': '12345678Z',
            'direccion': {
                'calle': 'Calle Mayor, 123',
                'ciudad': 'Madrid',
                'provincia': 'Madrid',
                'pais': 'España',
                'codigoPostal': '28001'
            }
        },
        'car': {
            'id': 1,
            'marca': 'Audi',
            'modelo': 'A3',
            'precio_dia': 50
        },
        'fechas': {
            'pickupDate': '2025-05-20',
            'dropoffDate': '2025-05-23',
            'pickupLocation': 'Aeropuerto de Málaga',
            'dropoffLocation': 'Aeropuerto de Málaga'
        },
        'paymentOption': 'all-inclusive',
        'extras': [],
        'detallesReserva': {
            'precioCocheBase': 150.00,
            'iva': 31.50,
            'precioExtras': 0.00,
            'total': 181.50
        },
        'metodoPago': 'tarjeta'
    }
    
    test_redsys_params = {
        'DS_MERCHANT_AMOUNT': '18150',  # 181.50€ en céntimos
        'DS_MERCHANT_ORDER': 'RSV20250520001',
        'DS_MERCHANT_MERCHANTCODE': '999008881',
        'DS_MERCHANT_CURRENCY': '978',
        'DS_MERCHANT_TRANSACTIONTYPE': '0',
        'DS_MERCHANT_TERMINAL': '001',
        'DS_MERCHANT_MERCHANTURL': f'{BASE_URL}/api/payments/redsys/notify/',
        'DS_MERCHANT_URLOK': f'{BASE_URL}/api/payments/redsys/success/',
        'DS_MERCHANT_URLKO': f'{BASE_URL}/api/payments/redsys/error/',
        'DS_MERCHANT_PRODUCTDESCRIPTION': 'Reserva vehículo Audi A3',
        'DS_MERCHANT_TITULAR': 'Juan Pérez García',
        'DS_MERCHANT_MERCHANTDATA': json.dumps({
            'reservaId': 'RSV20250520001',
            'email': 'juan.perez@example.com'
        })
    }
    
    print("🧪 Probando integración con Redsys...")
    print("-" * 50)
    
    # 1. Probar endpoint de preparación
    print("1. Probando preparación de pago...")
    try:
        response = requests.post(
            f'{BASE_URL}/api/payments/redsys/prepare/',
            json={
                'redsysParams': test_redsys_params,
                'reservaData': test_reserva_data
            },
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Preparación exitosa!")
            print(f"   - Merchant Parameters: {data.get('merchantParameters', '')[:50]}...")
            print(f"   - Signature: {data.get('signature', '')[:30]}...")
            print(f"   - Redsys URL: {data.get('redsysUrl', '')}")
            print(f"   - Order Number: {data.get('orderNumber', '')}")
            
            # Guardar datos para próximas pruebas
            order_number = data.get('orderNumber')
            
        else:
            print(f"❌ Error en preparación: {response.status_code}")
            print(f"   Respuesta: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error de conexión: {str(e)}")
        return False
    
    # 2. Probar verificación de estado
    print("\n2. Probando verificación de estado...")
    try:
        if order_number:
            response = requests.get(
                f'{BASE_URL}/api/payments/redsys/status/{order_number}/'
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Verificación de estado exitosa!")
                print(f"   - Estado: {data.get('status')}")
                print(f"   - Importe: {data.get('amount')}€")
                print(f"   - Fecha creación: {data.get('created_at')}")
            else:
                print(f"❌ Error en verificación: {response.status_code}")
                print(f"   Respuesta: {response.text}")
                
    except Exception as e:
        print(f"❌ Error en verificación: {str(e)}")
    
    # 3. Probar URLs de redirección
    print("\n3. Probando URLs de redirección...")
    try:
        # Success URL
        response = requests.get(f'{BASE_URL}/api/payments/redsys/success/', allow_redirects=False)
        if response.status_code in [301, 302]:
            print("✅ URL de éxito configurada correctamente")
            print(f"   Redirige a: {response.headers.get('Location')}")
        else:
            print(f"⚠️  URL de éxito responde con código: {response.status_code}")
        
        # Error URL
        response = requests.get(f'{BASE_URL}/api/payments/redsys/error/', allow_redirects=False)
        if response.status_code in [301, 302]:
            print("✅ URL de error configurada correctamente")
            print(f"   Redirige a: {response.headers.get('Location')}")
        else:
            print(f"⚠️  URL de error responde con código: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error probando redirecciones: {str(e)}")
    
    print("\n" + "=" * 50)
    print("✨ Prueba de integración completada!")
    print("\n📋 Siguientes pasos:")
    print("1. Verificar logs del servidor Django")
    print("2. Probar desde el frontend React")
    print("3. Configurar webhooks de notificación")
    print("4. Activar SSL para producción")
    
    return True

# archivo: utils/redsys_signature_test.py
# Script para probar la generación de firmas Redsys

import base64
import hmac
import hashlib
import json

def test_signature_generation():
    """Prueba la generación de firmas Redsys"""
    
    # Datos de prueba
    secret_key = 'sq7HjrUOBfKmC576ILgskD5srU870gJ7'  # Clave de pruebas
    
    redsys_params = {
        'DS_MERCHANT_AMOUNT': '18150',
        'DS_MERCHANT_ORDER': 'RSV20250520001',
        'DS_MERCHANT_MERCHANTCODE': '999008881',
        'DS_MERCHANT_CURRENCY': '978',
        'DS_MERCHANT_TRANSACTIONTYPE': '0',
        'DS_MERCHANT_TERMINAL': '001'
    }
    
    print("🔐 Probando generación de firmas Redsys...")
    print("-" * 40)
    
    try:
        # 1. Codificar parámetros en base64
        merchant_parameters = base64.b64encode(
            json.dumps(redsys_params).encode('utf-8')
        ).decode('utf-8')
        
        print(f"1. Merchant Parameters: {merchant_parameters}")
        
        # 2. Generar firma
        # Decodificar clave secreta
        decoded_key = base64.b64decode(secret_key)
        
        # Obtener número de pedido
        order_number = redsys_params['DS_MERCHANT_ORDER']
        
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
        
        final_signature = base64.b64encode(signature).decode('utf-8')
        
        print(f"2. Signature: {final_signature}")
        print("✅ Firma generada correctamente!")
        
        # 3. Verificar que podemos decodificar los parámetros
        decoded_params = json.loads(
            base64.b64decode(merchant_parameters).decode('utf-8')
        )
        
        print(f"3. Parámetros decodificados: {json.dumps(decoded_params, indent=2)}")
        print("✅ Verificación exitosa!")
        
    except Exception as e:
        print(f"❌ Error generando firma: {str(e)}")
        return False
    
    return True

# Ejecutar pruebas
if __name__ == '__main__':
    print("🚀 Iniciando pruebas de integración Redsys\n")
    
    # Probar generación de firmas
    signature_ok = test_signature_generation()
    
    if signature_ok:
        print("\n" + "="*50 + "\n")
        # Probar integración completa
        test_redsys_integration()
    else:
        print("❌ Error en generación de firmas. Revisar configuración.")

# archivo: utils/check_django_setup.py
# Script para verificar que Django está configurado correctamente

import os
import sys
import django
from django.conf import settings

def check_django_setup():
    """Verifica que Django esté configurado correctamente para Redsys"""
    
    print("🔍 Verificando configuración Django...")
    print("-" * 40)
    
    # Verificar variables de entorno
    env_vars = [
        'REDSYS_MERCHANT_CODE',
        'REDSYS_TERMINAL', 
        'REDSYS_SECRET_KEY',
        'REDSYS_ENVIRONMENT',
        'FRONTEND_URL'
    ]
    
    print("1. Variables de entorno:")
    all_env_ok = True
    for var in env_vars:
        value = getattr(settings, var, None)
        if value:
            print(f"   ✅ {var}: {'*' * (len(str(value)) - 4) + str(value)[-4:]}")
        else:
            print(f"   ❌ {var}: NO CONFIGURADA")
            all_env_ok = False
    
    # Verificar apps instaladas
    print("\n2. Apps de Django:")
    required_apps = [
        'rest_framework',
        'corsheaders',
        'payments'  # Asumiendo que tu app se llama 'payments'
    ]
    
    for app in required_apps:
        if app in settings.INSTALLED_APPS:
            print(f"   ✅ {app}")
        else:
            print(f"   ❌ {app}: NO INSTALADA")
    
    # Verificar CORS
    print("\n3. Configuración CORS:")
    if hasattr(settings, 'CORS_ALLOWED_ORIGINS'):
        print(f"   ✅ CORS_ALLOWED_ORIGINS: {settings.CORS_ALLOWED_ORIGINS}")
    else:
        print("   ⚠️  CORS_ALLOWED_ORIGINS no configurado")
    
    # Verificar base de datos
    print("\n4. Base de datos:")
    try:
        from django.db import connection
        cursor = connection.cursor()
        cursor.execute("SELECT 1")
        print("   ✅ Conexión a base de datos OK")
    except Exception as e:
        print(f"   ❌ Error de conexión: {str(e)}")
    
    print("\n" + "="*40)
    if all_env_ok:
        print("✨ Configuración Django lista para Redsys!")
    else:
        print("⚠️  Revisar variables de entorno faltantes")

if __name__ == '__main__':
    # Configurar Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
    django.setup()
    
    check_django_setup()