#!/bin/bash
# =======================================================
# SCRIPT PARA TESTING DE CONFIGURACIÓN RENDER
# Ejecuta el entorno de pruebas que simula Render.com
# =======================================================

set -e

echo "🚀 INICIANDO SIMULACIÓN DE ENTORNO RENDER"
echo "========================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.render-local.yml" ]; then
    log_error "No se encuentra docker-compose.render-local.yml"
    log_error "Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Verificar Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker no está instalado o no está en el PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose no está instalado o no está en el PATH"
    exit 1
fi

# Función para limpiar contenedores existentes
cleanup() {
    log_info "Limpiando contenedores existentes..."
    docker-compose -f docker-compose.render-local.yml down --remove-orphans --volumes 2>/dev/null || true
    log_success "Limpieza completada"
}

# Función para construir y ejecutar
start_render_simulation() {
    log_info "Construyendo imágenes de contenedores..."
    docker-compose -f docker-compose.render-local.yml build --no-cache
    
    log_info "Iniciando servicios en modo simulación Render..."
    docker-compose -f docker-compose.render-local.yml up -d
    
    log_info "Esperando que los servicios estén listos..."
    sleep 30
    
    # Verificar estado de los servicios
    log_info "Verificando estado de los servicios..."
    
    # PostgreSQL
    if docker-compose -f docker-compose.render-local.yml exec postgres pg_isready -U mobility4you_db_user -d mobility4you_db > /dev/null 2>&1; then
        log_success "✅ PostgreSQL está funcionando"
    else
        log_error "❌ PostgreSQL no responde"
    fi
    
    # Redis
    if docker-compose -f docker-compose.render-local.yml exec redis redis-cli ping > /dev/null 2>&1; then
        log_success "✅ Redis está funcionando"
    else
        log_error "❌ Redis no responde"
    fi
    
    # Backend
    if curl -f http://localhost:8000/admin/ > /dev/null 2>&1; then
        log_success "✅ Backend Django está funcionando"
    else
        log_warning "⚠️  Backend Django puede estar iniciando..."
    fi
    
    # Frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        log_success "✅ Frontend React está funcionando"
    else
        log_warning "⚠️  Frontend React puede estar iniciando..."
    fi
}

# Función para mostrar logs
show_logs() {
    log_info "Mostrando logs de los servicios..."
    docker-compose -f docker-compose.render-local.yml logs --tail=50
}

# Función para mostrar URLs de acceso
show_urls() {
    echo ""
    log_success "🌐 URLS DE ACCESO (SIMULACIÓN RENDER)"
    echo "========================================"
    echo "Frontend:     http://localhost:3000"
    echo "Backend API:  http://localhost:8000/api"
    echo "Admin Panel:  http://localhost:8000/admin"
    echo "PostgreSQL:   localhost:5433"
    echo "Redis:        localhost:6380"
    echo ""
    log_info "Credenciales Admin: admin / Admin@2025!"
}

# Función para ejecutar tests de conectividad
run_connectivity_tests() {
    log_info "Ejecutando tests de conectividad..."
    
    echo "Test 1: Backend Health Check"
    if curl -f http://localhost:8000/admin/ > /dev/null 2>&1; then
        log_success "✅ Backend responde correctamente"
    else
        log_error "❌ Backend no responde"
    fi
    
    echo "Test 2: Frontend disponible"
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        log_success "✅ Frontend disponible"
    else
        log_error "❌ Frontend no disponible"
    fi
    
    echo "Test 3: Base de datos"
    if docker-compose -f docker-compose.render-local.yml exec -T backend python manage.py check --database default > /dev/null 2>&1; then
        log_success "✅ Base de datos conectada"
    else
        log_error "❌ Problemas con base de datos"
    fi
}

# Menú principal
case "${1:-start}" in
    "start"|"up")
        cleanup
        start_render_simulation
        show_urls
        ;;
    "stop"|"down")
        log_info "Deteniendo simulación Render..."
        docker-compose -f docker-compose.render-local.yml down
        log_success "Simulación detenida"
        ;;
    "restart")
        cleanup
        start_render_simulation
        show_urls
        ;;
    "logs")
        show_logs
        ;;
    "test")
        run_connectivity_tests
        ;;
    "clean")
        log_warning "Limpiando TODOS los datos de simulación..."
        docker-compose -f docker-compose.render-local.yml down --volumes --remove-orphans
        docker system prune -f
        log_success "Limpieza completa realizada"
        ;;
    "status")
        log_info "Estado de los contenedores:"
        docker-compose -f docker-compose.render-local.yml ps
        echo ""
        run_connectivity_tests
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|logs|test|clean|status}"
        echo ""
        echo "Comandos disponibles:"
        echo "  start   - Inicia la simulación de Render"
        echo "  stop    - Detiene la simulación"
        echo "  restart - Reinicia la simulación"
        echo "  logs    - Muestra logs de los servicios"
        echo "  test    - Ejecuta tests de conectividad"
        echo "  clean   - Limpia todos los datos y volúmenes"
        echo "  status  - Muestra el estado actual"
        exit 1
        ;;
esac
