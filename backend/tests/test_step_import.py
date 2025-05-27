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

try:
    print("Testing step-by-step import...")
    
    print("1. Importing payments.services...")
    from payments.services import PaymentService
    print("✓ PaymentService import successful")
    
    print("2. Importing api.services.reservas...")
    from api.services.reservas import ReservaService
    print("✓ ReservaService import successful")
    
    print("3. Importing api.serializers.reservas...")
    from api.serializers.reservas import ReservaSerializer
    print("✓ ReservaSerializer import successful")
    
    print("4. Now trying the actual import...")
    from api.views.reservas import ReservaViewSet
    print("✓ ReservaViewSet import successful!")
    
    print(f"ReservaViewSet type: {type(ReservaViewSet)}")
    
except Exception as e:
    print(f"Error at step: {e}")
    import traceback
    traceback.print_exc()
