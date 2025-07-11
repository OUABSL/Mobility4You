#!/bin/bash
# docker_daily_operations.sh
# Script para operaciones diarias con arquitectura modular
# Compatible con PowerShell y Bash

echo "🐳 OPERACIONES DIARIAS - DOCKER MODULAR"
echo "========================================"

# Función para mostrar menú
show_menu() {
    echo "¿Qué operación deseas realizar?"
    echo ""
    echo "1) 🚀 Iniciar contenedores (desarrollo)"
    echo "2) 🛑 Detener contenedores"
    echo "3) 🔄 Reiniciar contenedores"
    echo "4) 🔨 Reconstruir backend"
    echo "5) 📋 Ver logs del backend"
    echo "6) 📋 Ver logs de todos los contenedores"
    echo "7) 🏥 Verificar salud del sistema"
    echo "8) 🗃️  Backup de base de datos"
    echo "9) 🧹 Limpiar imágenes no usadas"
    echo "10) 🌟 Iniciar producción"
    echo "0) ❌ Salir"
    echo ""
    read -p "Selecciona una opción (0-10): " choice
}

# Función para iniciar contenedores de desarrollo
start_containers() {
    echo "🚀 Iniciando contenedores de desarrollo..."
    docker-compose up -d
    echo "✅ Contenedores iniciados"
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend: http://localhost:8000"
    echo "🌍 Nginx: http://localhost"
}
}

# Función para detener contenedores
stop_containers() {
    echo "🛑 Deteniendo contenedores..."
    docker-compose down
    echo "✅ Contenedores detenidos"
}

# Función para reiniciar contenedores
restart_containers() {
    echo "🔄 Reiniciando contenedores..."
    stop_containers
    sleep 3
    start_containers
}

# Función para reconstruir backend
rebuild_backend() {
    echo "🔨 Reconstruyendo backend..."
    
    # Detener solo el backend
    docker-compose stop backend
    
    # Reconstruir imagen
    docker-compose build backend
    
    # Reiniciar backend
    docker-compose up -d backend
    
    echo "✅ Backend reconstruido y reiniciado"
}

# Función para ver logs del backend
show_backend_logs() {
    echo "📋 Logs del backend (últimas 50 líneas):"
    echo "=" * 40
    
    # Intentar con nombre modular primero
    if docker ps | grep -q "mobility4you_backend_modular"; then
        docker logs mobility4you_backend_modular --tail 50
    elif docker ps | grep -q "mobility4you_backend"; then
        docker logs mobility4you_backend --tail 50
    else
        echo "❌ Contenedor backend no encontrado"
    fi
    
    echo ""
    read -p "Presiona Enter para continuar..."
}

# Función para ver logs de todos los contenedores
show_all_logs() {
    echo "📋 Logs de todos los contenedores:"
    echo "=" * 40
    
    docker-compose logs --tail 20
    
    echo ""
    read -p "Presiona Enter para continuar..."
}

# Función para verificar salud
check_health() {
    echo "🏥 Verificando salud del sistema..."
    
    # Verificar contenedores corriendo
    echo "Contenedores activos:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    
    # Verificar conectividad
    echo "Verificando conectividad:"
    
    # Backend
    if curl -f http://localhost:8000/admin/ > /dev/null 2>&1; then
        echo "  ✅ Backend (http://localhost:8000)"
    else
        echo "  ❌ Backend no responde"
    fi
    
    # Frontend
    if curl -f http://localhost:3000/ > /dev/null 2>&1; then
        echo "  ✅ Frontend (http://localhost:3000)"
    else
        echo "  ❌ Frontend no responde"
    fi
    
    # Health check interno si existe
    if docker ps | grep -q "mobility4you_backend"; then
        echo ""
        echo "Ejecutando health check interno..."
        docker exec mobility4you_backend_modular bash /app/docker_health_check.sh 2>/dev/null || \
        docker exec mobility4you_backend bash /app/docker_health_check.sh 2>/dev/null || \
        echo "Health check interno no disponible"
    fi
    
    echo ""
    read -p "Presiona Enter para continuar..."
}

# Función para backup de BD
backup_database() {
    echo "🗃️ Creando backup de base de datos..."
    
    # Crear directorio de backup si no existe
    mkdir -p ../backups
    
    # Generar nombre del backup con timestamp
    BACKUP_FILE="../backups/mobility_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Hacer backup
    if docker ps | grep -q "mobility4you_db"; then
        docker exec mobility4you_db mysqldump -u${MYSQL_USER:-mobility} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE:-mobility} > "$BACKUP_FILE"
        
        if [ $? -eq 0 ]; then
            echo "✅ Backup creado: $BACKUP_FILE"
            echo "   Tamaño: $(du -h $BACKUP_FILE | cut -f1)"
        else
            echo "❌ Error creando backup"
        fi
    else
        echo "❌ Contenedor de BD no está corriendo"
    fi
    
    echo ""
    read -p "Presiona Enter para continuar..."
}

# Función para limpiar imágenes
cleanup_images() {
    echo "🧹 Limpiando imágenes no usadas..."
    
    # Mostrar espacio antes
    echo "Espacio usado antes:"
    docker system df
    
    echo ""
    
    # Limpiar
    docker image prune -f
    docker system prune -f
    
    echo ""
    
    # Mostrar espacio después
    echo "Espacio usado después:"
    docker system df
    
    echo ""
    read -p "Presiona Enter para continuar..."
}

# Función principal
main() {
    while true; do
        clear
        echo "🐳 OPERACIONES DIARIAS - DOCKER MODULAR"
        echo "=" * 50
        echo "📅 $(date)"
        echo ""
        
        show_menu
        
        case $choice in
            1)
                start_containers
                ;;
            2)
                stop_containers
                ;;
            3)
                restart_containers
                ;;
            4)
                rebuild_backend
                ;;
            5)
                show_backend_logs
                ;;
            6)
                show_all_logs
                ;;
            7)
                check_health
                ;;
            8)
                backup_database
                ;;
            9)
                cleanup_images
                ;;
            0)
                echo "👋 ¡Hasta luego!"
                exit 0
                ;;
            *)
                echo "❌ Opción inválida"
                sleep 2
                ;;
        esac
        
        echo ""
        echo "Presiona Enter para volver al menú..."
        read
    done
}

# Ejecutar función principal
main "$@"
