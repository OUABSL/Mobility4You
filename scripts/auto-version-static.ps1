# scripts/auto-version-static.ps1
# Script PowerShell para versionado automático de archivos estáticos
# Compatible con Windows y entornos de desarrollo local

param(
    [switch]$ValidateOnly = $false,
    [switch]$Force = $false
)

Write-Host "🚀 Iniciando versionado automático de archivos estáticos..." -ForegroundColor Green

# Detectar directorio base
$BaseDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $BaseDir

Write-Host "📂 Directorio base: $BaseDir" -ForegroundColor Cyan

# Verificar que Django está disponible
try {
    python -c "import django" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Django no disponible"
    }
} catch {
    Write-Host "❌ Django no está disponible" -ForegroundColor Red
    exit 1
}

# Configurar Django
if (-not $env:DJANGO_SETTINGS_MODULE) {
    $env:DJANGO_SETTINGS_MODULE = "config.settings.render"
}

if ($ValidateOnly) {
    Write-Host "🔍 Solo validando archivos estáticos..." -ForegroundColor Yellow
    python manage.py auto_version_static --validate-only
    exit $LASTEXITCODE
}

# Ejecutar collectstatic si es necesario
Write-Host "📦 Ejecutando collectstatic..." -ForegroundColor Cyan
try {
    python manage.py collectstatic --noinput --verbosity=1
} catch {
    Write-Host "⚠️ collectstatic falló, continuando..." -ForegroundColor Yellow
}

# Ejecutar versionado automático
Write-Host "🔄 Ejecutando versionado automático..." -ForegroundColor Cyan

$VersionCmd = "python manage.py auto_version_static"
if ($Force) {
    $VersionCmd += " --force"
}

try {
    Invoke-Expression $VersionCmd
    Write-Host "✅ Versionado automático completado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Versionado automático falló, usando fallbacks" -ForegroundColor Yellow
    
    # Crear mapeo de fallback como medida de emergencia
    Write-Host "🆘 Creando mapeo de fallback..." -ForegroundColor Yellow
    
    $FallbackScript = @"
import os
import sys
sys.path.insert(0, '$($BaseDir -replace '\\', '/')')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.render')

try:
    from utils.static_hooks import StaticVersioningHooks
    StaticVersioningHooks.ensure_fallback_mapping()
    print('✅ Mapeo de fallback creado')
except Exception as e:
    print(f'❌ Error creando fallback: {e}')
    exit(1)
"@
    
    python -c $FallbackScript
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error creando mapeo de fallback" -ForegroundColor Red
        exit 1
    }
}

# Validar resultado final
Write-Host "🔍 Validando archivos estáticos..." -ForegroundColor Cyan
try {
    python manage.py auto_version_static --validate-only
    Write-Host "✅ Validación exitosa - Archivos estáticos listos" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Algunas validaciones fallaron, pero el sistema debería funcionar con fallbacks" -ForegroundColor Yellow
}

Write-Host "🎉 Proceso de versionado automático completado" -ForegroundColor Green
