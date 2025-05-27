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
    print("Testing logger creation...")
    import logging
    logger = logging.getLogger(__name__)
    print("✓ Logger creation successful")
    
    print("Testing direct import...")
    
    # Test step by step
    print("Importing module...")
    import importlib.util
    spec = importlib.util.spec_from_file_location("api.views.reservas", "api/views/reservas.py")
    module = importlib.util.module_from_spec(spec)
    
    print("Executing module...")
    spec.loader.exec_module(module)
    
    print(f"Module attributes: {[attr for attr in dir(module) if not attr.startswith('_')]}")
    
    if hasattr(module, 'ReservaViewSet'):
        print("✓ ReservaViewSet found!")
    else:
        print("✗ ReservaViewSet not found")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
