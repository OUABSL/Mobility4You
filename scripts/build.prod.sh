#!/bin/bash

# =================================================================
# Mobility4You - Production Build Script
# =================================================================
# This script builds and starts the production environment
# Should be run from the project root directory
# =================================================================

set -e

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Building Mobility4You Production Environment..."
echo "Project root: $PROJECT_ROOT"

# Change to project root
cd "$PROJECT_ROOT"

# Build and start production containers
docker compose --env-file ./docker/.env.prod -f ./docker/docker-compose.prod.yml up --build --remove-orphans -d

echo "✅ Production environment started successfully!"
echo "🌐 Application: https://localhost"
echo "⚠️  Make sure SSL certificates are properly configured!"