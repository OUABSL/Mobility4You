#!/bin/bash
# =======================================================
# BUILD SCRIPT ESPECÍFICO PARA RENDER.COM
# =======================================================

set -e

echo "🌐 Building Mobility4You Frontend for Render.com..."

# Limpiar cache de npm
echo "🧹 Cleaning npm cache..."
npm cache clean --force

# Eliminar node_modules y package-lock.json para fresh install
echo "🗑️ Removing existing dependencies..."
rm -rf node_modules package-lock.json

# Instalar dependencias con manejo de conflictos
echo "📦 Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps

# Verificar que todas las dependencias estén instaladas
echo "🔍 Verifying installations..."
npm ls --depth=0 || echo "⚠️ Some peer dependency warnings exist but continuing..."

# Build la aplicación
echo "🔨 Building application for production..."
NODE_ENV=production npm run build

# Verificar que el build se completó correctamente
if [ -d "build" ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Build output size:"
    du -sh build/
    echo "🗂️ Build contents:"
    ls -la build/
else
    echo "❌ Build failed - no build directory found"
    exit 1
fi

echo "🎉 Frontend ready for Render deployment!"
