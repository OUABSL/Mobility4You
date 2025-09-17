# 🚗 Movility for You - Vehicle Rental System

> **Complete vehicle rental management platform** with Django 5.1.9 backend API, React 19.1.0 frontend, and Docker + Render.com deployment infrastructure.

## ✨ Features

### 🔐 **User Management**

- **Admin Panel**: Complete user administration with flexible validation
- **Customer Portal**: Registration, profile management, document verification
- **Authentication**: JWT-based authentication with secure password policies
- **Phone Validation**: International phone number support with automatic formatting

### 🚙 **Vehicle Management**

- **Fleet Administration**: Complete vehicle catalog with image management
- **Availability System**: Real-time availability tracking and scheduling
- **Maintenance Tracking**: Service history and maintenance scheduling
- **Image Storage**: Persistent image storage with automatic optimization

### 📅 **Reservation System**

- **Booking Engine**: Real-time reservation system with conflict detection
- **Contract Generation**: Automated contract creation and management
- **Payment Integration**: Secure payment processing with Stripe
- **Email Notifications**: Automated booking confirmations and updates

### 💰 **Financial Management**

- **Invoice Generation**: Automated invoice creation and management
- **Payment Tracking**: Complete payment history and reconciliation
- **Pricing Engine**: Dynamic pricing with seasonal adjustments
- **Financial Reports**: Comprehensive reporting and analytics

### 🌍 **Multi-Environment Support**

- **Development**: Local development with hot-reload
- **Production**: Optimized production deployment
- **Render.com**: Cloud deployment configuration
- **Docker**: Containerized deployment for all environments

## 🏗️ **Project Architecture**

### **Backend Structure (Django 5.1.9)**

```
backend/
├── config/                     # Django project configuration
│   ├── settings/              # Environment-specific configurations
│   │   ├── base.py           # Base configuration
│   │   ├── development.py    # Development configuration
│   │   ├── production.py     # Production configuration
│   │   └── render.py         # Render.com configuration
│   ├── middleware/            # Custom middleware
│   ├── management/            # Management commands
│   └── static/               # Static files
│
├── usuarios/                   # User management system
│   ├── models.py              # User models with flexible validation
│   ├── validations.py         # Centralized validation functions
│   ├── admin.py               # Custom admin interface
│   ├── serializers.py         # API serializers
│   ├── views.py               # API endpoints
│   ├── urls.py                # User routes
│   └── permissions.py         # Permissions and authentication
│
├── vehiculos/                  # Vehicle management
│   ├── models.py              # Vehicle and image models
│   ├── admin.py               # Fleet administration
│   ├── serializers.py         # Vehicle serializers
│   ├── views.py               # Vehicle API endpoints
│   ├── urls.py                # Vehicle routes
│   └── permissions.py         # Vehicle permissions
│
├── reservas/                   # Reservation system
│   ├── models.py              # Reservation and contract models
│   ├── admin.py               # Reservation administration
│   ├── serializers.py         # Reservation serializers
│   ├── views.py               # Reservation API endpoints
│   ├── urls.py                # Reservation routes
│   └── permissions.py         # Reservation permissions
│
├── lugares/                    # Location management
│   ├── models.py              # Location and address models
│   ├── admin.py               # Location administration
│   └── serializers.py         # Location serializers
│
├── politicas/                  # Policies and terms system
│   ├── models.py              # Policy models
│   ├── admin.py               # Policy administration
│   └── serializers.py         # Policy serializers
│
├── facturas_contratos/         # Billing and contracts management
│   ├── models.py              # Invoice and contract models
│   ├── admin.py               # Financial administration
│   └── serializers.py         # Financial serializers
│
├── comunicacion/               # Communication system
│   ├── models.py              # Notification models
│   ├── admin.py               # Communication administration
│   └── serializers.py         # Communication serializers
│
├── payments/                   # Payment system (Stripe)
│   ├── models.py              # Payment models
│   ├── admin.py               # Payment administration
│   ├── serializers.py         # Payment serializers
│   └── views.py               # Stripe endpoints
│
└── utils/                      # Shared utilities
    ├── apps.py                # Django app configuration
    ├── email_service.py       # Brevo email integration service
    ├── management/            # Custom Django management commands
    └── __init__.py            # Package initialization
```

### **Frontend Structure (React 19.1.0)**

