#!/bin/bash
set -e  # Exit on any error

echo "=== MOBILITY4YOU ENTRYPOINT OPTIMIZADO ==="
echo "Environment: ${DJANGO_ENV:-development}"
echo "DB_HOST: $DB_HOST, DB_NAME: $DB_NAME, DB_USER: $DB_USER"

# Esperar a que la base de datos esté disponible
echo "⏳ Waiting for database..."
timeout=60
counter=0
until nc -z $DB_HOST 3306; do
  sleep 2
  counter=$((counter+2))
  if [ $counter -ge $timeout ]; then
    echo "❌ Database connection timeout after ${timeout}s"
    exit 1
  fi
done
echo "✅ Database is available!"

# Verificar configuración Django
echo "🔧 Checking Django configuration..."
python manage.py check --deploy
echo "✅ Django configuration is valid"

# Ejecutar migraciones
echo "🔄 Running migrations..."
python manage.py makemigrations --noinput 2>/dev/null || true
python manage.py migrate --noinput
echo "✅ Migrations completed"

# Recopilar archivos estáticos (solo en producción)
if [ "${DJANGO_ENV}" = "production" ]; then
  echo "📁 Collecting static files..."
  python manage.py collectstatic --noinput --clear
  echo "✅ Static files collected"
  
  # Versionar archivos estáticos si está disponible
  echo "🏷️ Versioning static assets..."
  if python manage.py help version_static_assets >/dev/null 2>&1; then
    python manage.py version_static_assets
    echo "✅ Static assets versioned"
  else
    echo "⚠️ Static versioning not available"
  fi
fi

# Crear superusuario si es necesario (solo en desarrollo)
if [ "${DJANGO_ENV}" = "development" ] && [ "${CREATE_SUPERUSER}" = "true" ]; then
  echo "👤 Creating superuser..."
  python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@mobility4you.com', 'admin123')
    print('✅ Superuser created: admin/admin123')
else:
    print('ℹ️ Superuser already exists')
" || echo "⚠️ Could not create superuser"
fi

echo "🚀 Starting server..."

# Ejecutar el comando proporcionado
exec "$@"
