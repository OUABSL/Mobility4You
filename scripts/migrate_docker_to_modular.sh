#!/bin/bash
# migrate_docker_to_modular.sh
# Script para migrar contenedores Docker a la nueva arquitectura modular
# ⚠️ EJECUTAR SOLO UNA VEZ durante la migración

# Archivo de marca para indicar que la migración ya se ejecutó
MIGRATION_MARKER="./.modular_migration_completed"

echo "🐳 MIGRACIÓN DOCKER A ARQUITECTURA MODULAR"
echo "=" * 50

# Verificar si la migración ya se ejecutó
check_previous_migration() {
    if [ -f "$MIGRATION_MARKER" ]; then
        echo "⚠️ MIGRACIÓN YA COMPLETADA ANTERIORMENTE"
        echo "📅 Fecha de migración anterior: $(cat $MIGRATION_MARKER)"
        echo ""
        echo "¿Qué quieres hacer?"
        echo "1) Salir (recomendado)"
        echo "2) Forzar re-migración (⚠️ usar con cuidado)"
        echo "3) Solo reiniciar contenedores"
        echo ""
        read -p "Selecciona una opción (1-3): " choice
        
        case $choice in
            1)
                echo "✅ Saliendo sin cambios"
                exit 0
                ;;
            2)
                echo "⚠️ Forzando re-migración..."
                rm -f "$MIGRATION_MARKER"
                return 0
                ;;
            3)
                echo "🔄 Solo reiniciando contenedores..."
                restart_containers_only
                exit 0
                ;;
            *)
                echo "❌ Opción inválida. Saliendo..."
                exit 1
                ;;
        esac
    fi
}

# Función para solo reiniciar contenedores (sin migración completa)
restart_containers_only() {
    echo "🔄 REINICIANDO CONTENEDORES MODULARES"
    echo "=" * 40
    
    # Detener contenedores actuales
    if [ -f "./backend/docker-compose.modular.yml" ]; then
        docker-compose -f ./backend/docker-compose.modular.yml down
    else
        cd docker
        docker-compose down
        cd ..
    fi
    
    sleep 5
    
    # Iniciar con configuración modular
    if [ -f "./backend/docker-compose.modular.yml" ]; then
        docker-compose -f ./backend/docker-compose.modular.yml up -d
    else
        cd docker
        docker-compose up -d
        cd ..
    fi
    
    echo "✅ Contenedores reiniciados"
    verify_health
}

# Función para hacer backup de la base de datos
backup_database() {
    echo "📦 Creando backup de la base de datos..."
    
    # Crear directorio de backup si no existe
    mkdir -p ./backups
    
    # Generar nombre del backup con timestamp
    BACKUP_FILE="./backups/mobility_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Hacer backup si el contenedor de BD está corriendo
    if docker ps | grep -q "mobility4you_db"; then
        docker exec mobility4you_db mysqldump -u${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} > "$BACKUP_FILE"
        echo "✅ Backup creado: $BACKUP_FILE"
    else
        echo "⚠️ Contenedor de BD no está corriendo, omitiendo backup"
    fi
}

# Función para detener contenedores actuales
stop_containers() {
    echo "🛑 Deteniendo contenedores actuales..."
    
    # Detener todos los contenedores del proyecto
    docker-compose down
    
    # Verificar que se detuvieron
    if docker ps | grep -q "mobility4you"; then
        echo "⚠️ Algunos contenedores aún están corriendo"
        docker ps | grep "mobility4you"
    else
        echo "✅ Todos los contenedores detenidos"
    fi
}

# Función para limpiar imágenes antigas
cleanup_images() {
    echo "🧹 Limpiando imágenes antiguas..."
    
    # Eliminar imágenes del backend antiguo
    docker rmi $(docker images | grep "mobility4you_backend" | awk '{print $3}') 2>/dev/null || true
    
    # Limpiar imágenes sin usar
    docker image prune -f
    
    echo "✅ Limpieza completada"
}

# Función para construir nuevas imágenes
build_new_images() {
    echo "🔨 Construyendo nuevas imágenes modulares..."
    
    # Verificar que el archivo existe en backend/
    if [ -f "./backend/docker-compose.modular.yml" ]; then
        # Construir solo el backend (el resto no ha cambiado)
        docker-compose -f ./backend/docker-compose.modular.yml build backend
        
        if [ $? -eq 0 ]; then
            echo "✅ Nueva imagen del backend construida"
        else
            echo "❌ Error construyendo imagen del backend"
            exit 1
        fi
    else
        echo "❌ docker-compose.modular.yml no encontrado en backend/"
        exit 1
    fi
}