```
frontend/
├── public/                     # Static assets
│   ├── index.html             # Main HTML template
│   ├── favicon.ico            # Favicon
│   └── manifest.json          # Application manifest
│
├── src/
│   ├── components/            # Reusable React components
│   │   ├── common/            # Shared components
│   │   ├── MyNavbar.js        # Navigation bar
│   │   ├── Footer.js          # Footer
│   │   ├── Home.js            # Home page
│   │   ├── ListadoCoches.js   # Vehicle catalog
│   │   ├── FichaCoche.js      # Vehicle details
│   │   ├── ReservaCliente.js  # Reservation form
│   │   ├── ConsultarReservaCliente.js # Reservation lookup
│   │   ├── DetallesReserva.js # Reservation details
│   │   ├── ContactUs.js       # Contact form
│   │   ├── ReservaPasos/      # Step-by-step reservation process
│   │   │   ├── ReservaClienteExtras.js
│   │   │   ├── ReservaClienteConfirmar.js
│   │   │   ├── ReservaClientePago.js
│   │   │   ├── ReservaClienteExito.js
│   │   │   └── ReservaClienteError.js
│   │   ├── Modals/            # Modal components
│   │   │   ├── EditReservationModal.js
│   │   │   └── DeleteReservationModal.js
│   │   └── StripePayment/     # Payment integration
│   │       └── StripePaymentForm.js
│   │
│   ├── config/                # Application configuration
│   │   ├── lazyLoadingConfig.js # Lazy loading configuration
│   │   └── constants.js       # Application constants
│   │
│   ├── context/               # React contexts
│   │   └── AppContext.js      # Main context
│   │
│   ├── services/              # API services
│   │   ├── api.js             # Axios configuration
│   │   ├── authService.js     # Authentication service
│   │   ├── vehicleService.js  # Vehicle service
│   │   ├── reservationService.js # Reservation service
│   │   └── stripeService.js   # Stripe service
│   │
│   ├── hooks/                 # Custom hooks
│   │   ├── useAuth.js         # Authentication hook
│   │   ├── useApi.js          # API hook
│   │   └── useLocalStorage.js # localStorage hook
│   │
│   ├── utils/                 # Utilities
│   │   ├── dateUtils.js       # Date utilities
│   │   ├── formatUtils.js     # Format utilities
│   │   └── validationUtils.js # Validation utilities
│   │
│   ├── css/                   # CSS styles
│   │   ├── App.css            # Main styles
│   │   ├── bootstrap-custom.css # Bootstrap customization
│   │   └── components/        # Component styles
│   │
│   └── assets/                # Application assets
│       ├── images/            # Images
│       └── icons/             # Icons
```

### **Docker Infrastructure**

```
docker/
├── docker-compose.dev.yml          # Local development
├── docker-compose.prod.yml         # Local production
├── docker-compose.render-dev.yml   # Render-like development
├── docker-compose.render-prod.yml  # Render configuration
├── nginx/                          # Reverse proxy nginx configuration
├── redis/                          # Redis configuration
├── monitoring/                     # Monitoring stack
└── docker_operations.ps1           # PowerShell script for Windows

scripts/
├── prepare-deployment.sh           # Deployment preparation
└── postgres-init.sql              # PostgreSQL initialization

# Main deployment script
deploy.sh                           # Multi-environment deployment (dev|prod|stop|logs|status)

# Frontend build scripts
frontend/build.render.sh            # Optimized build for Render
frontend/build.sh                   # Standard build

# Backend build scripts
backend/build.render.sh             # Build for Render
backend/build.sh                    # Standard build
```
├── docker-compose.dev.yml         # Desarrollo local
├── docker-compose.prod.yml        # Producción local
├── docker-compose.render-dev.yml  # Desarrollo similar a Render
├── docker-compose.render-prod.yml # Configuración para Render
├── nginx/                         # Configuración nginx proxy reverso
├── redis/                         # Configuración Redis
├── mysql/                         # Configuración base de datos (legacy)
├── monitoring/                    # Stack de monitoreo
└── docker_operations.ps1          # Script PowerShell para Windows

scripts/
├── prepare-deployment.sh          # Preparación de despliegue
└── postgres-init.sql             # Inicialización PostgreSQL

# Script de despliegue principal
deploy.sh                          # Despliegue multi-entorno (dev|prod|stop|logs|status)

