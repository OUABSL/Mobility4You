#!/bin/bash

# =================================================================
# Mobility4You - Deployment Script
# =================================================================
# Usage: ./deploy.sh [dev|prod|stop|logs|status]
# 
# IMPORTANTE: Para producción usar Render.com
# Este script es solo para desarrollo local con Docker
# =================================================================

set -e

PROJECT_NAME="mobility4you"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Project directory: $SCRIPT_DIR"
DOCKER_COMPOSE_DEV="$SCRIPT_DIR/docker/docker-compose.dev.yml"
DOCKER_COMPOSE_PROD="$SCRIPT_DIR/docker/docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Development deployment
deploy_dev() {
    log_info "Deploying $PROJECT_NAME in DEVELOPMENT mode..."
    
    # Change to script directory to ensure correct working directory
    cd "$SCRIPT_DIR"
    
    # Stop any existing containers
    docker compose -f $DOCKER_COMPOSE_DEV down 2>/dev/null || true
    
    # Build and start development containers
    log_info "Building and starting development containers..."
    docker compose -f $DOCKER_COMPOSE_DEV up -d --build
    
    log_success "Development deployment completed!"
    log_info "Frontend: http://localhost:3000"
    log_info "Backend API: http://localhost:8000"
    log_info "Admin: http://localhost:8000/admin"
}

# Production deployment
deploy_prod() {
    log_warning "PRODUCCIÓN EN RENDER.COM"
    log_info "Para deploys de producción:"
    log_info "1. Push cambios a GitHub"
    log_info "2. Render auto-deploys backend desde: mobility4you.onrender.com"
    log_info "3. Frontend se despliega en: mobility4you.es"
    log_info ""
    log_info "Variables de entorno: ver documentation/RENDER_ENV_VARIABLES.md"
    
    # Change to script directory to ensure correct working directory
    cd "$SCRIPT_DIR"
    
    # Stop any existing containers
    docker compose -f $DOCKER_COMPOSE_PROD down 2>/dev/null || true
    
    # Build and start
    if [ -f "$BUILD_SCRIPT_PROD" ]; then
        log_info "Running production build script..."
        chmod +x "$BUILD_SCRIPT_PROD" 2>/dev/null || true
        "$BUILD_SCRIPT_PROD"
    else
        log_info "Building and starting production containers..."
        docker compose --env-file ./docker/.env.prod -f $DOCKER_COMPOSE_PROD up -d --build
    fi
    
    log_success "Production deployment completed!"
    log_info "Application: https://localhost"
    log_warning "Make sure SSL certificates are properly configured!"
}

# Stop all containers
stop_all() {
    log_info "Stopping all $PROJECT_NAME containers..."
    docker compose -f $DOCKER_COMPOSE_DEV down 2>/dev/null || true
    docker compose -f $DOCKER_COMPOSE_PROD down 2>/dev/null || true
    log_success "All containers stopped!"
}

# Show logs
show_logs() {
    local env=${1:-dev}
    local compose_file=$DOCKER_COMPOSE_DEV
    
    if [ "$env" == "prod" ]; then
        compose_file=$DOCKER_COMPOSE_PROD
    fi
    
    log_info "Showing logs for $env environment..."
    docker compose -f $compose_file logs -f --tail=100
}

# Show status
show_status() {
    log_info "Container status:"
    echo ""
    docker ps --filter "name=mobility4you" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
}

# Help function
show_help() {
    echo "Mobility4You Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  dev          Deploy in development mode"
    echo "  prod         Deploy in production mode"
    echo "  stop         Stop all containers"
    echo "  logs [env]   Show logs (env: dev|prod, default: dev)"
    echo "  status       Show container status"
    echo "  help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev               # Deploy development environment"
    echo "  $0 prod              # Deploy production environment"
    echo "  $0 logs prod         # Show production logs"
    echo "  $0 status            # Show container status"
    echo ""
}

# Main script logic
main() {
    local command=${1:-help}
    
    # Check Docker availability
    check_docker
    
    case $command in
        "dev"|"development")
            deploy_dev
            ;;
        "prod"|"production")
            deploy_prod
            ;;
        "stop"|"down")
            stop_all
            ;;
        "logs")
            show_logs $2
            ;;
        "status")
            show_status
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
