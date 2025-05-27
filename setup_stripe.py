#!/usr/bin/env python3
"""
Stripe Integration Quick Setup Script

This script helps quickly set up the Stripe payment integration
by updating environment files with proper configuration.
"""

import os
import sys
from pathlib import Path

def get_stripe_credentials():
    """Get Stripe credentials from user input"""
    print("🔑 Stripe Credentials Setup")
    print("=" * 40)
    print("\nPlease provide your Stripe credentials.")
    print("You can find these in your Stripe Dashboard > Developers > API keys")
    print()
    
    credentials = {}
    
    # Publishable Key
    while True:
        pk = input("📝 Stripe Publishable Key (starts with pk_test_ or pk_live_): ").strip()
        if pk.startswith(('pk_test_', 'pk_live_')):
            credentials['STRIPE_PUBLISHABLE_KEY'] = pk
            credentials['REACT_APP_STRIPE_PUBLISHABLE_KEY'] = pk
            break
        else:
            print("❌ Invalid publishable key format. Please try again.")
    
    # Secret Key
    while True:
        sk = input("🔐 Stripe Secret Key (starts with sk_test_ or sk_live_): ").strip()
        if sk.startswith(('sk_test_', 'sk_live_')):
            credentials['STRIPE_SECRET_KEY'] = sk
            break
        else:
            print("❌ Invalid secret key format. Please try again.")
    
    # Webhook Secret (optional)
    webhook_secret = input("🔗 Stripe Webhook Secret (optional, starts with whsec_): ").strip()
    if webhook_secret:
        if webhook_secret.startswith('whsec_'):
            credentials['STRIPE_WEBHOOK_SECRET'] = webhook_secret
        else:
            print("⚠️ Invalid webhook secret format, skipping...")
    else:
        credentials['STRIPE_WEBHOOK_SECRET'] = 'whsec_your_webhook_secret_here'
    
    # Environment
    environment = 'test' if pk.startswith('pk_test_') else 'live'
    credentials['STRIPE_ENVIRONMENT'] = environment
    credentials['STRIPE_API_VERSION'] = '2023-10-16'
    
    print(f"\n✅ Credentials configured for {environment} environment")
    return credentials

def update_env_file(file_path, credentials):
    """Update an environment file with Stripe credentials"""
    print(f"\n📝 Updating {file_path}...")
    
    try:
        # Read existing file
        if Path(file_path).exists():
            with open(file_path, 'r') as f:
                lines = f.readlines()
        else:
            lines = []
        
        # Update or add Stripe configuration
        stripe_section_start = None
        stripe_section_end = None
        
        for i, line in enumerate(lines):
            if '# Configuración Stripe' in line or '# Stripe Configuration' in line:
                stripe_section_start = i
            elif stripe_section_start is not None and line.strip() == '' and lines[i-1].startswith(('STRIPE_', 'REACT_APP_STRIPE_')):
                stripe_section_end = i
                break
            elif stripe_section_start is not None and line.startswith('#') and not line.startswith(('STRIPE_', 'REACT_APP_STRIPE_')):
                stripe_section_end = i
                break
        
        # Remove existing Stripe configuration
        if stripe_section_start is not None:
            if stripe_section_end is not None:
                del lines[stripe_section_start:stripe_section_end]
            else:
                # Remove from start to end of file
                lines = lines[:stripe_section_start]
        
        # Add new Stripe configuration
        stripe_config = [
            "\n# Configuración Stripe\n",
            f"STRIPE_PUBLISHABLE_KEY={credentials['STRIPE_PUBLISHABLE_KEY']}\n",
            f"STRIPE_SECRET_KEY={credentials['STRIPE_SECRET_KEY']}\n",
            f"STRIPE_WEBHOOK_SECRET={credentials['STRIPE_WEBHOOK_SECRET']}\n",
            f"STRIPE_ENVIRONMENT={credentials['STRIPE_ENVIRONMENT']}\n",
            f"STRIPE_API_VERSION={credentials['STRIPE_API_VERSION']}\n"
        ]
        
        # Add React-specific variables for .env.dev
        if '.env.dev' in str(file_path):
            stripe_config.append(f"REACT_APP_STRIPE_PUBLISHABLE_KEY={credentials['REACT_APP_STRIPE_PUBLISHABLE_KEY']}\n")
        
        # Insert before the last section or at the end
        insert_position = len(lines)
        for i, line in enumerate(lines):
            if line.startswith('#') and ('URL' in line or '.env' in line):
                insert_position = i
                break
        
        lines[insert_position:insert_position] = stripe_config
        
        # Write updated file
        with open(file_path, 'w') as f:
            f.writelines(lines)
        
        print(f"✅ Successfully updated {file_path}")
        
    except Exception as e:
        print(f"❌ Error updating {file_path}: {e}")
        return False
    
    return True

