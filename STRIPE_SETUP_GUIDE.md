# Stripe Payment Integration Setup Guide

## Overview
This document provides complete setup instructions for the Stripe payment integration in the Mobility4You Django-React-Docker application.

## Prerequisites
1. Stripe account (test and/or production)
2. Docker and Docker Compose installed
3. Node.js and npm (for frontend development)
4. Python 3.8+ (for backend development)

## Environment Configuration

### 1. Stripe Account Setup
1. Create a Stripe account at https://stripe.com
2. Navigate to the Dashboard > Developers > API keys
3. Copy your Publishable key (starts with `pk_test_` for test mode)
4. Copy your Secret key (starts with `sk_test_` for test mode)
5. Set up webhooks in Dashboard > Developers > Webhooks
6. Copy the webhook signing secret (starts with `whsec_`)

### 2. Environment Variables Configuration

#### Update `.env` file:
```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here
STRIPE_ENVIRONMENT=test
STRIPE_API_VERSION=2023-10-16
```

#### Update `.env.dev` file:
```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here
STRIPE_ENVIRONMENT=test
STRIPE_API_VERSION=2023-10-16

# React App Stripe Configuration
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
```

### 3. Webhook Configuration
Configure the following webhook endpoints in your Stripe dashboard:

#### Webhook URL:
- Development: `http://localhost:8000/api/payments/stripe/webhook/`
- Production: `https://yourdomain.com/api/payments/stripe/webhook/`

#### Events to Subscribe:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `charge.dispute.created`
- `refund.created`
- `refund.updated`

## Backend Configuration

### 1. Django Settings
The Django settings are already configured in `backend/config/settings.py` with comprehensive Stripe configuration including:

- API configuration
- Payment types and methods
- Webhook handling
- Rate limiting
- Error handling
- Logging
- Metadata management

### 2. Stripe Service Layer
Located in `backend/payments/services.py`:

- `StripePaymentService`: Main payment processing service
- `StripeWebhookService`: Webhook event processing
- Payment intent creation and confirmation
- Refund processing
- Payment status tracking

### 3. API Endpoints
Available endpoints in `backend/payments/views.py`:

- `POST /api/payments/stripe/create-payment-intent/`
- `POST /api/payments/stripe/confirm-payment-intent/`
- `GET /api/payments/stripe/payment-status/<numero_pedido>/`
- `POST /api/payments/stripe/webhook/`
- `GET /api/payments/stripe/config/`

## Frontend Configuration

### 1. Stripe Services
Located in `frontend/src/services/stripePayementServices.js`:

- Stripe initialization with fallback to environment variables
- Payment intent creation and processing
- Payment method handling
- Error handling and logging

### 2. Payment Components
- `StripePaymentForm.js`: Complete payment form with Stripe Elements
- `ReservaClientePago.js`: Payment processing for reservations
- `PagoDiferenciaReserva.js`: Difference payment processing

### 3. Frontend Environment Variables
Required in React app:
- `REACT_APP_STRIPE_PUBLISHABLE_KEY`
- `REACT_APP_API_URL`
- `REACT_APP_BACKEND_URL`

## Docker Configuration

### 1. Docker Compose
The `docker-compose.yml` file has been updated to include:

#### Backend Service:
- All Stripe environment variables
- Redsys environment variables (existing payment system)
- Proper network configuration

#### Frontend Service:
- React Stripe environment variables
- API URL configuration

### 2. Container Communication
- Backend accessible at `http://backend:8000` from other containers
- Frontend accessible at `http://frontend:3000` from other containers
- Nginx proxy configured for external access

## Development Setup

### 1. Clone and Setup
```bash
git clone <repository-url>
cd Movility-for-you
```

### 2. Configure Environment
```bash
# Copy and update environment files
cp docker/.env.example docker/.env
cp docker/.env.dev.example docker/.env.dev

# Update the Stripe keys in both files
```

### 3. Start Development Environment
```bash
cd docker
docker-compose up -d
```

### 4. Initialize Database
```bash
# Run Django migrations
docker-compose exec backend python manage.py migrate

# Create superuser (optional)
docker-compose exec backend python manage.py createsuperuser
```

## Testing the Integration

### 1. Test Payment Flow
1. Access the application at `http://localhost:3000`
2. Create a reservation
3. Select card payment method
4. Use Stripe test card numbers:
   - Success: `4242424242424242`
   - Decline: `4000000000000002`
   - 3D Secure: `4000002500003155`

### 2. Test Webhook Processing
1. Use Stripe CLI for local webhook testing:
```bash
stripe listen --forward-to localhost:8000/api/payments/stripe/webhook/
```

2. Trigger test events:
```bash
stripe trigger payment_intent.succeeded
```

### 3. Monitor Logs
```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend
```

## Production Deployment

### 1. Environment Configuration
- Replace test keys with production keys
- Set `STRIPE_ENVIRONMENT=production`
- Configure production webhook URL
- Enable HTTPS

### 2. Security Considerations
- Use environment variable management (AWS Secrets Manager, etc.)
- Enable webhook signature verification
- Implement rate limiting
- Set up monitoring and alerting

### 3. SSL Certificate
- Stripe requires HTTPS for production webhooks
- Configure SSL certificates in Nginx
- Update webhook URLs in Stripe dashboard

## Troubleshooting

### Common Issues

#### 1. "Stripe not initialized" Error
- Check `REACT_APP_STRIPE_PUBLISHABLE_KEY` is set
- Verify backend `/api/payments/stripe/config/` endpoint is accessible
- Check browser console for detailed errors

#### 2. Payment Intent Creation Fails
- Verify `STRIPE_SECRET_KEY` is correct
- Check backend logs for Stripe API errors
- Ensure amount is within Stripe limits (minimum 50 cents)

#### 3. Webhook Events Not Processed
- Verify webhook URL is accessible
- Check webhook signing secret
- Ensure events are properly subscribed in Stripe dashboard

#### 4. Docker Container Issues
- Ensure all environment variables are properly set
- Check container logs: `docker-compose logs <service-name>`
- Verify network connectivity between containers

### Debug Mode
The application includes comprehensive debug logging:
- Set `DEBUG_MODE=true` for detailed logging
- Frontend payment simulation available in development
- Backend includes detailed Stripe interaction logs

## Support and Documentation

### External Resources
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing](https://stripe.com/docs/testing)

### Internal Documentation
- `backend/payments/services.py` - Detailed service documentation
- `frontend/src/services/stripePayementServices.js` - Frontend service documentation
- Django admin interface for payment monitoring

## Security Best Practices

1. **Never expose secret keys** in frontend code
2. **Validate all payments** on the backend
3. **Use webhook verification** for production
4. **Implement idempotency** for payment operations
5. **Log all payment activities** for audit trails
6. **Use HTTPS** for all payment-related communications
7. **Regularly update** Stripe API version and libraries

## Integration Status

✅ **Completed:**
- Backend Stripe service implementation
- Frontend Stripe payment components
- Environment variable configuration
- Docker container configuration
- Webhook processing setup
- Error handling and logging
- Payment status tracking
- Refund processing

✅ **Ready for Testing:**
- Complete payment flow
- Webhook event processing
- Development environment setup
- Test card processing

⚠️ **Requires Configuration:**
- Actual Stripe account keys
- Production webhook URL
- SSL certificate for production
- Monitoring and alerting setup
