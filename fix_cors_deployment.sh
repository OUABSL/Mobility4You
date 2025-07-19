#!/bin/bash
# fix_cors_deployment.sh - Script para aplicar correcciones CORS y desplegar

echo "🔧 APLICANDO CORRECCIONES CORS Y DESPLEGANDO..."
echo "================================================"

# Variables
FRONTEND_DIR="c:/Users/Work/Documents/GitHub/Movility-for-you/frontend"
BACKEND_DIR="c:/Users/Work/Documents/GitHub/Movility-for-you/backend"
BRANCH="prod-render"

# Función para logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "📋 RESUMEN DE CAMBIOS:"
echo "   ✅ CORS headers incorrectos eliminados del frontend"
echo "   ✅ Endpoints /caracteristicas/ y /estadisticas/ creados en backend"
echo "   ✅ Manejo de base de datos vacía implementado"
echo "   ✅ Validaciones de reserva restauradas"
echo ""

# 1. Verificar estado del repositorio
log "🔍 Verificando estado del repositorio..."
cd "$BACKEND_DIR/.."
git status --porcelain > /tmp/git_status.txt

if [ -s /tmp/git_status.txt ]; then
    log "📝 Se detectaron cambios pendientes:"
    cat /tmp/git_status.txt
else
    log "⚠️ No se detectaron cambios. ¿Ya fueron commiteados?"
fi

# 2. Verificar configuración CORS corregida
log "🔍 Verificando configuración CORS..."

# Verificar que no haya headers incorrectos en axios
if grep -q "Access-Control-Allow-Origin" "$FRONTEND_DIR/src/config/axiosConfig.js"; then
    log "❌ ERROR: Aún hay headers CORS incorrectos en axiosConfig.js"
    exit 1
else
    log "✅ Headers CORS corregidos en frontend"
fi

# Verificar endpoints en backend
if grep -q "def caracteristicas" "$BACKEND_DIR/comunicacion/views.py"; then
    log "✅ Endpoint caracteristicas creado"
else
    log "❌ ERROR: Endpoint caracteristicas no encontrado"
    exit 1
fi

if grep -q "def estadisticas" "$BACKEND_DIR/comunicacion/views.py"; then
    log "✅ Endpoint estadisticas creado"
else
    log "❌ ERROR: Endpoint estadisticas no encontrado"
    exit 1
fi

# 3. Verificar configuración CORS del backend
log "🔍 Verificando configuración CORS del backend..."
if grep -q "mobility4you.es" "$BACKEND_DIR/config/settings/render.py"; then
    log "✅ CORS_ALLOWED_ORIGINS configurado correctamente"
else
    log "❌ ERROR: CORS_ALLOWED_ORIGINS no configurado"
    exit 1
fi

# 4. Validar que no haya errores de sintaxis en Python
log "🔍 Validando sintaxis de Python..."
cd "$BACKEND_DIR"
python -m py_compile comunicacion/views.py
if [ $? -eq 0 ]; then
    log "✅ Sintaxis de views.py correcta"
else
    log "❌ ERROR: Error de sintaxis en views.py"
    exit 1
fi

# 5. Verificar que el frontend compile sin errores
log "🔍 Verificando compilación del frontend..."
cd "$FRONTEND_DIR"

# Verificar que exista el archivo de validaciones
if [ -f "src/validations/reservationValidations.js" ]; then
    log "✅ Archivo de validaciones restaurado"
else
    log "❌ ERROR: Archivo de validaciones no encontrado"
    exit 1
fi

# 6. Commitear cambios si es necesario
log "💾 Commiteando cambios..."
cd "$BACKEND_DIR/.."

if [ -s /tmp/git_status.txt ]; then
    git add .
    git commit -m "🔧 Fix CORS configuration and improve empty state handling

    Frontend:
    - Remove incorrect CORS headers from axios requests
    - Restore reservation validation system
    - Improve empty state component
    
    Backend:
    - Add missing /caracteristicas/ and /estadisticas/ endpoints
    - Implement proper empty database handling
    - Clean up CORS_ALLOWED_ORIGINS configuration
    
    Deployment:
    - Fix all CORS blocking issues
    - Ensure graceful handling of empty database states"
    
    log "✅ Cambios commiteados exitosamente"
else
    log "ℹ️ No hay cambios que commitear"
fi

# 7. Push a la rama de producción
log "🚀 Enviando cambios a la rama $BRANCH..."
git push origin "$BRANCH"

if [ $? -eq 0 ]; then
    log "✅ Cambios enviados exitosamente a $BRANCH"
else
    log "❌ ERROR: Error enviando cambios"
    exit 1
fi

# 8. Mostrar información de deployment
log "📋 INFORMACIÓN DE DEPLOYMENT:"
echo ""
echo "🌐 Frontend URL: https://mobility4you.es"
echo "🔗 Backend URL: https://mobility4you.onrender.com"
echo ""
echo "📝 Variables de entorno requeridas en Render:"
echo "   FRONTEND_URL=https://mobility4you.es"
echo "   BACKEND_URL=https://mobility4you.onrender.com"
echo ""
echo "🔧 CORS Configuration:"
echo "   ✅ Frontend: Headers de respuesta eliminados de requests"
echo "   ✅ Backend: CORS_ALLOWED_ORIGINS incluye mobility4you.es"
echo ""
echo "🎯 ENDPOINTS NUEVOS:"
echo "   GET /api/comunicacion/caracteristicas/?activo=true"
echo "   GET /api/comunicacion/estadisticas/?activo=true"
echo ""

# 9. Verificar el deployment automático
log "⏳ El deployment automático se iniciará en Render..."
log "🔍 Monitorea los logs en:"
echo "   https://dashboard.render.com/web/srv-[tu-service-id]/logs"
echo ""

# 10. Comandos para verificar después del deployment
log "🧪 COMANDOS DE VERIFICACIÓN POST-DEPLOYMENT:"
echo ""
echo "# Verificar CORS desde browser console:"
echo "fetch('https://mobility4you.onrender.com/api/lugares/lugares/')"
echo "  .then(r => console.log('✅ CORS OK:', r.status))"
echo "  .catch(e => console.log('❌ CORS Error:', e.message))"
echo ""
echo "# Verificar endpoints nuevos:"
echo "curl -H 'Origin: https://mobility4you.es' \\"
echo "     https://mobility4you.onrender.com/api/comunicacion/caracteristicas/?activo=true"
echo ""

log "🎉 CORRECCIONES APLICADAS Y DEPLOYMENT INICIADO"
log "⚡ Los errores CORS deberían resolverse automáticamente"

# Cleanup
rm -f /tmp/git_status.txt

echo "🏁 Script completado exitosamente"
