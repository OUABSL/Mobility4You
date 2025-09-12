# Environment Configuration Guide

This document provides comprehensive configuration details for all environments in the Mobility4You application.

## 🏗️ Architecture Overview

The application uses a multi-tier architecture with:

- **Frontend**: React application (port 3000)
- **Backend**: Django REST API (port 8000)
- **Database**: PostgreSQL (port 5432)
- **Cache**: Redis (port 6379)
- **Proxy**: Nginx (port 80/443)

## 🔧 Environment Configurations

### Environment Variables Structure

The application uses a **component-based .env structure** for better organization and maintenance:

**Backend Environment Files** (`backend/`):

- `.env-example`: Template with all required variables and documentation
- `.env-dev`: Development environment configuration
- `.env-prod`: Production environment configuration

**Frontend Environment Files** (`frontend/`):

- `.env-example`: Template with all required React environment variables
- `.env-dev`: Development environment configuration
- `.env-prod`: Production environment configuration

### Development Environment (`dev`)

**Purpose**: Local development with hot-reload and debugging

**Backend Configuration** (`backend/.env-dev`):

```bash
# Database
POSTGRES_DB=mobility4you_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=superseguro_postgres_dev
DATABASE_URL=postgresql://postgres:superseguro_postgres_dev@db:5432/mobility4you_dev

# Django
DEBUG=True
SECRET_KEY=django_dev_secret_key_testing_123_dev_environment
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,backend

# Redis
REDIS_URL=redis://redis:6379/0

# Email (development)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Storage
MEDIA_ROOT=/app/media
STATIC_ROOT=/app/staticfiles
```

**Docker Compose**: `docker/docker-compose.dev.yml`

- Hot-reload enabled for both frontend and backend
- Volume mounts for live code editing
- Debug ports exposed
- Development database with sample data

**Access URLs**:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Admin Panel: http://localhost:8000/admin
- Database: localhost:5432

---

### Production Environment (`prod`)

**Purpose**: Optimized production deployment with performance and security

**Configuration File**: `docker/.env.prod`

```bash
# Database
POSTGRES_DB=mobility4you_prod
POSTGRES_USER=prod_user
POSTGRES_PASSWORD=secure_production_password
DATABASE_URL=postgresql://prod_user:secure_password@postgres:5432/mobility4you_prod

# Django
DEBUG=False
SECRET_KEY=super-secure-production-secret-key
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Redis
REDIS_URL=redis://redis:6379/0

# Email (production)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.brevo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-brevo-email
EMAIL_HOST_PASSWORD=your-brevo-password

# Storage
USE_S3=True
AWS_ACCESS_KEY_ID=your-backblaze-key-id
AWS_SECRET_ACCESS_KEY=your-backblaze-secret
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_ENDPOINT_URL=https://s3.us-west-004.backblazeb2.com

# Security
SECURE_SSL_REDIRECT=True
SECURE_PROXY_SSL_HEADER=('HTTP_X_FORWARDED_PROTO', 'https')
```

**Docker Compose**: `docker/docker-compose.prod.yml`

- Optimized builds with multi-stage Dockerfiles
- Nginx reverse proxy with SSL
- Production database with backup strategy
- Redis for session storage and caching
- Log aggregation and monitoring

**Features**:

- SSL/TLS encryption
- Static file optimization
- Database connection pooling
- Horizontal scaling ready
- Automated backups

---

### Render Development (`render-dev`)

**Purpose**: Cloud development environment that mirrors production

**Configuration File**: Based on Render environment variables

```bash
# Database (Render PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database

# Django
DEBUG=True
SECRET_KEY=render-dev-secret-key
PYTHON_VERSION=3.12.0

# Static Files
STATIC_URL=/static/
COLLECTSTATIC_ON_BUILD=1

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
```

**Docker Compose**: `docker/docker-compose.render-dev.yml`

- Simulates Render.com environment locally
- External database connection
- Cloud storage integration
- Email service testing

**Scripts**:

