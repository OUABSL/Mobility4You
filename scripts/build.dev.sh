#!/bin/bash

# =================================================================
# Mobility4You - Development Build Script
# =================================================================
# This script builds and starts the development environment
# Should be run from the project root directory
# =================================================================

set -e

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Building Mobility4You Development Environment..."
echo "Project root: $PROJECT_ROOT"

# Change to project root
cd "$PROJECT_ROOT"

# Build and start development containers
docker compose -f ./docker/docker-compose.dev.yml up --build --remove-orphans -d

echo "✅ Development environment started successfully!"
echo "🌐 Frontend: http://localhost:3000"
echo "🌐 Backend: http://localhost:8000"
echo "🌐 Admin: http://localhost:8000/admin"