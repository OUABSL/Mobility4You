#!/bin/bash
# SSL Certificate Setup Script for Production
# ===========================================
# This script helps set up SSL certificates using Let's Encrypt for the Stripe payment integration.

set -e

# Configuration
DOMAIN=${1:-yourdomain.com}
EMAIL=${2:-admin@yourdomain.com}
WEBROOT_PATH="/var/www/certbot"
CERT_PATH="/etc/nginx/ssl"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Update package list
    apt-get update
    
    # Install required packages
    apt-get install -y \
        curl \
        wget \
        gnupg \
        lsb-release \
        software-properties-common
    
    # Install Certbot
    if ! command -v certbot &> /dev/null; then
        log_info "Installing Certbot..."
        apt-get install -y certbot python3-certbot-nginx
    else
        log_info "Certbot is already installed"
    fi
    
    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
        log_info "Installing Docker..."
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt-get update
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        systemctl enable docker
        systemctl start docker
    else
        log_info "Docker is already installed"
    fi
}

# Validate domain
validate_domain() {
    log_info "Validating domain: $DOMAIN"
    
    # Check if domain resolves to this server
    DOMAIN_IP=$(dig +short $DOMAIN)
    SERVER_IP=$(curl -s ifconfig.me)
    
    if [[ "$DOMAIN_IP" != "$SERVER_IP" ]]; then
        log_warn "Domain $DOMAIN (IP: $DOMAIN_IP) does not point to this server (IP: $SERVER_IP)"
        read -p "Continue anyway? [y/N]: " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Domain validation failed. Please update DNS records."
            exit 1
        fi
    else
        log_info "Domain validation successful"
    fi
}

# Setup webroot directory
setup_webroot() {
    log_info "Setting up webroot directory..."
    mkdir -p $WEBROOT_PATH
    chmod 755 $WEBROOT_PATH
    chown www-data:www-data $WEBROOT_PATH
}

# Create temporary Nginx config for certificate challenge
create_temp_nginx_config() {
    log_info "Creating temporary Nginx configuration..."
    
    cat > /tmp/temp_nginx.conf << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root $WEBROOT_PATH;
    }
    
    location / {
        return 200 'SSL Setup in Progress';
        add_header Content-Type text/plain;
    }
}
EOF
}

# Obtain SSL certificate
obtain_certificate() {
    log_info "Obtaining SSL certificate for $DOMAIN..."
    
    # Stop any running Nginx
    systemctl stop nginx 2>/dev/null || true
    
    # Start temporary Nginx for ACME challenge
    docker run -d --name temp_nginx \
        -p 80:80 \
        -v /tmp/temp_nginx.conf:/etc/nginx/conf.d/default.conf \
        -v $WEBROOT_PATH:$WEBROOT_PATH \
        nginx:alpine
    
    # Wait for Nginx to start
    sleep 5
    
    # Obtain certificate
    certbot certonly \
        --webroot \
        --webroot-path=$WEBROOT_PATH \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --domains $DOMAIN,www.$DOMAIN
    
    # Stop temporary Nginx
    docker stop temp_nginx
    docker rm temp_nginx
}

# Copy certificates to project directory
setup_certificates() {
    log_info "Setting up certificates for Docker..."
    
    # Create SSL directory in project
    mkdir -p $CERT_PATH
    
    # Copy certificates
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $CERT_PATH/
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $CERT_PATH/
    
    # Set proper permissions
    chmod 644 $CERT_PATH/fullchain.pem
    chmod 600 $CERT_PATH/privkey.pem
    chown root:root $CERT_PATH/*.pem
    
    log_info "Certificates copied to $CERT_PATH"
}

# Setup certificate renewal
setup_renewal() {
    log_info "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > /usr/local/bin/renew-certs.sh << 'EOF'
#!/bin/bash
# Certificate renewal script

DOMAIN=yourdomain.com
CERT_PATH=/etc/nginx/ssl
PROJECT_DIR=/path/to/your/project

# Renew certificates
certbot renew --quiet

# Copy renewed certificates
if [[ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]]; then
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $CERT_PATH/
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $CERT_PATH/
    
    # Restart Nginx container
    cd $PROJECT_DIR
    docker-compose -f docker/docker-compose.prod.yml restart nginx
    
    echo "Certificates renewed and services restarted"
fi
EOF
    
    chmod +x /usr/local/bin/renew-certs.sh
    
    # Add cron job for automatic renewal
    (crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/renew-certs.sh") | crontab -
    
    log_info "Automatic renewal configured (daily at 3 AM)"
}

# Update Nginx configuration with actual domain
update_nginx_config() {
    log_info "Updating Nginx configuration with domain: $DOMAIN"
    
    # Update the production Nginx config with actual domain
    sed -i "s/yourdomain.com/$DOMAIN/g" docker/nginx/nginx.prod.conf
    
    log_info "Nginx configuration updated"
}

# Validate SSL setup
validate_ssl() {
    log_info "Validating SSL setup..."
    
    # Check certificate files
    if [[ -f "$CERT_PATH/fullchain.pem" && -f "$CERT_PATH/privkey.pem" ]]; then
        log_info "SSL certificate files found"
        
        # Check certificate validity
        CERT_EXPIRY=$(openssl x509 -in $CERT_PATH/fullchain.pem -noout -enddate | cut -d= -f2)
        log_info "Certificate expires: $CERT_EXPIRY"
        
        # Check certificate details
        CERT_DOMAIN=$(openssl x509 -in $CERT_PATH/fullchain.pem -noout -text | grep -A1 "Subject Alternative Name" | tail -1 | grep -oP 'DNS:\K[^,]*' | head -1)
        log_info "Certificate domain: $CERT_DOMAIN"
        
        return 0
    else
        log_error "SSL certificate files not found"
        return 1
    fi
}

# Main setup function
main() {
    log_info "🔐 SSL Certificate Setup for Stripe Payment Integration"
    log_info "=================================================="
    
    # Validate inputs
    if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
        log_error "Usage: $0 <domain> <email>"
        log_error "Example: $0 yourdomain.com admin@yourdomain.com"
        exit 1
    fi
    
    log_info "Domain: $DOMAIN"
    log_info "Email: $EMAIL"
    echo
    
    # Confirmation
    read -p "Continue with SSL setup? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "SSL setup cancelled"
        exit 0
    fi
    
    # Run setup steps
    check_root
    install_dependencies
    validate_domain
    setup_webroot
    create_temp_nginx_config
    obtain_certificate
    setup_certificates
    setup_renewal
    update_nginx_config
    
    if validate_ssl; then
        log_info "✅ SSL setup completed successfully!"
        echo
        log_info "Next steps:"
        log_info "1. Update your .env file with production domain URLs"
        log_info "2. Start production containers: docker-compose -f docker/docker-compose.prod.yml up -d"
        log_info "3. Test HTTPS access: https://$DOMAIN"
        log_info "4. Test Stripe webhooks with production URL"
        echo
        log_info "Certificate files:"
        log_info "- Certificate: $CERT_PATH/fullchain.pem"
        log_info "- Private Key: $CERT_PATH/privkey.pem"
        log_info "- Auto-renewal: Configured (daily at 3 AM)"
    else
        log_error "❌ SSL setup failed. Please check the errors above."
        exit 1
    fi
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
