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
    print("Testing imports...")
    from api.models.reservas import Reserva
    print("✓ Reserva model import successful")
    
    from api.serializers.reservas import ReservaSerializer
    print("✓ ReservaSerializer import successful")
    
    from api.services.reservas import ReservaService
    print("✓ ReservaService import successful")
    
    from api.views.reservas import ReservaViewSet
    print("✓ ReservaViewSet import successful")
    
    print("\nAll imports successful!")
    
except ImportError as e:
    print(f"Import error: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    print(f"Other error: {e}")
    import traceback
    traceback.print_exc()