# Función para verificar archivos de configuración
verify_config() {
    echo "🔍 Verificando archivos de configuración..."
    
    # Verificar que entrypoint.sh existe y es ejecutable
    if [ -f "./backend/entrypoint.sh" ]; then
        chmod +x ./backend/entrypoint.sh
        echo "✅ entrypoint.sh configurado"
    else
        echo "❌ entrypoint.sh no encontrado"
        exit 1
    fi
    
    # Verificar que docker_health_check.sh existe
    if [ -f "./backend/docker_health_check.sh" ]; then
        chmod +x ./backend/docker_health_check.sh
        echo "✅ docker_health_check.sh configurado"
    else
        echo "❌ docker_health_check.sh no encontrado"
        exit 1
    fi
    
    # Verificar configuración Django
    if grep -q "# 'api'," "./backend/config/settings.py"; then
        echo "✅ App api desactivada en settings.py"
    else
        echo "⚠️ Verificar que app api esté desactivada en settings.py"
    fi
}

# Función para iniciar contenedores modulares
start_modular_containers() {
    echo "🚀 Iniciando contenedores con arquitectura modular..."
    
    # Usar el archivo docker-compose modular desde backend/
    if [ -f "./backend/docker-compose.modular.yml" ]; then
        docker-compose -f ./backend/docker-compose.modular.yml up -d
        
        if [ $? -eq 0 ]; then
            echo "✅ Contenedores iniciados"
        else
            echo "❌ Error iniciando contenedores"
            exit 1
        fi
    else
        echo "❌ docker-compose.modular.yml no encontrado en backend/"
        echo "⚠️ Usando docker-compose original desde docker/"
        cd docker
        docker-compose up -d
        cd ..
    fi
}

# Función para verificar salud del sistema
verify_health() {
    echo "🏥 Verificando salud del sistema..."
    
    # Esperar a que los contenedores estén listos
    echo "Esperando a que los contenedores estén listos..."
    sleep 30
    
    # Verificar que el backend responde
    echo "Verificando backend..."
    if curl -f http://localhost:8000/admin/ > /dev/null 2>&1; then
        echo "✅ Backend responde correctamente"
    else
        echo "⚠️ Backend no responde, puede necesitar más tiempo"
    fi
    
    # Mostrar logs del backend
    echo "📋 Últimos logs del backend:"
    docker logs mobility4you_backend_modular --tail 20
}

# Función principal
main() {
    echo "Iniciando migración a arquitectura modular..."
    echo "Fecha: $(date)"
    echo ""
    
    # Verificar que estamos en el directorio correcto
    if [ ! -f "docker/docker-compose.yml" ]; then
        echo "❌ Error: Ejecutar desde el directorio raíz del proyecto"
        exit 1
    fi
    
    # Ejecutar pasos de migración
    backup_database
    stop_containers
    cleanup_images
    verify_config
    build_new_images
    start_modular_containers
    verify_health
    
    # Marcar migración como completada
    echo "$(date)" > "$MIGRATION_MARKER"
    
    echo ""
    echo "🎉 ¡MIGRACIÓN COMPLETADA!"
    echo "📋 Resumen:"
    echo "  - Backup de BD creado"
    echo "  - Contenedores antiguos detenidos"
    echo "  - Nueva imagen modular construida"
    echo "  - Sistema iniciado con arquitectura modular"
    echo "  - Archivo de marca creado: $MIGRATION_MARKER"
    echo ""
    echo "⚠️ IMPORTANTE: Este script solo debe ejecutarse UNA VEZ"
    echo "   Para reiniciar contenedores: ./migrate_docker_to_modular.sh"
    echo ""
    echo "🔗 URLs disponibles:"
    echo "  - Backend: http://localhost:8000"
    echo "  - Frontend: http://localhost:3000"
    echo "  - Admin: http://localhost:8000/admin/"
    echo ""
    echo "📊 Para ver logs: docker logs mobility4you_backend_modular"
    echo "🛑 Para detener: docker-compose down"
}

# Ejecutar función principal
check_previous_migration
main "$@"
