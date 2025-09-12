#!/bin/bash
# Script para deployment con cache invalidation completo
# Garantiza que Docker no use versiones anteriores del admin

set -e  # Salir si hay errores

echo "🚀 Iniciando deployment con cache invalidation..."

# 1. Generar timestamp único para cache busting
REBUILD_CACHE=$(date +%s)
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "📅 Cache ID: $REBUILD_CACHE"
echo "🕒 Build Date: $BUILD_DATE"

# 2. Limpiar containers y volumes existentes
echo "🧹 Limpiando containers y volumes existentes..."
docker-compose -f docker/docker-compose.render-dev.yml down --volumes --remove-orphans

# 3. Limpiar images existentes
echo "🗑️ Removiendo images anteriores..."
docker rmi $(docker images "movility-for-you*" -q) 2>/dev/null || echo "No hay images anteriores para remover"

# 4. Limpiar cache de Docker build
echo "🔄 Limpiando build cache..."
docker builder prune -f

# 5. Build con cache invalidation
echo "🔨 Building con cache invalidation..."
docker-compose -f docker/docker-compose.render-dev.yml build \
  --no-cache \
  --build-arg REBUILD_CACHE=$REBUILD_CACHE \
  --build-arg BUILD_DATE="$BUILD_DATE"

# 6. Levantar servicios
echo "⬆️ Levantando servicios..."
docker-compose -f docker/docker-compose.render-dev.yml up -d

# 7. Verificar que el admin esté funcionando
echo "🔍 Verificando admin..."
sleep 10

# Verificar que el container esté corriendo
if docker-compose -f docker/docker-compose.render-dev.yml ps | grep -q "Up"; then
    echo "✅ Servicios levantados correctamente"
    
    # Verificar logs del backend
    echo "📋 Últimos logs del backend:"
    docker-compose -f docker/docker-compose.render-dev.yml logs --tail=10 backend
    
    # Verificar static files
    echo "📁 Verificando static files en container..."
    docker-compose -f docker/docker-compose.render-dev.yml exec backend ls -la /app/staticfiles/admin/ | head -5
    
    echo "🎉 Deployment completado con cache fresh!"
    echo "🌐 Admin disponible en: http://localhost:8000/admin/"
    
else
    echo "❌ Error: Los servicios no se levantaron correctamente"
    echo "📋 Logs de error:"
    docker-compose -f docker/docker-compose.render-dev.yml logs --tail=20
    exit 1
fi