- `./test-render.sh`: Test render configuration
- `./deploy-fresh.sh`: Deploy with fresh cache

---

### Render Production (`render-prod`)

**Purpose**: Production deployment on Render.com cloud platform

**Configuration**: Render dashboard environment variables

```bash
# Database
DATABASE_URL=postgresql://[render-provided]

# Django
DEBUG=False
SECRET_KEY=[secure-random-key]
ALLOWED_HOSTS=your-app.onrender.com

# Storage (Backblaze B2)
USE_S3=True
AWS_ACCESS_KEY_ID=[backblaze-key-id]
AWS_SECRET_ACCESS_KEY=[backblaze-secret]
AWS_STORAGE_BUCKET_NAME=[bucket-name]
AWS_S3_ENDPOINT_URL=https://s3.us-west-004.backblazeb2.com

# Email (Brevo)
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_HOST_USER=[brevo-email]
EMAIL_HOST_PASSWORD=[brevo-password]

# Payment (Stripe)
STRIPE_PUBLISHABLE_KEY=[stripe-publishable-key]
STRIPE_SECRET_KEY=[stripe-secret-key]
```

**Render Services**:

- **Web Service**: Django backend
- **Static Site**: React frontend
- **PostgreSQL**: Managed database
- **Redis**: Managed cache

---

## 🚀 Deployment Commands

### Local Development

```bash
# Start development environment
./scripts/build.dev.sh

# Alternative using deploy script
./deploy.sh dev

# Stop services
./deploy.sh stop
```

### Production Deployment

```bash
# Start production environment
./scripts/build.prod.sh

# Full production deployment
./deploy.sh prod

# View production logs
./deploy.sh logs prod
```

### Render Deployment

```bash
# Test render configuration locally
./test-render.sh

# Deploy to render with fresh cache
./deploy-fresh.sh

# Check deployment status
./deploy.sh status render
```

## 🛠️ Configuration Management

### Environment Variables Priority

1. **Render Dashboard**: Highest priority for cloud deployment
2. **Docker .env files**: For containerized environments
3. **settings.py defaults**: Fallback values

### Security Best Practices

- Never commit `.env` files with real credentials
- Use different secret keys for each environment
- Rotate database passwords regularly
- Enable HTTPS in production
- Use managed services for sensitive data

### Database Migrations

```bash
# Development
docker-compose -f docker/docker-compose.dev.yml exec backend python manage.py migrate

# Production
docker-compose -f docker/docker-compose.prod.yml exec backend python manage.py migrate

# Render (via build script)
python manage.py migrate --noinput
```

### Static Files Collection

```bash
# Development (automatic)
./scripts/build.dev.sh

# Production
docker-compose -f docker/docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Render (automatic during build)
python manage.py collectstatic --noinput
```

## 📊 Monitoring & Logging

### Development

- Console logging for all services
- Django debug toolbar
- Hot-reload for instant feedback

### Production

- Structured logging to files
- Error aggregation and alerting
- Performance monitoring
- Database query optimization

### Render

- Built-in logging and monitoring
- Automatic scaling
- Health checks and restart policies

## 🔍 Troubleshooting

### Common Issues

**Database Connection**:

```bash
# Test database connectivity
./deploy.sh status

# View database logs
docker-compose logs postgres
```

**Static Files Not Loading**:

```bash
# Rebuild with fresh static files
./deploy-fresh.sh

# Check static file collection
docker-compose exec backend python manage.py collectstatic --dry-run
```

**Render Deployment Fails**:

```bash
# Test configuration locally
./test-render.sh

# Check build logs in Render dashboard
# Verify environment variables
```

### Performance Optimization

**Database**:

- Enable connection pooling
- Add database indexes
- Regular VACUUM operations

**Static Files**:

- Use CDN for production
- Enable Gzip compression
- Optimize image sizes

**Caching**:

- Redis for session storage
- Database query caching
- Template fragment caching

---

This configuration guide ensures consistent and reliable deployments across all environments while maintaining security and performance best practices.
