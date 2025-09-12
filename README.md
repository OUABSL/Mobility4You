# Mobility4You - Car Rental Platform

> 🚗 **Complete car rental management solution** with Django REST API backend, React frontend, and Docker deployment infrastructure.

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

## 🏗️ **Architecture**

### **Backend Structure**

```
backend/
├── config/                     # Django project configuration
│   ├── settings/              # Environment-specific settings
│   ├── middleware/            # Custom middleware
│   └── management/            # Management commands
│
├── usuarios/                   # User management system
│   ├── models.py              # User models with flexible validation
│   ├── validations.py         # Centralized validation functions
│   ├── admin.py               # Custom admin interface
│   └── serializers.py         # API serializers
│
├── vehiculos/                  # Vehicle management
│   ├── models.py              # Vehicle and image models
│   ├── admin.py               # Fleet administration
│   └── views.py               # Vehicle API endpoints
│
├── reservas/                   # Reservation system
│   ├── models.py              # Booking and contract models
```

### **Frontend Structure**

```
frontend/
├── public/                     # Static assets
│   ├── index.html             # Main HTML template
│   └── assets/                # Images, icons, etc.
│
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── common/            # Shared components
│   │   ├── admin/             # Admin-specific components
│   │   └── user/              # User-facing components
│   │
│   ├── pages/                 # Page components
│   │   ├── Dashboard/         # User dashboard
│   │   ├── Reservations/      # Booking management
│   │   ├── Vehicles/          # Vehicle catalog
│   │   └── Auth/              # Authentication pages
│   │
│   ├── services/              # API communication
│   │   ├── api.js             # API configuration
│   │   ├── auth.js            # Authentication service
│   │   └── vehicles.js        # Vehicle service
│   │
│   ├── utils/                 # Utility functions
│   │   ├── validation.js      # Form validation
│   │   └── formatting.js      # Data formatting
│   │
│   └── styles/                # Styling
│       ├── globals.css        # Global styles
│       └── components/        # Component styles
│
├── package.json               # Node.js dependencies
├── Dockerfile                 # Development container
├── Dockerfile.prod            # Production container
└── nginx.conf                 # Nginx configuration
```

### **Docker Infrastructure**

```
docker/
├── docker-compose.dev.yml          # Development environment
├── docker-compose.prod.yml         # Production environment
├── docker-compose.render-dev.yml   # Render development
├── docker-compose.render-prod.yml  # Render production
│
├── .env                            # Default environment
├── .env.dev                        # Development variables
├── .env.prod                       # Production variables
│
├── nginx/                          # Reverse proxy configuration
├── redis/                          # Redis configuration
├── mysql/                          # Database configuration
├── monitoring/                     # Monitoring stack
└── scripts/                        # Docker utility scripts
```

### **Scripts & Deployment**

```
scripts/
├── build.dev.sh               # Development build script
├── build.prod.sh              # Production build script
└── prepare-deployment.sh      # Deployment preparation

# Root level deployment scripts
deploy.sh                      # Multi-environment deployment
deploy-fresh.sh                # Fresh deployment with cache clearing
test-render.sh                 # Render environment testing
```

## 🚀 **Quick Start**

### **Development Environment**

```bash
# Clone repository
git clone <repository-url>
cd Movility-for-you

# Start development environment
./scripts/build.dev.sh

# Access applications
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# Admin: http://localhost:8000/admin
```

### **Production Environment**

```bash
# Start production environment
./scripts/build.prod.sh

# Or use deployment script
./deploy.sh prod
```

### **Render.com Deployment**

```bash
# Test Render configuration
./test-render.sh

# Deploy to Render
./deploy-fresh.sh
```

## 🔧 **Environment Configuration**

### **Development (.env.dev)**

- Local database (SQLite/PostgreSQL)
- Debug mode enabled
- Hot reload for frontend
- Local media storage

### **Production (.env.prod)**

- PostgreSQL database
- Redis for caching
- Nginx reverse proxy
- Optimized static files

## 🛠️ **Key Technologies**

### **Backend Stack**

- **Django 4.x**: Web framework with REST API
- **Django REST Framework**: API development
- **PostgreSQL**: Primary database
- **Redis**: Caching and session storage
- **Celery**: Background task processing
- **Stripe**: Payment processing
- **Brevo**: Email service integration

### **Frontend Stack**

- **React 18**: Modern UI framework
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls
- **CSS Modules**: Styled components
- **Webpack**: Module bundling

### **Infrastructure**

- **Docker**: Containerization
- **Nginx**: Reverse proxy and static files
- **Render.com**: Cloud deployment platform
- **Backblaze B2**: Object storage
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
├── src/ # React source code
│ ├── components/ # Reusable components
│ ├── assets/ # Images, styles
│ └── ...
├── build/ # Production build
├── package.json # Node.js dependencies
└── Dockerfile # Frontend container

```

## Docker Configuration

```

docker/
├── docker-compose.dev.yml # Development environment
├── docker-compose.prod.yml # Production environment
├── nginx/
│ ├── nginx.dev.conf # Development nginx config
│ ├── nginx.prod.conf # Production nginx config
│ └── ssl/ # SSL certificates
├── mariadb-init.sh # Database initialization
└── scripts/ # Docker utility scripts

```

## Scripts

```

scripts/
├── build.dev.sh # Development build
├── build.prod.sh # Production build
├── down.dev.sh # Stop development
└── down.prod.sh # Stop production

````

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
````

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
