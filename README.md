# Movility-for-you Project Structure

This document describes the clean, professional structure of the Movility car rental application.

## Project Overview

A Django REST API backend with React frontend for car rental management, with modular architecture following Django best practices.

## Backend Structure

```
backend/
├── config/                     # Django project settings
│   ├── __init__.py
│   ├── settings.py            # Main settings
│   ├── production.py          # Production-specific settings
│   ├── urls.py               # URL routing
│   ├── wsgi.py              # WSGI configuration
│   └── asgi.py              # ASGI configuration
│
├── apps/                      # Django applications (modular)
│   ├── usuarios/             # User management
│   ├── vehiculos/            # Vehicle management
│   ├── lugares/              # Location management
│   ├── reservas/             # Booking management
│   ├── politicas/            # Policies (payment, penalties)
│   ├── facturas_contratos/   # Invoicing and contracts
│   ├── comunicacion/         # Communication (emails, SMS)
│   ├── payments/             # Payment processing
│   └── api/                  # Legacy API (being phased out)
│
├── tests/                     # Test suite
│   ├── __init__.py
│   └── test_structure_verification.py
│
├── templates/                 # Django templates
├── staticfiles/              # Static files
├── media/                    # User uploads
├── logs/                     # Application logs
├── utils/                    # Utilities and helpers
├── notifications/            # Notification templates
│
├── manage.py                 # Django management
├── requirements.txt          # Python dependencies
├── Dockerfile               # Development container
├── Dockerfile.prod          # Production container
└── entrypoint.sh           # Container entrypoint
```

## Frontend Structure

```
frontend/
├── public/                   # Static assets
├── src/                     # React source code
│   ├── components/          # Reusable components
│   ├── assets/             # Images, styles
│   └── ...
├── build/                   # Production build
├── package.json            # Node.js dependencies
└── Dockerfile             # Frontend container
```

## Docker Configuration

```
docker/
├── docker-compose.dev.yml   # Development environment
├── docker-compose.prod.yml  # Production environment
├── nginx/
│   ├── nginx.dev.conf      # Development nginx config
│   ├── nginx.prod.conf     # Production nginx config
│   └── ssl/                # SSL certificates
├── mariadb-init.sh         # Database initialization
└── scripts/                # Docker utility scripts
```

## Scripts

```
scripts/
├── build.dev.sh            # Development build
├── build.prod.sh           # Production build
├── down.dev.sh            # Stop development
└── down.prod.sh           # Stop production
```

## Key Features

- **Modular Architecture**: Each Django app handles a specific domain
- **Clean Separation**: Development and production configurations
- **Docker Support**: Containerized deployment
- **Professional Structure**: Follows Django and software engineering best practices
- **Comprehensive Testing**: Structured test suite
- **Documentation**: Clear project organization

## Environment Files

- `.env` - Development environment variables
- `.env.dev` - Development-specific variables
- `.env.prod` - Production-specific variables

## Database

- **Development**: MariaDB in Docker container
- **Production**: MariaDB with optimized configuration
- **Migrations**: Django ORM migrations in each app

## API Documentation

The API follows RESTful principles with modular endpoints:

- `/api/usuarios/` - User management
- `/api/vehiculos/` - Vehicle management
- `/api/lugares/` - Location management
- `/api/reservas/` - Booking management
- `/api/politicas/` - Policy management
- `/api/payments/` - Payment processing

## Getting Started

### Development

```bash
# Start development environment
cd docker/
docker-compose -f docker-compose.dev.yml up -d

# Run migrations
docker exec backend python manage.py migrate

# Create superuser
docker exec -it backend python manage.py createsuperuser
```

### Production

```bash
# Start production environment
cd docker/
docker-compose -f docker-compose.prod.yml up -d
```

## Maintenance

- **Logs**: Check `backend/logs/` for application logs
- **Backups**: Database backups in `docker/backups/`
- **SSL**: Certificates in `docker/nginx/ssl/`
- **Media**: User uploads in `backend/media/`