# Scripts de build del frontend
frontend/build.render.sh           # Build optimizado para Render
frontend/build.sh                  # Build estándar

# Scripts de build del backend
backend/build.render.sh            # Build para Render
backend/build.sh                   # Build estándar
```

## 🚀 **Quick Start**

### **Local Development Environment**

```bash
# Clone repository
git clone <repository-url>
cd Movility-for-you

# Start development environment with Docker
./deploy.sh dev

# Access applications
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# Admin: http://localhost:8000/admin
# PostgreSQL: localhost:5432
```

### **Local Production Environment**

```bash
# Start local production environment
./deploy.sh prod

# View service logs
./deploy.sh logs

# Stop services
./deploy.sh stop

# Check service status
./deploy.sh status
```

### **Render.com Deployment**

The project is configured for automatic deployment on Render.com:

1. **Frontend**: Static Site with automatic build from `frontend/`
2. **Backend**: Web Service with managed PostgreSQL
3. **Configuration**: Environment variables configured in Render

```bash
# Prepare project for clean deployment
./scripts/prepare-deployment.sh
```

## 🔧 **Environment Configuration**

### **Development (.env.dev)**

- **Database**: SQLite (default) or PostgreSQL in Docker
- **Debug**: Enabled for development
- **Frontend**: Hot reload with React Scripts
- **Media**: Local storage
- **CORS**: Configured for localhost:3000

### **Local Production (.env.prod)**

- **Database**: PostgreSQL in Docker container
- **Proxy**: Nginx as reverse proxy
- **Static files**: WhiteNoise + nginx
- **Optimizations**: Compression and cache enabled

### **Render.com (Automatic configuration)**

- **Frontend**: Static Site with automatic build
- **Backend**: Web Service with managed PostgreSQL
- **Media**: Backblaze B2 for multimedia files
- **Variables**: Configured in Render dashboard
- **SSL**: Automatic certificates
- **Domain**: Automatic DNS configuration

## 🛠️ **Technology Stack**

### **Backend Stack**

- **Django 5.1.9**: Web framework with REST API
- **Django REST Framework 3.16.0**: API development
- **PostgreSQL 16**: Primary database (production)
- **SQLite**: Database for local development
- **psycopg2-binary 2.9.10**: PostgreSQL adapter
- **dj-database-url 2.2.0**: Flexible database configuration
- **WhiteNoise 6.8.2**: Static file service
- **django-storages 1.14.2**: Storage management
- **boto3 1.35.40**: Backblaze B2 integration
- **Stripe**: Payment processing
- **Brevo (sib-api-v3-sdk 7.6.0)**: Email service
- **Celery 5.3.0**: Background task processing
- **django-redis 5.4.0**: Cache and sessions
- **Gunicorn 21.2.0**: WSGI server for production

### **Frontend Stack**

- **React 19.1.0**: Modern UI framework
- **React Router DOM 7.4.1**: Client-side navigation
- **React Bootstrap 2.10.9**: UI components
- **Bootstrap 5.3.3**: CSS framework
- **Axios 1.8.4**: HTTP client for APIs
- **Stripe React 3.7.0**: Payment integration
- **FontAwesome 6.7.2**: Iconography
- **React Scripts 5.0.1**: Development tools

### **Infrastructure and DevOps**

- **Docker**: Multi-environment containerization (dev, prod, render)
- **Nginx**: Reverse proxy and static file server
- **Render.com**: Cloud deployment platform
- **Backblaze B2**: Object storage for media files
- **PostgreSQL 16**: Production database
- **GitHub**: Version control and CI/CD
- **GitHub Actions**: CI/CD pipeline

## 📚 **Documentation**

Comprehensive documentation is available in the `documentation/` directory:

- **Setup Guides**: Environment configuration
- **API Documentation**: Endpoint specifications
- **Deployment Guides**: Step-by-step deployment
- **Architecture Diagrams**: System overview
- **Troubleshooting**: Common issues and solutions

## 🔒 **Security Features**

- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Comprehensive data validation
- **CSRF Protection**: Cross-site request forgery protection
- **SQL Injection Prevention**: Parameterized queries
- **Rate Limiting**: API endpoint protection
- **HTTPS Enforcement**: Secure communication

## 📊 **Monitoring & Logging**

- **Application Logs**: Comprehensive logging system
- **Error Tracking**: Automatic error reporting
- **Performance Monitoring**: Response time tracking
- **Database Monitoring**: Query performance analysis

## 🧪 **Testing**

```bash
# Run backend tests
cd backend && python manage.py test

