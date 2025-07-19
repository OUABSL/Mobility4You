#!/bin/bash
# scripts/test_deployment.sh
# Script para probar la aplicación antes del despliegue

echo "🔍 PROBANDO CONFIGURACIÓN DE DESPLIEGUE"
echo "======================================="

# Verificar variables de entorno críticas
echo ""
echo "📋 Verificando variables de entorno..."

# Backend
if [[ -z "$DATABASE_URL" ]]; then
    echo "⚠️  WARNING: DATABASE_URL no está configurada"
else
    echo "✅ DATABASE_URL: configurada"
fi

if [[ -z "$SECRET_KEY" ]]; then
    echo "⚠️  WARNING: SECRET_KEY no está configurada"
else
    echo "✅ SECRET_KEY: configurada"
fi

# Frontend
if [[ -z "$REACT_APP_BACKEND_URL" ]]; then
    echo "⚠️  WARNING: REACT_APP_BACKEND_URL no está configurada"
else
    echo "✅ REACT_APP_BACKEND_URL: $REACT_APP_BACKEND_URL"
fi

# Verificar archivos críticos
echo ""
echo "📁 Verificando archivos críticos..."

# Backend
if [[ -f "backend/config/settings/render.py" ]]; then
    echo "✅ backend/config/settings/render.py: existe"
else
    echo "❌ backend/config/settings/render.py: no existe"
fi

if [[ -f "backend/requirements.txt" ]]; then
    echo "✅ backend/requirements.txt: existe"
else
    echo "❌ backend/requirements.txt: no existe"
fi

# Frontend
if [[ -f "frontend/package.json" ]]; then
    echo "✅ frontend/package.json: existe"
else
    echo "❌ frontend/package.json: no existe"
fi

if [[ -f "frontend/src/config/appConfig.js" ]]; then
    echo "✅ frontend/src/config/appConfig.js: existe"
else
    echo "❌ frontend/src/config/appConfig.js: no existe"
fi

# Verificar configuración CORS
echo ""
echo "🌐 Verificando configuración CORS en render.py..."
if grep -q "CORS_ALLOWED_ORIGINS" backend/config/settings/render.py; then
    echo "✅ CORS_ALLOWED_ORIGINS: configurado"
    echo "   Dominios permitidos:"
    grep -A 5 "CORS_ALLOWED_ORIGINS" backend/config/settings/render.py | grep -E "https?://"
else
    echo "❌ CORS_ALLOWED_ORIGINS: no configurado"
fi

# Verificar configuración de middleware
echo ""
echo "⚙️  Verificando middleware CORS..."
if grep -q "corsheaders.middleware.CorsMiddleware" backend/config/settings/base.py; then
    echo "✅ CorsMiddleware: configurado en MIDDLEWARE"
else
    echo "❌ CorsMiddleware: no configurado en MIDDLEWARE"
fi

# Verificar aplicaciones instaladas
echo ""
echo "📦 Verificando aplicaciones instaladas..."
if grep -q "corsheaders" backend/config/settings/base.py; then
    echo "✅ corsheaders: instalado en INSTALLED_APPS"
else
    echo "❌ corsheaders: no instalado en INSTALLED_APPS"
fi

if grep -q "rest_framework" backend/config/settings/base.py; then
    echo "✅ rest_framework: instalado en INSTALLED_APPS"
else
    echo "❌ rest_framework: no instalado en INSTALLED_APPS"
fi

# Probar importaciones críticas del backend
echo ""
echo "🐍 Probando importaciones críticas del backend..."
cd backend

# Verificar que Django se puede importar
python -c "import django; print(f'✅ Django: {django.get_version()}')" 2>/dev/null || echo "❌ Error importando Django"

# Verificar corsheaders
python -c "import corsheaders; print('✅ corsheaders: importado correctamente')" 2>/dev/null || echo "❌ Error importando corsheaders"

# Verificar rest_framework
python -c "import rest_framework; print('✅ rest_framework: importado correctamente')" 2>/dev/null || echo "❌ Error importando rest_framework"

# Verificar configuración de Django
python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.render')
import django
django.setup()
from django.conf import settings
print(f'✅ Settings cargados: {settings.DEBUG=}')
print(f'✅ CORS Origins: {len(settings.CORS_ALLOWED_ORIGINS)} configurados')
print(f'✅ Allowed Hosts: {len(settings.ALLOWED_HOSTS)} configurados')
" 2>/dev/null || echo "❌ Error cargando configuración de Django"

cd ..

# Verificar dependencias del frontend
echo ""
echo "⚛️  Verificando dependencias del frontend..."
cd frontend

if [[ -f "package.json" ]]; then
    echo "📦 Dependencias críticas:"
    
    # Verificar axios
    if grep -q '"axios"' package.json; then
        echo "✅ axios: presente en package.json"
    else
        echo "❌ axios: no encontrado en package.json"
    fi
    
    # Verificar react
    if grep -q '"react"' package.json; then
        echo "✅ react: presente en package.json"
    else
        echo "❌ react: no encontrado en package.json"
    fi
    
    # Verificar react-router-dom
    if grep -q '"react-router-dom"' package.json; then
        echo "✅ react-router-dom: presente en package.json"
    else
        echo "❌ react-router-dom: no encontrado en package.json"
    fi
fi

cd ..

echo ""
echo "📊 RESUMEN DEL TEST"
echo "=================="
echo "✅ Si ves más checkmarks verdes que cruces rojas, la configuración está bien"
echo "❌ Si hay muchas cruces rojas, revisa la configuración antes del despliegue"
echo ""
echo "🚀 Para desplegar:"
echo "   1. Asegúrate de que todas las variables de entorno estén configuradas en Render"
echo "   2. Haz commit y push de todos los cambios"
echo "   3. El despliegue automático debería funcionar"
echo ""
