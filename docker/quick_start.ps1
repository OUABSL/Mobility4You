# quick_start.ps1
# Script de inicio rápido para desarrollo con arquitectura modular

Write-Host "🚀 INICIO RÁPIDO - MOBILITY4YOU MODULAR" -ForegroundColor Blue
Write-Host "======================================" -ForegroundColor Blue

# Verificar si Docker está ejecutándose
Write-Host "🔍 Verificando Docker..." -ForegroundColor Yellow
try {
    docker version | Out-Null
    Write-Host "✅ Docker está funcionando" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker no está ejecutándose. Inicia Docker Desktop primero." -ForegroundColor Red
    Read-Host "Presiona Enter para salir..."
    exit 1
}

# Verificar archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "⚠️ Archivo .env no encontrado. Creando desde template..." -ForegroundColor Yellow
    Copy-Item ".env.development.template" ".env"
    Write-Host "✅ Archivo .env creado" -ForegroundColor Green
    Write-Host "🔧 IMPORTANTE: Edita .env con tus claves reales de Stripe" -ForegroundColor Red
    
    $response = Read-Host "¿Quieres editar .env ahora? (s/n)"
    if ($response -eq "s" -or $response -eq "S") {
        notepad .env
        Read-Host "Presiona Enter cuando hayas guardado los cambios..."
    }
}

Write-Host ""
Write-Host "🐳 Iniciando contenedores..." -ForegroundColor Cyan

# Detener contenedores existentes
docker-compose down 2>$null

# Iniciar contenedores
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ ¡SISTEMA INICIADO CORRECTAMENTE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Accesos:" -ForegroundColor Yellow
    Write-Host "   Frontend:  http://localhost:3000" -ForegroundColor Cyan
    Write-Host "   Backend:   http://localhost:8000" -ForegroundColor Cyan
    Write-Host "   Nginx:     http://localhost" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Para gestión avanzada, usa: .\docker_operations.ps1" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "🔍 Estado actual:" -ForegroundColor Yellow
    docker-compose ps
} else {
    Write-Host ""
    Write-Host "❌ Error al iniciar contenedores" -ForegroundColor Red
    Write-Host "🔧 Ejecuta: .\docker_operations.ps1 para diagnóstico" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Presiona Enter para salir..."
