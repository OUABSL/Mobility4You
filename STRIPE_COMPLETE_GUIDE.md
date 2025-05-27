# 🚀 Complete Stripe Payment Integration Guide

This guide provides comprehensive instructions for setting up and deploying the Stripe payment integration in the Django-React-Docker-DB application.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Development Setup](#development-setup)
3. [Production Deployment](#production-deployment)
4. [Environment Configuration](#environment-configuration)
5. [SSL Certificate Setup](#ssl-certificate-setup)
6. [Testing & Validation](#testing--validation)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Stripe account (test or live)
- Domain name (for production)

### 1. Get Stripe API Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your Publishable Key (`pk_test_...` or `pk_live_...`)
3. Copy your Secret Key (`sk_test_...` or `sk_live_...`)

### 2. Configure Environment
```bash
# Run the interactive setup script
python setup_stripe_environment.py

# Or manually copy and edit environment file
cp docker/.env.development.template docker/.env
# Edit docker/.env with your Stripe keys
```

### 3. Start Application
```bash
# Development
docker-compose -f docker/docker-compose.yml up -d

# Production
docker-compose -f docker/docker-compose.prod.yml up -d
```

### 4. Validate Integration
```bash
# Run validation script
python validate_stripe_integration.py

# Run comprehensive tests
python test_stripe_integration.py --full
```

## 🛠️ Development Setup

### Step 1: Environment Configuration

Copy the development template:
```bash
cp docker/.env.development.template docker/.env
```

Edit `docker/.env` with your Stripe test keys:
```bash
# Stripe Test Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_test_key_here
STRIPE_SECRET_KEY=sk_test_your_actual_test_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_ENVIRONMENT=test
```

### Step 2: Frontend Configuration

The frontend is already configured to use Stripe. Verify in `frontend/src/components/ReservaPasos/ReservaClientePago.js`:
```javascript
const STRIPE_ENABLED = true; // ✅ Should be true
```

### Step 3: Start Development Environment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### Step 4: Test Payment Flow

1. Navigate to `http://localhost:3000`
2. Create a reservation
3. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`

## 🌐 Production Deployment

### Step 1: Domain & DNS Setup

1. Purchase a domain name
2. Point DNS A records to your server IP:
   - `yourdomain.com` → `YOUR_SERVER_IP`
   - `www.yourdomain.com` → `YOUR_SERVER_IP`
   - `api.yourdomain.com` → `YOUR_SERVER_IP` (optional)

### Step 2: SSL Certificate Setup

Run the SSL setup script:
```bash
sudo chmod +x setup_ssl.sh
sudo ./setup_ssl.sh yourdomain.com admin@yourdomain.com
```

Or manually with Certbot:
```bash
sudo certbot certonly --webroot -w /var/www/certbot -d yourdomain.com -d www.yourdomain.com
```

### Step 3: Production Environment Configuration

```bash
# Copy production template
cp docker/.env.production.template docker/.env

# Edit with your production values
nano docker/.env
```

Required changes:
```bash
# Stripe Live Configuration
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key_here
STRIPE_SECRET_KEY=sk_live_your_live_key_here
STRIPE_ENVIRONMENT=live

# Production URLs
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com
REACT_APP_API_URL=https://yourdomain.com/api

# Database Security
MYSQL_ROOT_PASSWORD=super_secure_password_here
MYSQL_PASSWORD=secure_password_here

# Django Security
SECRET_KEY=50_character_random_string_here
ALLOWED_HOST=yourdomain.com,www.yourdomain.com
DEBUG=False
```

### Step 4: Update Nginx Configuration

Edit `docker/nginx/nginx.prod.conf` and replace `yourdomain.com` with your actual domain.

### Step 5: Deploy Production

```bash
# Build and start production containers
docker-compose -f docker/docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker/docker-compose.prod.yml ps

# View logs
docker-compose -f docker/docker-compose.prod.yml logs -f
```

### Step 6: Configure Stripe Webhooks

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://yourdomain.com/api/payments/stripe/webhook/`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
4. Copy webhook secret to your `.env` file

## ⚙️ Environment Configuration

### Development Environment Variables

```bash
# Stripe Configuration (Test)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_ENVIRONMENT=test
STRIPE_API_VERSION=2023-10-16

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Database
MYSQL_ROOT_PASSWORD=dev_password
MYSQL_DATABASE=mobility4you_dev
MYSQL_USER=mobility_dev
MYSQL_PASSWORD=dev_password

# Django
SECRET_KEY=dev-secret-key
ALLOWED_HOST=localhost,127.0.0.1
DEBUG=True
```

### Production Environment Variables

```bash
# Stripe Configuration (Live)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_ENVIRONMENT=live
STRIPE_API_VERSION=2023-10-16

# URLs
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com
REACT_APP_API_URL=https://yourdomain.com/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Database
MYSQL_ROOT_PASSWORD=super_secure_password
MYSQL_DATABASE=mobility4you_prod
MYSQL_USER=mobility_prod
MYSQL_PASSWORD=secure_password

# Django
SECRET_KEY=50_character_random_string
ALLOWED_HOST=yourdomain.com,www.yourdomain.com
DEBUG=False

# Security
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

## 🔒 SSL Certificate Setup

### Automatic Setup (Recommended)

```bash
sudo ./setup_ssl.sh yourdomain.com admin@yourdomain.com
```

### Manual Setup

1. **Install Certbot:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Obtain Certificate:**
   ```bash
   sudo certbot certonly --webroot -w /var/www/certbot \
     -d yourdomain.com -d www.yourdomain.com
   ```

3. **Copy Certificates:**
   ```bash
   sudo mkdir -p docker/nginx/ssl
   sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/
   sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/
   ```

4. **Setup Auto-Renewal:**
   ```bash
   echo "0 3 * * * certbot renew --quiet && docker-compose restart nginx" | sudo crontab -
   ```

## 🧪 Testing & Validation

### Validation Script

```bash
# Basic validation
python validate_stripe_integration.py

# Comprehensive testing
python test_stripe_integration.py --full

# Production testing
python test_stripe_integration.py --env prod
```

### Manual Testing

1. **Test Payment Flow:**
   - Create a reservation
   - Use test card: `4242 4242 4242 4242`
   - Verify payment success

2. **Test Error Handling:**
   - Use declined card: `4000 0000 0000 0002`
   - Verify error messages

3. **Test 3D Secure:**
   - Use 3DS card: `4000 0025 0000 3155`
   - Complete authentication

### Stripe Test Cards

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Declined payment |
| `4000 0025 0000 3155` | 3D Secure authentication |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 9987` | Lost card |

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Check service health
curl https://yourdomain.com/health

# Check Stripe configuration
curl https://yourdomain.com/api/payments/stripe/config/

# Check database connection
docker-compose exec backend python manage.py check --database default
```

### Log Monitoring

```bash
# View application logs
docker-compose logs -f backend

# View Nginx logs
docker-compose logs -f nginx

# View Stripe webhook logs
docker-compose exec backend tail -f /app/logs/stripe_webhooks.log
```

### Database Backups

```bash
# Manual backup
docker-compose exec db mysqldump -u root -p mobility4you_prod > backup_$(date +%Y%m%d).sql

# Restore backup
docker-compose exec -T db mysql -u root -p mobility4you_prod < backup_20231201.sql
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Placeholder API Keys
**Problem:** Validation shows placeholder values
**Solution:**
```bash
python setup_stripe_environment.py
```

#### 2. 404 on API Endpoints
**Problem:** Backend not accessible
**Solution:**
```bash
# Check backend status
docker-compose ps backend

# Restart backend
docker-compose restart backend

# Check logs
docker-compose logs backend
```

#### 3. SSL Certificate Errors
**Problem:** HTTPS not working
**Solution:**
```bash
# Check certificate files
ls -la docker/nginx/ssl/

# Renew certificates
sudo certbot renew

# Restart Nginx
docker-compose restart nginx
```

#### 4. Stripe Webhook Failures
**Problem:** Webhooks not receiving events
**Solution:**
1. Check webhook URL in Stripe Dashboard
2. Verify webhook secret in environment
3. Check firewall settings
4. Test with Stripe CLI:
   ```bash
   stripe listen --forward-to https://yourdomain.com/api/payments/stripe/webhook/
   ```

### Debug Mode

Enable debug logging:
```bash
# In .env file
DEBUG=True
LOG_LEVEL=DEBUG

# Restart services
docker-compose restart
```

## 🛡️ Security Best Practices

### Environment Security
- ✅ Never commit `.env` files to version control
- ✅ Use strong, unique passwords
- ✅ Rotate API keys regularly
- ✅ Use live keys only in production

### SSL/TLS Configuration
- ✅ Use HTTPS in production
- ✅ Enable HSTS headers
- ✅ Implement proper CSP headers
- ✅ Regular certificate renewal

### Application Security
- ✅ Validate all inputs
- ✅ Implement rate limiting
- ✅ Use CSRF protection
- ✅ Regular security updates

### Monitoring
- ✅ Monitor failed payments
- ✅ Track webhook delivery
- ✅ Alert on errors
- ✅ Regular security audits

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Django Security](https://docs.djangoproject.com/en/stable/topics/security/)
- [React Security Best Practices](https://blog.logrocket.com/react-security-best-practices/)
- [Docker Security](https://docs.docker.com/engine/security/)

## 🆘 Getting Help

1. **Check validation results:**
   ```bash
   python validate_stripe_integration.py
   ```

2. **Run comprehensive tests:**
   ```bash
   python test_stripe_integration.py --full
   ```

3. **Check logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stripe Support:**
   - [Stripe Support](https://support.stripe.com/)
   - [Stripe Status](https://status.stripe.com/)

---

**⚠️ Important Notes:**
- Always test thoroughly in development before deploying to production
- Never use test API keys in production
- Monitor payment flows and error rates
- Keep all dependencies updated
- Implement proper backup strategies

**🎉 Success Checklist:**
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Stripe webhooks configured
- [ ] Payment flow tested
- [ ] Monitoring setup
- [ ] Backups configured
- [ ] Security measures implemented
