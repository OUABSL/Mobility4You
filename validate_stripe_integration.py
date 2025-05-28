#!/usr/bin/env python3
"""
Stripe Integration Validation Script

This script validates that all components of the Stripe payment integration
are properly configured and compatible.
"""

import os
import sys
import json
import requests
from pathlib import Path

def check_environment_variables():
    """Check if all required environment variables are set"""
    print("🔍 Checking Environment Variables...")
    
    required_vars = {
        'Backend': [
            'STRIPE_PUBLISHABLE_KEY',
            'STRIPE_SECRET_KEY', 
            'STRIPE_WEBHOOK_SECRET',
            'STRIPE_ENVIRONMENT',
            'STRIPE_API_VERSION'
        ],
        'Frontend': [
            'REACT_APP_STRIPE_PUBLISHABLE_KEY',
            'REACT_APP_API_URL',
            'REACT_APP_BACKEND_URL'
        ]
    }
    
    issues = []
    
    # Check .env file
    env_file = Path('docker/.env')
    if env_file.exists():
        print(f"✅ Found {env_file}")
        with open(env_file, 'r') as f:
            env_content = f.read()
            
        for category, vars_list in required_vars.items():
            for var in vars_list:
                if var in env_content:
                    # Check if it has a real value (not placeholder)
                    if 'your_stripe_' in env_content or 'pk_test_your_' in env_content:
                        issues.append(f"❌ {var} contains placeholder value")
                    else:
                        print(f"✅ {var} is configured")
                else:
                    issues.append(f"❌ {var} missing from .env")
    else:
        issues.append("❌ docker/.env file not found")
    
    # Check .env.dev file
    env_dev_file = Path('docker/.env.dev')
    if env_dev_file.exists():
        print(f"✅ Found {env_dev_file}")
    else:
        issues.append("❌ docker/.env.dev file not found")
    
    return issues

def check_backend_files():
    """Check if all backend Stripe files are present and valid"""
    print("\n🔍 Checking Backend Files...")
    
    required_files = {
        'backend/config/settings.py': ['STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_CONFIG'],
        'backend/payments/services.py': ['StripePaymentService', 'StripeWebhookService'],
        'backend/payments/views.py': ['stripe_config', 'CreatePaymentIntentView', 'StripeWebhookView'],
        'backend/payments/models.py': ['PagoStripe', 'ReembolsoStripe', 'WebhookStripe'],
        'backend/payments/urls.py': ['stripe/'],
    }
    
    issues = []
    
    for file_path, required_content in required_files.items():
        file_obj = Path(file_path)
        if file_obj.exists():
            print(f"✅ Found {file_path}")
            try:
                with open(file_obj, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                for item in required_content:
                    if item in content:
                        print(f"  ✅ {item} found")
                    else:
                        issues.append(f"❌ {item} missing from {file_path}")
            except Exception as e:
                issues.append(f"❌ Error reading {file_path}: {e}")
        else:
            issues.append(f"❌ {file_path} not found")
    
    return issues

def check_frontend_files():
    """Check if all frontend Stripe files are present and valid"""
    print("\n🔍 Checking Frontend Files...")
    
    required_files = {
        'frontend/src/services/stripePaymentServices.js': [
            'initializeStripe',
            'createPaymentIntent', 
            '@stripe/stripe-js'
        ],
        'frontend/src/components/StripePayment/StripePaymentForm.js': [
            'CardElement',
            'Elements',
            'useStripe'
        ],
        'frontend/package.json': [
            '@stripe/stripe-js',
            '@stripe/react-stripe-js'
        ]
    }
    
    issues = []
    
    for file_path, required_content in required_files.items():
        file_obj = Path(file_path)
        if file_obj.exists():
            print(f"✅ Found {file_path}")
            try:
                with open(file_obj, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                for item in required_content:
                    if item in content:
                        print(f"  ✅ {item} found")
                    else:
                        issues.append(f"❌ {item} missing from {file_path}")
            except Exception as e:
                issues.append(f"❌ Error reading {file_path}: {e}")
        else:
            issues.append(f"❌ {file_path} not found")
    
    return issues

def check_docker_configuration():
    """Check Docker Compose configuration"""
    print("\n🔍 Checking Docker Configuration...")
    
    issues = []
    docker_file = Path('docker/docker-compose.yml')
    
    if docker_file.exists():
        print(f"✅ Found {docker_file}")
        try:
            with open(docker_file, 'r') as f:
                content = f.read()
            
            required_env_vars = [
                'STRIPE_PUBLISHABLE_KEY',
                'STRIPE_SECRET_KEY',
                'STRIPE_WEBHOOK_SECRET',
                'REACT_APP_STRIPE_PUBLISHABLE_KEY'
            ]
            
            for var in required_env_vars:
                if var in content:
                    print(f"  ✅ {var} configured in Docker Compose")
                else:
                    issues.append(f"❌ {var} missing from Docker Compose")
                    
        except Exception as e:
            issues.append(f"❌ Error reading docker-compose.yml: {e}")
    else:
        issues.append("❌ docker/docker-compose.yml not found")
    
    return issues

def check_api_endpoints():
    """Check if API endpoints are accessible (if backend is running)"""
    print("\n🔍 Checking API Endpoints...")
    
    endpoints = [
        'http://localhost:8000/api/payments/stripe/config/',
        'http://localhost:8000/api/payments/stripe/create-payment-intent/',
        'http://localhost:8000/api/payments/stripe/webhook/'
    ]
    
    issues = []
    
    for endpoint in endpoints:
        try:
            # Just check if endpoint exists (don't worry about auth for this check)
            response = requests.get(endpoint, timeout=5)
            if response.status_code in [200, 401, 403, 405]:  # Valid responses
                print(f"✅ {endpoint} is accessible")
            else:
                issues.append(f"⚠️ {endpoint} returned status {response.status_code}")
        except requests.exceptions.ConnectionError:
            issues.append(f"⚠️ {endpoint} not accessible (backend may not be running)")
        except requests.exceptions.Timeout:
            issues.append(f"⚠️ {endpoint} timeout")
        except Exception as e:
            issues.append(f"⚠️ Error checking {endpoint}: {e}")
    
    return issues

def generate_report(all_issues):
    """Generate a comprehensive report"""
    print("\n" + "="*60)
    print("📋 STRIPE INTEGRATION VALIDATION REPORT")
    print("="*60)
    
    if not all_issues:
        print("🎉 ALL CHECKS PASSED!")
        print("\nYour Stripe integration appears to be properly configured.")
        print("Next steps:")
        print("1. Add your actual Stripe API keys to the environment files")
        print("2. Test the payment flow with Stripe test cards")
        print("3. Set up webhooks in your Stripe dashboard")
        return True
    else:
        print(f"❌ Found {len(all_issues)} issues that need attention:")
        print()
        
        for issue in all_issues:
            print(f"  {issue}")
        
        print("\n📝 Recommendations:")
        print("1. Fix the issues listed above")
        print("2. Refer to STRIPE_SETUP_GUIDE.md for detailed instructions")
        print("3. Run this script again after making changes")
        return False

def main():
    """Main validation function"""
    print("🚀 Stripe Integration Validation Tool")
    print("=====================================")
    
    # Change to project root directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    all_issues = []
    
    # Run all checks
    all_issues.extend(check_environment_variables())
    all_issues.extend(check_backend_files())
    all_issues.extend(check_frontend_files())
    all_issues.extend(check_docker_configuration())
    all_issues.extend(check_api_endpoints())
    
    # Generate report
    success = generate_report(all_issues)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
