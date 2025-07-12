#!/usr/bin/env bash
# Build script para Render.com

# Instalar dependencias
echo "Instalando dependencias..."
pip install --upgrade pip
pip install -r requirements.txt

# Ejecutar migraciones
echo "Ejecutando migraciones..."
python manage.py migrate

# Crear superusuario si no existe (opcional)
echo "Configurando usuario administrador..."
python manage.py shell << EOF
from usuarios.models import Usuario
import os

admin_email = os.environ.get('ADMIN_EMAIL', 'admin@render.com')
admin_password = os.environ.get('ADMIN_PASSWORD', 'adminpass123')

if not Usuario.objects.filter(email=admin_email).exists():
    Usuario.objects.create_superuser(
        username='admin',
        email=admin_email,
        password=admin_password
    )
    print(f"Superusuario creado: {admin_email}")
else:
    print(f"Superusuario ya existe: {admin_email}")
EOF

# Recopilar archivos estáticos
echo "Recopilando archivos estáticos..."
python manage.py collectstatic --noinput

echo "Build completado exitosamente!"
