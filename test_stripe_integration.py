#!/usr/bin/env python3
"""
Stripe Integration Testing Script
================================

This script performs comprehensive testing of the Stripe payment integration
in the Django-React-Docker-DB application.

Features:
- Environment validation
- API endpoint testing
- Payment flow simulation
- Webhook testing
- Security validation
- Performance testing

Usage:
    python test_stripe_integration.py
    python test_stripe_integration.py --full  # Run all tests including performance
    python test_stripe_integration.py --env prod  # Test production environment
"""

import os
import sys
import json
import time
import argparse
import requests
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class StripeIntegrationTester:
    """Comprehensive Stripe integration testing suite."""
    
    def __init__(self, environment: str = "dev"):
        self.environment = environment
        self.project_root = Path(__file__).parent
        self.base_url = self._get_base_url()
        self.stripe_config = self._load_stripe_config()
        self.test_results: List[Dict] = []
        
    def _get_base_url(self) -> str:
        """Get base URL based on environment."""
        if self.environment == "prod":
            return "https://api.yourdomain.com"  # Replace with actual production URL
        return "http://localhost:8000"
    
    def _load_stripe_config(self) -> Dict:
        """Load Stripe configuration from environment."""
        config = {}
        env_file = self.project_root / "docker" / ".env"
        
        if env_file.exists():
            with open(env_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if '=' in line and not line.strip().startswith('#'):
                        key, value = line.strip().split('=', 1)
                        config[key] = value
        
        return config
    
    def log_test(self, test_name: str, status: str, message: str, details: Optional[Dict] = None):
        """Log test result."""
        result = {
            'test': test_name,
            'status': status,
            'message': message,
            'timestamp': time.time(),
            'details': details or {}
        }
        self.test_results.append(result)
        
        status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_icon} {test_name}: {message}")
        
        if details and status != "PASS":
            for key, value in details.items():
                print(f"    {key}: {value}")
    
    def test_environment_variables(self) -> bool:
        """Test that all required environment variables are set correctly."""
        print("\n🔍 Testing Environment Variables...")
        
        required_vars = [
            'STRIPE_PUBLISHABLE_KEY',
            'STRIPE_SECRET_KEY',
            'STRIPE_ENVIRONMENT',
            'REACT_APP_STRIPE_PUBLISHABLE_KEY'
        ]
        
        all_passed = True
        
        for var in required_vars:
            value = self.stripe_config.get(var, '')
            
            if not value:
                self.log_test(f"Env Variable: {var}", "FAIL", "Not set")
                all_passed = False
            elif 'your_stripe' in value or 'placeholder' in value.lower():
                self.log_test(f"Env Variable: {var}", "FAIL", "Contains placeholder value")
                all_passed = False
            else:
                self.log_test(f"Env Variable: {var}", "PASS", "Properly configured")
        
        # Test key format validation
        pub_key = self.stripe_config.get('STRIPE_PUBLISHABLE_KEY', '')
        if pub_key:
            expected_prefix = 'pk_live_' if self.environment == 'prod' else 'pk_test_'
            if pub_key.startswith(expected_prefix):
                self.log_test("Publishable Key Format", "PASS", f"Correct format for {self.environment}")
            else:
                self.log_test("Publishable Key Format", "WARN", f"Expected {expected_prefix} prefix")
        
        secret_key = self.stripe_config.get('STRIPE_SECRET_KEY', '')
        if secret_key:
            expected_prefix = 'sk_live_' if self.environment == 'prod' else 'sk_test_'
            if secret_key.startswith(expected_prefix):
                self.log_test("Secret Key Format", "PASS", f"Correct format for {self.environment}")
            else:
                self.log_test("Secret Key Format", "WARN", f"Expected {expected_prefix} prefix")
        
        return all_passed
    
    def test_api_endpoints(self) -> bool:
        """Test Stripe API endpoints accessibility."""
        print("\n🌐 Testing API Endpoints...")
        
        endpoints = [
            ('/api/payments/stripe/config/', 'GET', 'Stripe Configuration'),
            ('/api/payments/stripe/create-payment-intent/', 'POST', 'Create Payment Intent'),
            ('/api/payments/stripe/webhook/', 'POST', 'Stripe Webhook'),
        ]
        
        all_passed = True
        
        for endpoint, method, description in endpoints:
            try:
                url = f"{self.base_url}{endpoint}"
                
                if method == 'GET':
                    response = requests.get(url, timeout=10)
                else:
                    # For POST endpoints, send minimal test data
                    test_data = {}
                    if 'payment-intent' in endpoint:
                        test_data = {'amount': 1000, 'currency': 'eur'}
                    
                    response = requests.post(url, json=test_data, timeout=10)
                
                if response.status_code == 200:
                    self.log_test(f"API Endpoint: {description}", "PASS", f"Accessible ({response.status_code})")
                elif response.status_code in [401, 403]:
                    self.log_test(f"API Endpoint: {description}", "WARN", f"Authentication required ({response.status_code})")
                elif response.status_code == 404:
                    self.log_test(f"API Endpoint: {description}", "FAIL", f"Not found ({response.status_code})")
                    all_passed = False
                else:
                    self.log_test(f"API Endpoint: {description}", "WARN", f"Unexpected status ({response.status_code})")
                    
            except requests.exceptions.ConnectionError:
                self.log_test(f"API Endpoint: {description}", "FAIL", "Connection refused - server not running")
                all_passed = False
            except requests.exceptions.Timeout:
                self.log_test(f"API Endpoint: {description}", "FAIL", "Request timeout")
                all_passed = False
            except Exception as e:
                self.log_test(f"API Endpoint: {description}", "FAIL", f"Error: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def test_stripe_payment_flow(self) -> bool:
        """Test complete Stripe payment flow simulation."""
        print("\n💳 Testing Stripe Payment Flow...")
        
        # Test data for payment simulation
        test_payment = {
            'amount': 2000,  # €20.00
            'currency': 'eur',
            'metadata': {
                'test': 'true',
                'integration_test': 'stripe_payment_flow'
            }
        }
        
        try:
            # Step 1: Create Payment Intent
            url = f"{self.base_url}/api/payments/stripe/create-payment-intent/"
            response = requests.post(url, json=test_payment, timeout=15)
            
            if response.status_code == 200:
                payment_data = response.json()
                if 'client_secret' in payment_data:
                    self.log_test("Payment Intent Creation", "PASS", "Successfully created payment intent")
                    
                    # Step 2: Validate Payment Intent structure
                    required_fields = ['client_secret', 'amount', 'currency']
                    missing_fields = [field for field in required_fields if field not in payment_data]
                    
                    if not missing_fields:
                        self.log_test("Payment Intent Structure", "PASS", "All required fields present")
                    else:
                        self.log_test("Payment Intent Structure", "FAIL", f"Missing fields: {missing_fields}")
                        return False
                    
                    # Step 3: Validate amount and currency
                    if payment_data.get('amount') == test_payment['amount']:
                        self.log_test("Payment Amount Validation", "PASS", "Amount matches request")
                    else:
                        self.log_test("Payment Amount Validation", "FAIL", "Amount mismatch")
                    
                    if payment_data.get('currency') == test_payment['currency']:
                        self.log_test("Payment Currency Validation", "PASS", "Currency matches request")
                    else:
                        self.log_test("Payment Currency Validation", "FAIL", "Currency mismatch")
                    
                    return True
                else:
                    self.log_test("Payment Intent Creation", "FAIL", "No client_secret in response")
                    return False
            else:
                self.log_test("Payment Intent Creation", "FAIL", f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Payment Flow Test", "FAIL", f"Exception: {str(e)}")
            return False
    
    def test_webhook_endpoint(self) -> bool:
        """Test Stripe webhook endpoint."""
        print("\n🪝 Testing Webhook Endpoint...")
        
        # Simulate a Stripe webhook payload
        webhook_payload = {
            'id': 'evt_test_integration',
            'object': 'event',
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test_integration',
                    'amount': 2000,
                    'currency': 'eur',
                    'status': 'succeeded'
                }
            },
            'created': int(time.time()),
            'livemode': False
        }
        
        try:
            url = f"{self.base_url}/api/payments/stripe/webhook/"
            headers = {
                'Content-Type': 'application/json',
                'Stripe-Signature': 'test_signature'  # This would be invalid but tests endpoint accessibility
            }
            
            response = requests.post(url, json=webhook_payload, headers=headers, timeout=10)
            
            # Webhook endpoint should be accessible, even if signature validation fails
            if response.status_code in [200, 400, 401]:
                self.log_test("Webhook Endpoint", "PASS", f"Endpoint accessible ({response.status_code})")
                return True
            else:
                self.log_test("Webhook Endpoint", "FAIL", f"Unexpected status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Webhook Endpoint", "FAIL", f"Exception: {str(e)}")
            return False
    
    def test_security_configuration(self) -> bool:
        """Test security-related configuration."""
        print("\n🔒 Testing Security Configuration...")
        
        all_passed = True
        
        # Test HTTPS in production
        if self.environment == "prod":
            if self.base_url.startswith('https://'):
                self.log_test("HTTPS Configuration", "PASS", "Using HTTPS in production")
            else:
                self.log_test("HTTPS Configuration", "FAIL", "Production should use HTTPS")
                all_passed = False
        
        # Test webhook secret configuration
        webhook_secret = self.stripe_config.get('STRIPE_WEBHOOK_SECRET', '')
        if webhook_secret and not webhook_secret.startswith('whsec_'):
            self.log_test("Webhook Secret Format", "FAIL", "Invalid webhook secret format")
            all_passed = False
        elif webhook_secret and 'your_webhook_secret_here' in webhook_secret:
            self.log_test("Webhook Secret Format", "WARN", "Using placeholder webhook secret")
        elif webhook_secret:
            self.log_test("Webhook Secret Format", "PASS", "Webhook secret properly configured")
        
        # Test environment consistency
        stripe_env = self.stripe_config.get('STRIPE_ENVIRONMENT', '')
        if self.environment == "prod" and stripe_env != "live":
            self.log_test("Environment Consistency", "FAIL", "Production should use live Stripe environment")
            all_passed = False
        elif self.environment == "dev" and stripe_env not in ["test", "dev"]:
            self.log_test("Environment Consistency", "WARN", "Development should use test Stripe environment")
        else:
            self.log_test("Environment Consistency", "PASS", "Environment configuration consistent")
        
        return all_passed
    
    def test_performance(self) -> bool:
        """Test performance of Stripe integration."""
        print("\n⚡ Testing Performance...")
        
        # Test API response times
        endpoints_to_test = [
            '/api/payments/stripe/config/',
        ]
        
        all_passed = True
        
        for endpoint in endpoints_to_test:
            try:
                url = f"{self.base_url}{endpoint}"
                start_time = time.time()
                response = requests.get(url, timeout=5)
                end_time = time.time()
                
                response_time = (end_time - start_time) * 1000  # Convert to milliseconds
                
                if response_time < 500:  # 500ms threshold
                    self.log_test(f"Response Time: {endpoint}", "PASS", f"{response_time:.0f}ms")
                elif response_time < 1000:  # 1s threshold
                    self.log_test(f"Response Time: {endpoint}", "WARN", f"{response_time:.0f}ms (slow)")
                else:
                    self.log_test(f"Response Time: {endpoint}", "FAIL", f"{response_time:.0f}ms (too slow)")
                    all_passed = False
                    
            except Exception as e:
                self.log_test(f"Performance Test: {endpoint}", "FAIL", f"Error: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def generate_report(self) -> str:
        """Generate comprehensive test report."""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['status'] == 'PASS'])
        failed_tests = len([r for r in self.test_results if r['status'] == 'FAIL'])
        warned_tests = len([r for r in self.test_results if r['status'] == 'WARN'])
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        report = f"""
🧪 STRIPE INTEGRATION TEST REPORT
==================================
Environment: {self.environment.upper()}
Base URL: {self.base_url}
Test Date: {time.strftime('%Y-%m-%d %H:%M:%S')}

📊 SUMMARY
-----------
Total Tests: {total_tests}
Passed: {passed_tests} ✅
Failed: {failed_tests} ❌
Warnings: {warned_tests} ⚠️
Success Rate: {success_rate:.1f}%

📋 DETAILED RESULTS
------------------
"""
        
        for result in self.test_results:
            status_icon = "✅" if result['status'] == "PASS" else "❌" if result['status'] == "FAIL" else "⚠️"
            report += f"{status_icon} {result['test']}: {result['message']}\n"
        
        if failed_tests > 0:
            report += "\n❌ FAILED TESTS REQUIRE ATTENTION\n"
            report += "Please fix the failed tests before deploying to production.\n"
        
        if warned_tests > 0:
            report += "\n⚠️  WARNINGS SHOULD BE REVIEWED\n"
            report += "Warnings indicate potential issues that should be addressed.\n"
        
        if success_rate == 100:
            report += "\n🎉 ALL TESTS PASSED! Your Stripe integration is ready.\n"
        
        report += "\n📖 For detailed setup instructions, see STRIPE_SETUP_GUIDE.md\n"
        
        return report
    
    def run_all_tests(self, include_performance: bool = False) -> bool:
        """Run all integration tests."""
        print(f"🚀 Starting Stripe Integration Tests ({self.environment.upper()} environment)")
        print("=" * 60)
        
        tests_passed = []
        
        # Core functionality tests
        tests_passed.append(self.test_environment_variables())
        tests_passed.append(self.test_api_endpoints())
        tests_passed.append(self.test_stripe_payment_flow())
        tests_passed.append(self.test_webhook_endpoint())
        tests_passed.append(self.test_security_configuration())
        
        # Optional performance tests
        if include_performance:
            tests_passed.append(self.test_performance())
        
        # Generate and display report
        report = self.generate_report()
        print(report)
        
        # Save report to file
        report_file = self.project_root / f"stripe_test_report_{self.environment}_{int(time.time())}.txt"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"📄 Test report saved to: {report_file}")
        
        return all(tests_passed)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Test Stripe integration')
    parser.add_argument('--env', choices=['dev', 'prod'], default='dev',
                       help='Environment to test (default: dev)')
    parser.add_argument('--full', action='store_true',
                       help='Run all tests including performance tests')
    
    args = parser.parse_args()
    
    tester = StripeIntegrationTester(environment=args.env)
    
    try:
        success = tester.run_all_tests(include_performance=args.full)
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n🛑 Tests cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