# Run frontend tests
cd frontend && npm test

# Integration tests
./scripts/test-integration.sh
```

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📝 **License**

This project is licensed under the MIT License. See LICENSE file for details.

## 📞 **Support**

For support and questions:

- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation directory

---

**Mobility4You** - Making car rental management simple and efficient. 🚗✨

## Docker Configuration

```
docker/
├── docker-compose.dev.yml         # Development environment
├── docker-compose.prod.yml        # Local production environment
├── docker-compose.render-dev.yml  # Render-like development
├── docker-compose.render-prod.yml # Render configuration
├── nginx/
│   ├── nginx.dev.conf             # Development nginx configuration
│   ├── nginx.prod.conf            # Production nginx configuration
│   └── ssl/                       # SSL certificates
├── docker_operations.ps1          # Docker operations script (Windows)
└── postgres/                      # PostgreSQL configuration
```

## 📁 **Available Scripts**

```bash
# Main scripts
deploy.sh                          # Multi-environment deployment (dev|prod|stop|logs|status)
scripts/prepare-deployment.sh      # Deployment preparation

# Component build scripts
frontend/build.render.sh           # Optimized build for Render
frontend/build.sh                  # Standard frontend build
backend/build.render.sh            # Backend build for Render
backend/build.sh                   # Standard backend build

# Docker scripts (Windows)
docker/docker_operations.ps1       # Docker operations with PowerShell
```

## ✨ **Key Features**

- **Modular Architecture**: 8 specialized Django applications by domain
- **Clean Separation**: Environment-specific configurations (dev/prod/render)
- **Docker Support**: Containerized deployment with multiple configurations
- **Professional Structure**: Follows Django and React best practices
- **Hybrid File System**: WhiteNoise for static files + Backblaze B2 for media
- **Payment Integration**: Fully integrated Stripe
- **Communication System**: Automatic notifications with Brevo
- **Cloud Deployment**: Complete configuration for Render.com
- **Comprehensive Documentation**: Clear project organization

## Environment Files

- `backend/.env-example` - Backend environment variables template
- `frontend/.env-example` - Frontend environment variables template
- `backend/config/settings/` - Environment-specific configurations

## 💾 **Database**

- **Development**: SQLite (default) or PostgreSQL in Docker
- **Production**: PostgreSQL 16 on Render.com with optimizations
- **Migrations**: Django ORM migrations in each application
- **Initialization**: Custom SQL scripts for initial configuration

## 📡 **API Documentation**

The API follows RESTful principles with modular endpoints organized by application:

### **Main Endpoints**

- `/api/usuarios/` - User management and authentication
- `/api/vehiculos/` - Vehicle management and catalog
- `/api/lugares/` - Location and address management
- `/api/reservas/` - Reservation and contract management
- `/api/politicas/` - Policy and terms management
- `/api/facturas_contratos/` - Billing and contract management
- `/api/comunicacion/` - Notification and communication system
- `/api/payments/` - Payment processing with Stripe

### **Authentication**

- Token-based authentication with Django REST Framework
- Granular permissions per application
- Custom security middleware

## Getting Started

### Development

```bash
# Start development environment
cd docker/
docker-compose -f docker-compose.dev.yml up -d

# Run migrations
docker exec mobility4you_backend_dev python manage.py migrate

# Create superuser
docker exec -it mobility4you_backend_dev python manage.py createsuperuser
```

### **Local Production**

```bash
# Start production environment
./deploy.sh prod

# View logs
./deploy.sh logs

# Stop services
./deploy.sh stop
```

## 🔧 **Maintenance**

- **Logs**: Check `backend/logs/` for application logs
- **PostgreSQL**: Managed database on Render, local in Docker
- **Media**: Multimedia files in Backblaze B2 (production)
- **Static Files**: Served by WhiteNoise in production
- **Monitoring**: Configuration available in `docker/monitoring/`

---

## 📄 **License**

This project is under the MIT License. See the LICENSE file for more details.

## 👥 **Contributions**

Contributions are welcome. Please follow the project conventions and ensure all tests pass before submitting a pull request.
