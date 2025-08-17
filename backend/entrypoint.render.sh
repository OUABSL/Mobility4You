#!/bin/bash
set -e  # Exit on any error

echo "=== MOBILITY4YOU ENTRYPOINT RENDER COMPATIBLE ==="

# Mapear variables para compatibilidad
DB_HOST=${DB_HOST:-${POSTGRES_HOST:-localhost}}
DB_PORT=${DB_PORT:-${POSTGRES_PORT:-5432}}
DB_NAME=${DB_NAME:-${POSTGRES_DB:-mobility4you_db}}
DB_USER=${DB_USER:-${POSTGRES_USER:-mobility4you_db_user}}

echo "Variables mapeadas: DB_HOST=$DB_HOST, DB_PORT=$DB_PORT, DB_NAME=$DB_NAME, DB_USER=$DB_USER"

echo "Esperando a que PostgreSQL esté disponible..."
timeout=30
counter=0
until nc -z $DB_HOST $DB_PORT; do
  sleep 2
  counter=$((counter + 1))
  if [ $counter -ge $timeout ]; then
    echo "❌ Timeout esperando PostgreSQL en $DB_HOST:$DB_PORT"
    exit 1
  fi
  echo "Intentando conectar a PostgreSQL... ($counter/$timeout)"
done
echo "✅ PostgreSQL disponible en $DB_HOST:$DB_PORT!"

# Verificar configuración Django
echo "🔧 Verificando configuración Django..."
python manage.py check
echo "✅ Configuración Django válida"

# Ejecutar migraciones
echo "🔄 Ejecutando migraciones..."
python manage.py makemigrations --noinput 2>/dev/null || true
python manage.py migrate --noinput
echo "✅ Migraciones completadas"

# Crear superusuario si no existe
echo "👤 Verificando superusuario..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@mobility4you.com', 'admin123')
    print('✅ Superusuario creado: admin/admin123')
else:
    print('✅ Superusuario ya existe')
"

# Recopilar archivos estáticos
echo "📁 Recopilando archivos estáticos..."
python manage.py collectstatic --noinput
echo "✅ Archivos estáticos recopilados"

# Versionado automático de archivos estáticos
echo "🔄 Ejecutando versionado automático de archivos estáticos..."
if python manage.py version_static_assets; then
    echo "✅ Versionado automático completado"
else
    echo "⚠️ Versionado automático falló, usando fallbacks"
    # Crear mapeo de fallback
    python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.render')
django.setup()

try:
    from utils.static_hooks import StaticVersioningHooks
    StaticVersioningHooks.ensure_fallback_mapping()
    print('✅ Mapeo de fallback creado')
except Exception as e:
    print(f'⚠️ Error creando fallback: {e}')
"
fi

echo "🚀 Iniciando servidor Django..."
exec "$@"