def create_env_files_if_missing():
    """Create environment files if they don't exist"""
    env_files = [
        'docker/.env',
        'docker/.env.dev'
    ]
    
    for env_file in env_files:
        if not Path(env_file).exists():
            print(f"📁 Creating {env_file}...")
            
            # Create directory if it doesn't exist
            Path(env_file).parent.mkdir(parents=True, exist_ok=True)
            
            # Create basic environment file
            basic_content = [
                "# Configuración Redsys\n",
                "REDSYS_MERCHANT_CODE=999008881\n",
                "REDSYS_TERMINAL=001\n", 
                "REDSYS_SECRET_KEY=sq7HjrUOBfKmC576ILgskD5srU870gJ7\n",
                "REDSYS_ENVIRONMENT=test\n",
                "\n",
                "# URLs\n"
            ]
            
            if '.env.dev' in env_file:
                basic_content.extend([
                    "REACT_APP_API_URL=http://localhost/api\n",
                    "REACT_APP_BACKEND_URL=http://localhost/api\n",
                    "\n"
                ])
            else:
                basic_content.extend([
                    "FRONTEND_URL=http://localhost:3000\n",
                    "BACKEND_URL=http://localhost:8000\n",
                    "\n"
                ])
            
            basic_content.extend([
                "# .env\n",
                "MYSQL_ROOT_PASSWORD=superseguro\n",
                "MYSQL_DATABASE=mobility4you\n",
                "MYSQL_USER=mobility\n",
                "MYSQL_PASSWORD=miclave\n",
                "SECRET_KEY=claveprivadatemporal\n",
                "ALLOWED_HOST=localhost,127.0.0.1\n"
            ])
            
            with open(env_file, 'w') as f:
                f.writelines(basic_content)
            
            print(f"✅ Created {env_file}")

def validate_setup():
    """Run basic validation after setup"""
    print("\n🔍 Validating setup...")
    
    required_files = [
        'docker/.env',
        'docker/.env.dev',
        'backend/payments/services.py',
        'frontend/src/services/stripePayementServices.js'
    ]
    
    all_good = True
    
    for file_path in required_files:
        if Path(file_path).exists():
            print(f"✅ {file_path} exists")
        else:
            print(f"❌ {file_path} missing")
            all_good = False
    
    return all_good

def display_next_steps():
    """Display next steps after setup"""
    print("\n🎉 Stripe Integration Setup Complete!")
    print("=" * 50)
    print("\n📋 Next Steps:")
    print("1. Start your Docker containers:")
    print("   cd docker")
    print("   docker-compose up -d")
    print()
    print("2. Run database migrations:")
    print("   docker-compose exec backend python manage.py migrate")
    print()
    print("3. Test the integration:")
    print("   python validate_stripe_integration.py")
    print()
    print("4. Access your application:")
    print("   Frontend: http://localhost:3000")
    print("   Backend: http://localhost:8000")
    print()
    print("5. Set up webhooks in Stripe Dashboard:")
    print("   URL: http://localhost:8000/api/payments/stripe/webhook/")
    print("   Events: payment_intent.succeeded, payment_intent.payment_failed")
    print()
    print("📖 For detailed documentation, see STRIPE_SETUP_GUIDE.md")

def main():
    """Main setup function"""
    print("🚀 Stripe Integration Quick Setup")
    print("=" * 40)
    print("\nThis script will help you set up Stripe payment integration")
    print("for the Mobility4You application.")
    print()
    
    # Change to project root directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Check if we're in the right directory
    if not Path('backend').exists() or not Path('frontend').exists():
        print("❌ Error: This script must be run from the project root directory.")
        print("Please make sure you're in the Movility-for-you directory.")
        return 1
    
    try:
        # Create environment files if missing
        create_env_files_if_missing()
        
        # Get Stripe credentials
        credentials = get_stripe_credentials()
        
        # Update environment files
        env_files = ['docker/.env', 'docker/.env.dev']
        for env_file in env_files:
            update_env_file(env_file, credentials)
        
        # Validate setup
        if validate_setup():
            display_next_steps()
            return 0
        else:
            print("\n❌ Setup validation failed. Please check the errors above.")
            return 1
            
    except KeyboardInterrupt:
        print("\n\n❌ Setup cancelled by user.")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
