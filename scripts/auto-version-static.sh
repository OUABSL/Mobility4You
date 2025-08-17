#!/bin/bash
# scripts/auto-version-static.sh
# Script para versionado automático de archivos estáticos
# Se puede ejecutar durante el build de Docker o en despliegues

set -e  # Salir si cualquier comando falla

echo "🚀 Iniciando versionado automático de archivos estáticos..."

# Detectar si estamos en Docker o desarrollo local
if [ -d "/app" ]; then
    echo "📦 Detectado entorno Docker"
    BASE_DIR="/app"
    PYTHON_CMD="python"
else
    echo "💻 Detectado entorno de desarrollo local"
    BASE_DIR="$(dirname "$(dirname "$(readlink -f "$0")")")"
    cd "$BASE_DIR"
    PYTHON_CMD="python"
fi

echo "📂 Directorio base: $BASE_DIR"

# Verificar que Django está disponible
if ! $PYTHON_CMD -c "import django" 2>/dev/null; then
    echo "❌ Django no está disponible"
    exit 1
fi

# Configurar Django
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.render}"

# Ejecutar collectstatic si es necesario
echo "📦 Ejecutando collectstatic..."
if ! $PYTHON_CMD manage.py collectstatic --noinput --verbosity=1; then
    echo "⚠️ collectstatic falló, continuando..."
fi

# Ejecutar versionado automático
echo "🔄 Ejecutando versionado automático..."
if $PYTHON_CMD manage.py auto_version_static; then
    echo "✅ Versionado automático completado exitosamente"
else
    echo "⚠️ Versionado automático falló, usando fallbacks"
    
    # Crear mapeo de fallback como medida de emergencia
    echo "🆘 Creando mapeo de fallback..."
    $PYTHON_CMD -c "
import os
import sys
sys.path.insert(0, '$BASE_DIR')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.render')

try:
    from utils.static_hooks import StaticVersioningHooks
    StaticVersioningHooks.ensure_fallback_mapping()
    print('✅ Mapeo de fallback creado')
except Exception as e:
    print(f'❌ Error creando fallback: {e}')
    exit(1)
"
fi

# Validar resultado final
echo "🔍 Validando archivos estáticos..."
if $PYTHON_CMD manage.py auto_version_static --validate-only; then
    echo "✅ Validación exitosa - Archivos estáticos listos"
else
    echo "⚠️ Algunas validaciones fallaron, pero el sistema debería funcionar con fallbacks"
fi

echo "🎉 Proceso de versionado automático completado"
