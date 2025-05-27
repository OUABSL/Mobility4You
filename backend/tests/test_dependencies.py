#!/usr/bin/env python
import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Setup Django
django.setup()

print("Testing dependencies...")

try:
    print("1. Testing base imports...")
    import logging
    from decimal import Decimal
    from django.db import transaction
    from django.shortcuts import get_object_or_404
    from django.utils import timezone
    from django.conf import settings
    from rest_framework import viewsets, status
    from rest_framework.decorators import action
    from rest_framework.response import Response
    from rest_framework.permissions import IsAuthenticated
    print("✓ Base imports successful")
    
    print("2. Testing model imports...")
    from api.models.reservas import Reserva
    from api.models.usuarios import Usuario
    print("✓ Model imports successful")
    
    print("3. Testing serializer imports...")
    from api.serializers.reservas import ReservaSerializer
    print("✓ Serializer imports successful")
    
    print("4. Testing service imports...")
    from api.services.reservas import ReservaService
    print("✓ Service imports successful")
    
    print("5. Testing payment service imports...")
    from payments.services import PaymentService
    print("✓ Payment service imports successful")
    
    print("6. Now trying to load the reservas.py file manually...")
    
    # Try to execute the file content
    with open('api/views/reservas.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Create a namespace to execute the file in
    namespace = {}
    exec(content, namespace)
    
    print(f"Namespace keys after execution: {list(namespace.keys())}")
    
    if 'ReservaViewSet' in namespace:
        print("✓ ReservaViewSet found in namespace")
    else:
        print("✗ ReservaViewSet NOT found in namespace")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
