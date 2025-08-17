#!/bin/bash
# =======================================================
# SCRIPT DE LIMPIEZA PARA DESPLIEGUE EN NUEVO ENTORNO
# Mobility4You - Limpieza optimizada para deployment
# =======================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🧹 LIMPIEZA PARA NUEVO ENTORNO - MOBILITY4YOU"
echo "============================================="

# Verificar que estamos en el directorio correcto
if [ ! -f "manage.py" ] && [ ! -f "backend/manage.py" ]; then
    log_error "No se encuentra manage.py. Ejecuta desde la raíz del proyecto."
    exit 1
fi

total_freed=0

# 1. Limpiar cache de Python
log_info "Limpiando cache de Python..."
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "*.pyo" -delete 2>/dev/null || true
log_success "✅ Cache de Python eliminado"

# 2. Limpiar entorno virtual (si existe)
if [ -d "backend/venv" ]; then
    log_warning "Eliminando entorno virtual backend/venv"
    rm -rf backend/venv/
    log_success "✅ Entorno virtual eliminado - Recrear con 'python -m venv venv'"
fi

if [ -d "venv" ]; then
    log_warning "Eliminando entorno virtual ./venv"
    rm -rf venv/
    log_success "✅ Entorno virtual eliminado"
fi

# 3. Limpiar cache de herramientas
if [ -d "backend/.ruff_cache" ]; then
    rm -rf backend/.ruff_cache/
    log_success "✅ Cache de Ruff eliminado"
fi

if [ -d ".ruff_cache" ]; then
    rm -rf .ruff_cache/
    log_success "✅ Cache de Ruff (raíz) eliminado"
fi

# 4. Limpiar logs y archivos temporales
if [ -d "backend/logs" ]; then
    rm -rf backend/logs/
    log_success "✅ Logs eliminados (se regeneran automáticamente)"
fi

if [ -d "logs" ]; then
    rm -rf logs/
    log_success "✅ Logs (raíz) eliminados"
fi

if [ -d "backend/staticfiles" ]; then
    rm -rf backend/staticfiles/
    log_success "✅ Archivos estáticos eliminados (se regeneran con collectstatic)"
fi

# 5. Limpiar node_modules y build de frontend
if [ -d "frontend/node_modules" ]; then
    log_warning "Eliminando node_modules (puede ser grande...)"
    rm -rf frontend/node_modules/
    log_success "✅ node_modules eliminado - Recrear con 'npm install'"
fi

if [ -d "frontend/build" ]; then
    rm -rf frontend/build/
    log_success "✅ Build anterior eliminado"
fi

# 6. Limpiar archivos temporales de npm/yarn
find . -name "npm-debug.log*" -delete 2>/dev/null || true
find . -name "yarn-debug.log*" -delete 2>/dev/null || true
find . -name "yarn-error.log*" -delete 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true

# 7. Limpiar directorios vacíos
if [ -d "backend/notifications" ]; then
    if [ -z "$(find backend/notifications -type f)" ]; then
        rm -rf backend/notifications/
        log_success "✅ Directorio notifications vacío eliminado"
    fi
fi

if [ -d "backend/media" ]; then
    if [ -z "$(find backend/media -type f)" ]; then
        rm -rf backend/media/
        log_success "✅ Directorio media vacío eliminado"
    fi
fi

# 8. Verificar archivos .env duplicados
log_info "Verificando archivos de configuración..."

env_duplicates=0
if [ -f "frontend/.env.production" ] && [ -f "frontend/.env.render.production" ]; then
    log_warning "⚠️  Archivos .env duplicados en frontend"
    env_duplicates=$((env_duplicates + 1))
fi

if [ -f "backend/.env.production" ] && [ -f "backend/.env.local" ]; then
    log_warning "⚠️  Archivos .env duplicados en backend"
    env_duplicates=$((env_duplicates + 1))
fi

if [ $env_duplicates -gt 0 ]; then
    log_info "Considera consolidar archivos .env duplicados manualmente"
fi

# 9. Limpiar archivos de backup
find . -name "*.backup" -delete 2>/dev/null || true
find . -name "*.bak" -delete 2>/dev/null || true
find . -name "*~" -delete 2>/dev/null || true

echo ""
log_success "🎉 LIMPIEZA PARA NUEVO ENTORNO COMPLETADA"
echo "========================================"
log_info "Archivos esenciales preservados:"
echo "  ✅ Código fuente"
echo "  ✅ requirements.txt y package.json"
echo "  ✅ Archivos .env.example"
echo "  ✅ Configuraciones Docker"
echo "  ✅ README.md"
echo ""
log_warning "⚠️  PASOS DESPUÉS DE LA LIMPIEZA:"
echo ""
echo "📱 BACKEND:"
echo "  1. cd backend"
echo "  2. python -m venv venv"
echo "  3. source venv/bin/activate  # Linux/Mac"
echo "     venv\\Scripts\\activate     # Windows"
echo "  4. pip install -r requirements.txt"
echo "  5. cp .env.example .env  # Configurar variables"
echo "  6. python manage.py migrate"
echo "  7. python manage.py collectstatic"
echo ""
echo "🌐 FRONTEND:"
echo "  1. cd frontend"
echo "  2. cp .env.example .env  # Configurar variables"
echo "  3. npm install"
echo "  4. npm run build  # Para producción"
echo ""
echo "🐳 DOCKER:"
echo "  1. docker-compose build"
echo "  2. docker-compose up -d"
echo ""
log_info "🚀 ¡Listo para desplegar en nuevo entorno!"
