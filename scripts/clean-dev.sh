#!/bin/bash

# =================================================================
# Mobility4You - Clean Development Script
# =================================================================
# Script para limpiar y reconstruir el entorno de desarrollo
# =================================================================

set -e

echo "🧹 Cleaning Mobility4You Development Environment..."

# Parar y eliminar contenedores existentes
echo "Stopping and removing containers..."
docker-compose -f docker-compose.dev-simple.yml down --volumes --remove-orphans

# Limpiar imágenes no utilizadas
echo "Cleaning unused Docker images..."
docker image prune -f

# Limpiar volúmenes no utilizados
echo "Cleaning unused Docker volumes..."
docker volume prune -f

# Reconstruir y iniciar
echo "Building and starting clean environment..."
docker-compose -f docker-compose.dev-simple.yml up --build -d

echo "✅ Clean development environment ready!"
echo "🌐 Frontend: http://localhost:3000"
echo "🌐 Backend: http://localhost:8000"
echo "🌐 Admin: http://localhost:8000/admin"
