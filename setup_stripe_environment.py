#!/usr/bin/env python3
"""
Stripe Environment Setup Script
==============================

This script helps configure Stripe environment variables properly for the Django-React-Docker-DB application.
It provides validation, secure key handling, and automatic environment file updates.

Usage:
    python setup_stripe_environment.py

Prerequisites:
    - Stripe account with test/live API keys
    - Access to Stripe Dashboard for webhook configuration
"""

import os
import re
import sys
import json
import getpass
from pathlib import Path


class StripeEnvironmentSetup:
    """Handles Stripe environment configuration for the application."""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.env_file = self.project_root / "docker" / ".env"
        self.env_dev_file = self.project_root / "docker" / ".env.dev"
        
    def validate_stripe_key(self, key_type, key_value):
        """Validate Stripe API key format."""
        patterns = {
            'publishable': r'^pk_(test_|live_)[a-zA-Z0-9]{24,}$',
            'secret': r'^sk_(test_|live_)[a-zA-Z0-9]{24,}$',
            'webhook': r'^whsec_[a-zA-Z0-9]{20,}$'
        }
        
        pattern = patterns.get(key_type)
        if not pattern:
            return False
            
        return bool(re.match(pattern, key_value))
    
    def get_stripe_keys(self):
        """Collect Stripe API keys from user input."""
        print("🔐 Stripe API Keys Configuration")
        print("=" * 50)
        print("Please provide your Stripe API keys. You can find these in your Stripe Dashboard:")
        print("https://dashboard.stripe.com/apikeys")
        print()
        
        keys = {}
        
        # Get environment type
        while True:
            env_type = input("Are you setting up for (t)est or (l)ive environment? [t/l]: ").lower().strip()
            if env_type in ['t', 'test']:
                env_prefix = 'test'
                keys['environment'] = 'test'
                break
            elif env_type in ['l', 'live']:
                env_prefix = 'live'
                keys['environment'] = 'live'
                print("⚠️  WARNING: You're configuring LIVE environment. Be extra careful!")
                break
            else:
                print("Please enter 't' for test or 'l' for live environment.")
        
        # Get publishable key
        while True:
            pub_key = input(f"Enter your Stripe {env_prefix} publishable key (pk_{env_prefix}_...): ").strip()
            if self.validate_stripe_key('publishable', pub_key):
                keys['publishable'] = pub_key
                break
            else:
                print(f"❌ Invalid publishable key format. Should start with 'pk_{env_prefix}_'")
        
        # Get secret key
        while True:
            secret_key = getpass.getpass(f"Enter your Stripe {env_prefix} secret key (sk_{env_prefix}_...): ").strip()
            if self.validate_stripe_key('secret', secret_key):
                keys['secret'] = secret_key
                break
            else:
                print(f"❌ Invalid secret key format. Should start with 'sk_{env_prefix}_'")
        
        # Get webhook secret (optional for initial setup)
        print("\n📡 Webhook Configuration")
        print("Webhook secret is optional for initial testing but required for production.")
        webhook_secret = input("Enter your Stripe webhook secret (whsec_...) or press Enter to skip: ").strip()
        
        if webhook_secret:
            if self.validate_stripe_key('webhook', webhook_secret):
                keys['webhook'] = webhook_secret
            else:
                print("⚠️  Invalid webhook secret format. Skipping for now.")
                keys['webhook'] = 'whsec_your_webhook_secret_here'
        else:
            keys['webhook'] = 'whsec_your_webhook_secret_here'
        
        return keys
    
    def update_env_file(self, file_path, stripe_keys):
        """Update environment file with new Stripe keys."""
        if not file_path.exists():
            print(f"⚠️  Environment file {file_path} not found. Creating new one.")
            content = ""
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        
        # Update Stripe configuration
        updates = {
            'STRIPE_PUBLISHABLE_KEY': stripe_keys['publishable'],
            'STRIPE_SECRET_KEY': stripe_keys['secret'],
            'STRIPE_WEBHOOK_SECRET': stripe_keys['webhook'],
            'STRIPE_ENVIRONMENT': stripe_keys['environment'],
            'STRIPE_API_VERSION': '2023-10-16',
            'REACT_APP_STRIPE_PUBLISHABLE_KEY': stripe_keys['publishable']
        }
        
        for key, value in updates.items():
            pattern = f"{key}=.*"
            replacement = f"{key}={value}"
            
            if re.search(f"^{key}=", content, re.MULTILINE):
                content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
            else:
                # Add new key if not found
                if "# Configuración Stripe" in content:
                    content = content.replace(
                        "# Configuración Stripe", 
                        f"# Configuración Stripe\n{replacement}"
                    )
                else:
                    content += f"\n# Configuración Stripe\n{replacement}\n"
        
        # Write updated content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ Updated {file_path}")
    
    def create_webhook_guide(self):
        """Create a guide for setting up Stripe webhooks."""
        webhook_guide = """
# Stripe Webhook Setup Guide

## Production Webhook Configuration

### 1. Create Webhook Endpoint in Stripe Dashboard
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Set endpoint URL to: `https://yourdomain.com/api/payments/stripe/webhook/`
4. Select events to listen for:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - payment_intent.canceled
   - invoice.payment_succeeded
   - invoice.payment_failed

### 2. Get Webhook Secret
1. After creating the webhook, click on it
2. Go to "Signing secret" section
3. Click "Reveal" to see your webhook secret
4. Update your environment variable: `STRIPE_WEBHOOK_SECRET=whsec_...`

### 3. Test Webhook
Use Stripe CLI to test webhooks locally:
```bash
stripe listen --forward-to localhost:8000/api/payments/stripe/webhook/
```

### 4. Production SSL Configuration
Ensure your production server has:
- Valid SSL certificate
- HTTPS enabled
- Proper firewall configuration to allow Stripe webhook IPs

## Webhook Events Handled by This Application
- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed
- `payment_intent.canceled` - Payment was canceled
- `invoice.payment_succeeded` - Subscription payment succeeded
- `invoice.payment_failed` - Subscription payment failed

For more information, see the Stripe webhook documentation:
https://stripe.com/docs/webhooks
"""
        
        guide_path = self.project_root / "STRIPE_WEBHOOK_SETUP.md"
        with open(guide_path, 'w', encoding='utf-8') as f:
            f.write(webhook_guide)
        
        print(f"📖 Created webhook setup guide: {guide_path}")
    
    def validate_setup(self):
        """Validate the current Stripe setup."""
        print("\n🔍 Validating Stripe setup...")
        
        issues = []
        
        # Check environment files
        for env_file in [self.env_file, self.env_dev_file]:
            if env_file.exists():
                with open(env_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                if 'your_stripe_publishable_key_here' in content:
                    issues.append(f"Placeholder publishable key in {env_file}")
                if 'your_stripe_secret_key_here' in content:
                    issues.append(f"Placeholder secret key in {env_file}")
                if 'your_webhook_secret_here' in content:
                    issues.append(f"Placeholder webhook secret in {env_file}")
        
        if issues:
            print("❌ Found issues:")
            for issue in issues:
                print(f"  - {issue}")
            return False
        else:
            print("✅ Stripe configuration looks good!")
            return True
    
    def run_setup(self):
        """Run the complete Stripe environment setup."""
        print("🚀 Stripe Environment Setup for Django-React-Docker-DB")
        print("=" * 60)
        print()
        
        # Check if this is a fresh setup or update
        needs_setup = False
        for env_file in [self.env_file, self.env_dev_file]:
            if env_file.exists():
                with open(env_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'your_stripe_publishable_key_here' in content:
                        needs_setup = True
                        break
        
        if not needs_setup:
            print("🔍 Existing Stripe configuration found.")
            update = input("Do you want to update your Stripe keys? [y/N]: ").lower().strip()
            if update not in ['y', 'yes']:
                print("Setup cancelled.")
                return
        
        try:
            # Get Stripe keys from user
            stripe_keys = self.get_stripe_keys()
            
            # Update environment files
            print("\n📝 Updating environment files...")
            for env_file in [self.env_file, self.env_dev_file]:
                if env_file.exists() or env_file == self.env_file:
                    self.update_env_file(env_file, stripe_keys)
            
            # Create webhook guide
            self.create_webhook_guide()
            
            # Validate setup
            if self.validate_setup():
                print("\n🎉 Stripe environment setup completed successfully!")
                print("\nNext steps:")
                print("1. Review STRIPE_WEBHOOK_SETUP.md for webhook configuration")
                print("2. Start your Docker containers: docker-compose up -d")
                print("3. Test your Stripe integration with test cards")
                print("4. Run validation: python validate_stripe_integration.py")
            else:
                print("\n⚠️  Setup completed with warnings. Please review the issues above.")
                
        except KeyboardInterrupt:
            print("\n\n🛑 Setup cancelled by user.")
            sys.exit(1)
        except Exception as e:
            print(f"\n❌ Setup failed: {e}")
            sys.exit(1)


def main():
    """Main entry point."""
    setup = StripeEnvironmentSetup()
    setup.run_setup()


if __name__ == "__main__":
    main()
