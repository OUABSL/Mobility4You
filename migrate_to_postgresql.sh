#!/bin/bash
# migrate_to_postgresql.sh
# Script automatizado para migrar de MySQL a PostgreSQL

set -e

echo "🔄 INICIANDO MIGRACIÓN DE MYSQL A POSTGRESQL"
echo "============================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Verificar dependencias
check_dependencies() {
    log_info "Verificando dependencias..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker no está instalado"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose no está instalado"
        exit 1
    fi
    
    log_success "Dependencias verificadas"
}

# Backup de datos MySQL (si está disponible)
backup_mysql_data() {
    log_info "Intentando backup de datos MySQL..."
    
    # Verificar si hay contenedor MySQL corriendo
    if docker ps | grep -q "mysql\|mariadb"; then
        log_info "Creando backup de MySQL..."
        mkdir -p ./backups
        
        # Intentar backup
        docker exec $(docker ps | grep -E "mysql|mariadb" | awk '{print $1}') \
            mysqldump -u root -p$(grep MYSQL_ROOT_PASSWORD docker/.env | cut -d= -f2) \
            mobility4you > ./backups/mysql_backup_$(date +%Y%m%d_%H%M%S).sql
        
        log_success "Backup de MySQL creado en ./backups/"
    else
        log_warning "No se encontró contenedor MySQL activo, saltando backup"
    fi
}

# Instalar dependencias Python para PostgreSQL
install_postgres_dependencies() {
    log_info "Instalando dependencias de PostgreSQL..."
    
    cd backend
    pip install psycopg2-binary==2.9.9
    log_success "Dependencias de PostgreSQL instaladas"
    cd ..
}

# Iniciar PostgreSQL
start_postgresql() {
    log_info "Iniciando PostgreSQL..."
    
    # Usar archivo de entorno específico para PostgreSQL
    cp backend/.env.postgres backend/.env
    
    # Iniciar solo PostgreSQL primero
    docker-compose -f docker-compose.postgresql.yml up -d postgres
    
    # Esperar a que PostgreSQL esté listo
    log_info "Esperando a que PostgreSQL esté listo..."
    sleep 10
    
    # Verificar estado
    if docker-compose -f docker-compose.postgresql.yml ps postgres | grep -q "Up"; then
        log_success "PostgreSQL iniciado correctamente"
    else
        log_error "Error al iniciar PostgreSQL"
        exit 1
    fi
}

# Ejecutar migraciones
run_migrations() {
    log_info "Ejecutando migraciones en PostgreSQL..."
    
    cd backend
    
    # Limpiar migraciones anteriores (opcional, solo si hay problemas)
    log_warning "¿Deseas limpiar las migraciones anteriores? (solo si hay conflictos) [y/N]"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "Limpiando migraciones anteriores..."
        find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
        find . -path "*/migrations/*.pyc" -delete
        log_warning "Migraciones limpiadas. Creando nuevas migraciones..."
        python manage.py makemigrations
    fi
    
    # Ejecutar migraciones
    python manage.py migrate
    
    log_success "Migraciones completadas"
    cd ..
}

# Crear superusuario
create_superuser() {
    log_info "¿Deseas crear un superusuario? [y/N]"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        cd backend
        python manage.py createsuperuser
        cd ..
    fi
}

# Verificar migración
verify_migration() {
    log_info "Verificando migración..."
    
    cd backend
    
    # Verificar conexión a la base de datos
    python manage.py check --database default
    
    # Mostrar tablas creadas
    python manage.py dbshell -c "\dt"
    
    log_success "Migración verificada"
    cd ..
}

# Iniciar todos los servicios
start_all_services() {
    log_info "Iniciando todos los servicios..."
    
    docker-compose -f docker-compose.postgresql.yml up -d
    
    log_success "Todos los servicios iniciados"
    log_info "Frontend: http://localhost:3000"
    log_info "Backend API: http://localhost:8000"
    log_info "Admin: http://localhost:8000/admin"
}

# Función principal
main() {
    log_info "Iniciando migración automatizada a PostgreSQL..."
    
    check_dependencies
    backup_mysql_data
    install_postgres_dependencies
    start_postgresql
    run_migrations
    create_superuser
    verify_migration
    start_all_services
    
    log_success "¡Migración a PostgreSQL completada!"
    log_info "La aplicación ahora usa PostgreSQL en lugar de MySQL"
}

# Ejecutar migración
main "$@"
