import django
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

print("Testing minimal ReservaViewSet...")

# Test reading the file directly
with open('api/views/reservas.py', 'r', encoding='utf-8') as f:
    content = f.read()
    
print(f"File length: {len(content)} characters")
print("Checking for 'class ReservaViewSet'...")

if 'class ReservaViewSet' in content:
    print("✓ Class definition found in file")
    # Find the position
    pos = content.find('class ReservaViewSet')
    lines_before = content[:pos].count('\n')
    print(f"  Found at line {lines_before + 1}")
else:
    print("✗ Class definition NOT found in file")

print("\nChecking for syntax errors...")
try:
    exec(compile(content, 'api/views/reservas.py', 'exec'))
    print("✓ No compilation errors found")
except SyntaxError as e:
    print(f"✗ Syntax error: {e}")
    print(f"  Line {e.lineno}: {e.text}")
except Exception as e:
    print(f"✗ Runtime error during compilation: {e}")
    import traceback
    traceback.print_exc()
