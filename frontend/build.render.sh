#!/bin/bash
# =======================================================
# BUILD SCRIPT OPTIMIZADO PARA RENDER.COM
# =======================================================

set -e

echo "🌐 Building Mobility4You Frontend for Render.com..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the frontend directory."
    exit 1
fi

# Limpiar cache de npm (solo si existe)
if [ -d "$HOME/.npm" ]; then
    echo "🧹 Cleaning npm cache..."
    npm cache clean --force
fi

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
    du -sh build/ 2>/dev/null || echo "Build directory created"
    echo "🗂️ Build contents:"
    ls -la build/ | head -10
    echo "🎯 Key files present:"
    [ -f "build/index.html" ] && echo "  ✅ index.html" || echo "  ❌ index.html missing"
    [ -d "build/static" ] && echo "  ✅ static/" || echo "  ❌ static/ missing"
else
    echo "❌ Build failed - no build directory found"
    exit 1
fi

echo "🎉 Frontend ready for Render deployment!"
