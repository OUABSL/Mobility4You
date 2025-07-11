#!/bin/bash

# build.sh para Render
# Este script se ejecuta automáticamente cuando Render despliega la aplicación

set -o errexit  # exit on error

# Instalar dependencias
pip install --upgrade pip
pip install -r requirements.txt

# Recopilar archivos estáticos
echo "🔄 Collecting static files..."
python manage.py collectstatic --noinput --clear

# Ejecutar migraciones solo si DATABASE_URL está configurada
if [[ -n "$DATABASE_URL" ]]; then
    echo "🔄 Running database migrations..."
    python manage.py migrate --noinput
else
    echo "⚠️  DATABASE_URL not found, skipping migrations..."
fi

# Crear superusuario si no existe (solo si se proporciona)
if [[ $CREATE_SUPERUSER ]]; then
    python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser(
        username='admin',
        email='admin@mobility4you.com',
        password='$DJANGO_SUPERUSER_PASSWORD'
    )
    print('Superuser created successfully')
else:
    print('Superuser already exists')
"
fi

echo "✅ Build completed successfully!"
