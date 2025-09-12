#!/bin/bash
set -e  # Exit on any error

echo "=== MOBILITY4YOU ENTRYPOINT OPTIMIZADO ==="
echo "🔍 DEBUG: Variables de entorno cargadas:"
echo "DJANGO_ENV=$DJANGO_ENV"
echo "DB_HOST=$DB_HOST"
echo "DB_NAME=$DB_NAME"
echo "DB_USER=$DB_USER"
echo "DB_PASSWORD=***"
echo "SECRET_KEY=***"
echo "DEBUG=$DEBUG"

echo "Esperando a que la base de datos esté disponible..."
timeout=30
counter=0
until nc -z $DB_HOST ${DB_PORT:-5432}; do
  sleep 2
  counter=$((counter + 1))
  if [ $counter -ge $timeout ]; then
    echo "❌ Timeout esperando la base de datos"
    exit 1
  fi
done
echo "✅ Base de datos disponible!"

# Verificar configuración Django
echo "🔧 Verificando configuración Django..."
python manage.py check
echo "✅ Configuración Django válida"

# Ejecutar migraciones
echo "🔄 Ejecutando migraciones..."
python manage.py makemigrations --noinput 2>/dev/null || true
python manage.py migrate --noinput
echo "✅ Migraciones completadas"

# Recopilar archivos estáticos
echo "📁 Recopilando archivos estáticos..."
python manage.py collectstatic --noinput --clear
echo "✅ Archivos estáticos recopilados"

# Configurar sistema de versionado optimizado
echo "🔧 Configurando sistema de archivos estáticos..."
python manage.py setup_static_assets 2>/dev/null || echo "⚠️ Usando configuración automática en startup"

echo "🚀 Configuración completada - Iniciando servidor"

# Iniciar servidor
echo "=== INICIANDO SERVIDOR GUNICORN ==="
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info