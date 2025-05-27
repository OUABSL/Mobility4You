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

print("Testing individual imports...")

try:
    # Test importing the module itself
    import api.views.reservas as reservas_module
    print("✓ Module import successful")
    
    # Check what's in the module
    print(f"Module attributes: {dir(reservas_module)}")
    
    # Check if ReservaViewSet is in the module
    if hasattr(reservas_module, 'ReservaViewSet'):
        print("✓ ReservaViewSet found in module")
        print(f"ReservaViewSet type: {type(reservas_module.ReservaViewSet)}")
    else:
        print("✗ ReservaViewSet NOT found in module")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
