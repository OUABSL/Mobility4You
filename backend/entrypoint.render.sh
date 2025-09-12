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

# Configurar archivos estáticos
echo "📁 Configurando archivos estáticos..."

# Crear directorio media si no existe (separado de staticfiles)
mkdir -p /app/media/vehiculos
chmod -R 755 /app/media
echo "✅ Directorio media creado: /app/media"

# Verificar build info para cache invalidation
if [ -f "/app/build_info.txt" ]; then
    echo "🔍 Build Info:"
    cat /app/build_info.txt
fi

# Forzar limpieza completa de static files
echo "🧹 Limpiando static files anteriores..."
rm -rf /app/staticfiles/*

python manage.py collectstatic --noinput --clear
echo "✅ Archivos estáticos recolectados ($(ls -1 /app/staticfiles/ | wc -l) directorios)"

# Verificar que admin static files estén presentes
if [ -d "/app/staticfiles/admin/" ]; then
    admin_files=$(find /app/staticfiles/admin/ -name "*.css" -o -name "*.js" | wc -l)
    echo "✅ Django Admin files: $admin_files archivos encontrados"
else
    echo "⚠️ Directorio admin static files no encontrado"
fi

# Configurar sistema de versionado optimizado
echo "🔧 Configurando sistema de archivos estáticos..."
python manage.py setup_static_assets 2>/dev/null || echo "⚠️ Usando configuración automática en startup"

echo "🚀 Iniciando servidor Django..."
exec "$@"
