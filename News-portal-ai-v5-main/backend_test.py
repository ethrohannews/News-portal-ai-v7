#!/usr/bin/env python3
"""
Bengali News Portal API Testing Suite
Tests all backend API endpoints and functionality
"""

import requests
import sys
import json
import time
from datetime import datetime
import base64

class BengaliNewsAPITester:
    def __init__(self, base_url="https://admin-panel-bug-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_auth = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, message="", response_data=None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED - {message}")
        else:
            print(f"❌ {name}: FAILED - {message}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "message": message,
            "response_data": response_data
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.admin_auth and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Basic {self.admin_auth}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            
            try:
                response_json = response.json()
                print(f"   Response: {json.dumps(response_json, indent=2, ensure_ascii=False)[:200]}...")
            except:
                response_json = {"raw_response": response.text[:200]}
                print(f"   Response (text): {response.text[:200]}...")

            if success:
                self.log_test(name, True, f"Status: {response.status_code}", response_json)
                return True, response_json
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}", response_json)
                return False, response_json

        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            print(f"   Error: {error_msg}")
            self.log_test(name, False, error_msg)
            return False, {}

    def test_basic_endpoints(self):
        """Test basic API endpoints"""
        print("\n" + "="*60)
        print("TESTING BASIC ENDPOINTS")
        print("="*60)
        
        # Test root endpoint
        self.run_test("Root API Endpoint", "GET", "api/", 200)
        
        # Test categories endpoint
        success, response = self.run_test("Categories Endpoint", "GET", "api/categories", 200)
        if success and 'categories' in response:
            print(f"   Found categories: {response['categories']}")

    def test_admin_authentication(self):
        """Test admin authentication"""
        print("\n" + "="*60)
        print("TESTING ADMIN AUTHENTICATION")
        print("="*60)
        
        # Test with correct credentials
        credentials = base64.b64encode(b"admin:admin123").decode('ascii')
        headers = {'Authorization': f'Basic {credentials}'}
        
        success, response = self.run_test(
            "Admin Login (Correct Credentials)", 
            "GET", 
            "api/admin/settings", 
            200, 
            headers=headers
        )
        
        if success:
            self.admin_auth = credentials
            print(f"   Admin authenticated successfully")
        
        # Test with wrong credentials
        wrong_credentials = base64.b64encode(b"admin:wrongpass").decode('ascii')
        wrong_headers = {'Authorization': f'Basic {wrong_credentials}'}
        
        self.run_test(
            "Admin Login (Wrong Credentials)", 
            "GET", 
            "api/admin/settings", 
            401, 
            headers=wrong_headers
        )

    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        if not self.admin_auth:
            print("\n❌ Skipping admin tests - authentication failed")
            return
            
        print("\n" + "="*60)
        print("TESTING ADMIN ENDPOINTS")
        print("="*60)
        
        # Test admin stats
        self.run_test("Admin Stats", "GET", "api/admin/stats", 200)
        
        # Test admin settings
        self.run_test("Admin Settings", "GET", "api/admin/settings", 200)
        
        # Test update admin settings
        settings_data = {
            "auto_news_enabled": True,
            "breaking_news_interval": 15,
            "auto_breaking_news": True
        }
        self.run_test("Update Admin Settings", "PUT", "api/admin/settings", 200, settings_data)

    def test_news_endpoints(self):
        """Test news-related endpoints"""
        print("\n" + "="*60)
        print("TESTING NEWS ENDPOINTS")
        print("="*60)
        
        # Test get all news
        success, response = self.run_test("Get All News", "GET", "api/news", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} news articles")
        
        # Test get news with category filter
        self.run_test("Get News by Category", "GET", "api/news?category=প্রযুক্তি", 200)
        
        # Test get featured news
        self.run_test("Get Featured News", "GET", "api/news?featured=true", 200)
        
        # Test get breaking news
        self.run_test("Get Breaking News", "GET", "api/breaking-news", 200)
        
        # Test breaking news ticker
        self.run_test("Breaking News Ticker", "GET", "api/breaking-news/latest", 200)
        
        # Test news stats
        self.run_test("News Statistics", "GET", "api/news/stats/overview", 200)

    def test_manual_news_creation(self):
        """Test manual news creation"""
        if not self.admin_auth:
            print("\n❌ Skipping manual news creation - admin auth required")
            return
            
        print("\n" + "="*60)
        print("TESTING MANUAL NEWS CREATION")
        print("="*60)
        
        # Create test news article
        test_article = {
            "title": "টেস্ট সংবাদ - API পরীক্ষা",
            "content": "এটি একটি টেস্ট সংবাদ যা API পরীক্ষার জন্য তৈরি করা হয়েছে। এই সংবাদটি স্বয়ংক্রিয়ভাবে তৈরি হয়েছে।",
            "summary": "API পরীক্ষার জন্য তৈরি টেস্ট সংবাদ",
            "category": "প্রযুক্তি",
            "author": "টেস্ট রিপোর্টার",
            "is_featured": False,
            "is_breaking": False
        }
        
        success, response = self.run_test(
            "Create Manual News", 
            "POST", 
            "api/news", 
            200, 
            test_article
        )
        
        if success and 'id' in response:
            article_id = response['id']
            print(f"   Created article with ID: {article_id}")
            
            # Test get specific article
            self.run_test(f"Get Article by ID", "GET", f"api/news/{article_id}", 200)
            
            # Test toggle featured status
            self.run_test("Toggle Featured Status", "PUT", f"api/news/{article_id}/featured", 200)
            
            # Test toggle breaking status
            self.run_test("Toggle Breaking Status", "PUT", f"api/news/{article_id}/breaking", 200)

    def test_ai_news_generation(self):
        """Test AI news generation - Critical Feature"""
        if not self.admin_auth:
            print("\n❌ Skipping AI news generation - admin auth required")
            return
            
        print("\n" + "="*60)
        print("TESTING AI NEWS GENERATION (CRITICAL FEATURE)")
        print("="*60)
        
        # Test single category news generation
        generation_request = {
            "category": "প্রযুক্তি",
            "count": 2
        }
        
        print("⏳ Generating AI news (this may take 30-60 seconds)...")
        success, response = self.run_test(
            "AI News Generation (Single Category)", 
            "POST", 
            "api/news/generate", 
            200, 
            generation_request
        )
        
        if success:
            print("   AI news generation successful!")
            if 'articles' in response:
                print(f"   Generated {len(response['articles'])} articles")
        else:
            print("   ❌ AI news generation failed - this is a critical issue!")
        
        # Test admin generate all categories (smaller test)
        print("\n⏳ Testing generate all categories (this may take 2-3 minutes)...")
        success, response = self.run_test(
            "AI Generate All Categories", 
            "POST", 
            "api/admin/generate-all-categories", 
            200
        )
        
        if success:
            print("   All categories generation successful!")
            if 'total_generated' in response:
                print(f"   Generated {response['total_generated']} total articles")

    def test_breaking_news_features(self):
        """Test breaking news functionality"""
        if not self.admin_auth:
            print("\n❌ Skipping breaking news tests - admin auth required")
            return
            
        print("\n" + "="*60)
        print("TESTING BREAKING NEWS FEATURES")
        print("="*60)
        
        # Test manual breaking news fetch
        print("⏳ Fetching breaking news from external sources...")
        self.run_test("Force Breaking News Fetch", "POST", "api/admin/force-breaking-news", 200)
        
        # Test public breaking news fetch
        self.run_test("Public Breaking News Fetch", "POST", "api/breaking-news/fetch", 200)

    def test_admin_management(self):
        """Test admin management features"""
        if not self.admin_auth:
            print("\n❌ Skipping admin management tests - admin auth required")
            return
            
        print("\n" + "="*60)
        print("TESTING ADMIN MANAGEMENT")
        print("="*60)
        
        # Test create test news via admin
        test_news = {
            "title": "অ্যাডমিন টেস্ট সংবাদ",
            "content": "এটি অ্যাডমিন প্যানেল থেকে তৈরি একটি টেস্ট সংবাদ।",
            "summary": "অ্যাডমিন প্যানেল টেস্ট",
            "category": "রাজনীতি",
            "author": "অ্যাডমিন টেস্টার",
            "is_featured": True,
            "is_breaking": False
        }
        
        self.run_test("Admin Create Test News", "POST", "api/admin/test-news", 200, test_news)
        
        # Test clear test data
        self.run_test("Clear Test Data", "DELETE", "api/admin/clear-test-data", 200)

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Bengali News Portal API Testing Suite")
        print(f"🌐 Testing against: {self.base_url}")
        print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run tests in logical order
        self.test_basic_endpoints()
        self.test_admin_authentication()
        self.test_admin_endpoints()
        self.test_news_endpoints()
        self.test_manual_news_creation()
        self.test_ai_news_generation()  # Critical feature
        self.test_breaking_news_features()
        self.test_admin_management()
        
        # Print final results
        self.print_final_results()

    def print_final_results(self):
        """Print comprehensive test results"""
        print("\n" + "="*80)
        print("FINAL TEST RESULTS")
        print("="*80)
        
        print(f"📊 Tests Run: {self.tests_run}")
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📈 Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['name']}: {test['message']}")
        
        # Show critical issues
        critical_failures = [test for test in failed_tests if 'AI' in test['name'] or 'Generate' in test['name']]
        if critical_failures:
            print(f"\n🚨 CRITICAL FAILURES ({len(critical_failures)}):")
            for test in critical_failures:
                print(f"   • {test['name']}: {test['message']}")
        
        print(f"\n⏰ Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Return exit code
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    """Main test execution"""
    tester = BengaliNewsAPITester()
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)

if __name__ == "__main__":
    main()