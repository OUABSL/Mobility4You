# docker_operations.ps1
# Script de PowerShell para operaciones Docker con arquitectura modular
# Apps: usuarios, vehiculos, reservas, politicas, facturas_contratos, comunicacion

Write-Host "🐳 OPERACIONES DOCKER - ARQUITECTURA MODULAR" -ForegroundColor Blue
Write-Host "=============================================" -ForegroundColor Blue

# Función para mostrar menú
function Show-Menu {
    Write-Host ""
    Write-Host "¿Qué operación deseas realizar?" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1)  🚀 Iniciar desarrollo (docker-compose.yml)" -ForegroundColor Green
    Write-Host "2)  🌟 Iniciar producción (docker-compose.prod.yml)" -ForegroundColor Magenta
    Write-Host "3)  🛑 Detener contenedores" -ForegroundColor Red
    Write-Host "4)  🔄 Reiniciar contenedores" -ForegroundColor Cyan
    Write-Host "5)  🔨 Reconstruir backend" -ForegroundColor Yellow
    Write-Host "6)  📋 Ver logs del backend" -ForegroundColor White
    Write-Host "7)  📋 Ver logs de todos los contenedores" -ForegroundColor White
    Write-Host "8)  🏥 Verificar salud del sistema" -ForegroundColor Green
    Write-Host "9)  🗃️  Backup de base de datos" -ForegroundColor DarkYellow
    Write-Host "10) 🧹 Limpiar imágenes no usadas" -ForegroundColor DarkRed
    Write-Host "11) 🐚 Shell del backend" -ForegroundColor DarkGreen
    Write-Host "12) 🔍 Ver estado de contenedores" -ForegroundColor DarkCyan
    Write-Host "0)  ❌ Salir" -ForegroundColor Red
    Write-Host ""
    $choice = Read-Host "Selecciona una opción (0-12)"
    return $choice
}

# Función para iniciar desarrollo
function Start-Development {
    Write-Host "🚀 Iniciando contenedores de desarrollo..." -ForegroundColor Green
    docker-compose up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Contenedores iniciados correctamente" -ForegroundColor Green
        Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "🔧 Backend: http://localhost:8000" -ForegroundColor Cyan
        Write-Host "🌍 Nginx: http://localhost" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error al iniciar contenedores" -ForegroundColor Red
    }
}

# Función para iniciar producción
function Start-Production {
    Write-Host "🌟 Iniciando contenedores de producción..." -ForegroundColor Magenta
    docker-compose -f docker-compose.prod.yml up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Contenedores de producción iniciados" -ForegroundColor Green
        Write-Host "🔒 Asegúrate de que SSL esté configurado" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Error al iniciar contenedores de producción" -ForegroundColor Red
    }
}

# Función para detener contenedores
function Stop-Containers {
    Write-Host "🛑 Deteniendo contenedores..." -ForegroundColor Red
    docker-compose down
    docker-compose -f docker-compose.prod.yml down 2>$null
    Write-Host "✅ Contenedores detenidos" -ForegroundColor Green
}

# Función para reiniciar contenedores
function Restart-Containers {
    Write-Host "🔄 Reiniciando contenedores..." -ForegroundColor Cyan
    docker-compose restart
    Write-Host "✅ Contenedores reiniciados" -ForegroundColor Green
}

# Función para reconstruir backend
function Rebuild-Backend {
    Write-Host "🔨 Reconstruyendo backend..." -ForegroundColor Yellow
    docker-compose build --no-cache backend
    docker-compose up -d backend
    Write-Host "✅ Backend reconstruido" -ForegroundColor Green
}

# Función para ver logs del backend
function Show-BackendLogs {
    Write-Host "📋 Mostrando logs del backend..." -ForegroundColor White
    docker-compose logs -f --tail=50 backend
}

# Función para ver todos los logs
function Show-AllLogs {
    Write-Host "📋 Mostrando logs de todos los contenedores..." -ForegroundColor White
    docker-compose logs -f --tail=20
}

# Función para verificar salud
function Check-Health {
    Write-Host "🏥 Verificando salud del sistema..." -ForegroundColor Green
    Write-Host ""
    Write-Host "Estado de contenedores:" -ForegroundColor Yellow
    docker-compose ps
    Write-Host ""
    Write-Host "Uso de recursos:" -ForegroundColor Yellow
    docker stats --no-stream
}

# Función para backup de base de datos
function Backup-Database {
    Write-Host "🗃️ Creando backup de base de datos..." -ForegroundColor DarkYellow
    $date = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "backup_mobility4you_$date.sql"
    
    docker-compose exec -T db mysqldump -u mobility -pmiclave mobility4you > $backupFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backup creado: $backupFile" -ForegroundColor Green
    } else {
        Write-Host "❌ Error al crear backup" -ForegroundColor Red
    }
}

# Función para limpiar imágenes
function Clean-Images {
    Write-Host "🧹 Limpiando imágenes no usadas..." -ForegroundColor DarkRed
    docker image prune -f
    docker volume prune -f
    Write-Host "✅ Limpieza completada" -ForegroundColor Green
}

# Función para shell del backend
function Backend-Shell {
    Write-Host "🐚 Abriendo shell del backend..." -ForegroundColor DarkGreen
    docker-compose exec backend python manage.py shell
}

# Función para ver estado
function Show-Status {
    Write-Host "🔍 Estado actual del sistema:" -ForegroundColor DarkCyan
    Write-Host ""
    Write-Host "Contenedores activos:" -ForegroundColor Yellow
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    Write-Host ""
    Write-Host "Volúmenes:" -ForegroundColor Yellow
    docker volume ls | Where-Object { $_ -match "mobility4you" }
}

# Bucle principal
do {
    $choice = Show-Menu
    
    switch ($choice) {
        "1" { Start-Development }
        "2" { Start-Production }
        "3" { Stop-Containers }
        "4" { Restart-Containers }
        "5" { Rebuild-Backend }
        "6" { Show-BackendLogs }
        "7" { Show-AllLogs }
        "8" { Check-Health }
        "9" { Backup-Database }
        "10" { Clean-Images }
        "11" { Backend-Shell }
        "12" { Show-Status }
        "0" { 
            Write-Host "👋 ¡Hasta luego!" -ForegroundColor Green
            break 
        }
        default { 
            Write-Host "❌ Opción no válida" -ForegroundColor Red 
        }
    }
    
    if ($choice -ne "0") {
        Write-Host ""
        Read-Host "Presiona Enter para continuar..."
    }
} while ($choice -ne "0")
