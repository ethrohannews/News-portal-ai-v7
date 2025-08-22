#!/usr/bin/env python3
"""
Bengali News Portal Backend API Testing
Tests all backend endpoints for the Bengali news portal application
"""

import requests
import sys
import json
import base64
from datetime import datetime
import time

class BengaliNewsPortalTester:
    def __init__(self, base_url="https://infostream-7.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_auth = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", response_data=None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def run_api_test(self, name, method, endpoint, expected_status, data=None, headers=None, auth=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        
        # Default headers
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)
        
        # Add auth if provided
        if auth:
            default_headers['Authorization'] = f'Basic {auth}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            else:
                self.log_test(name, False, f"Unsupported method: {method}")
                return False, {}

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                if response.headers.get('content-type', '').startswith('application/json'):
                    response_data = response.json()
                else:
                    response_data = {"content_type": response.headers.get('content-type', 'unknown')}
            except:
                response_data = {"raw_content": str(response.content)[:200]}

            details = f"Status: {response.status_code} (expected {expected_status})"
            if not success:
                details += f", Response: {str(response_data)[:200]}"
            
            self.log_test(name, success, details, response_data)
            return success, response_data

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_basic_endpoints(self):
        """Test basic API endpoints"""
        print("\n🔍 Testing Basic Endpoints...")
        
        # Test root endpoint
        self.run_api_test("Root API", "GET", "", 200)
        
        # Test categories endpoint
        self.run_api_test("Get Categories", "GET", "categories", 200)
        
        # Test news endpoint
        self.run_api_test("Get All News", "GET", "news", 200)
        
        # Test news with category filter
        self.run_api_test("Get News by Category", "GET", "news?category=রাজনীতি", 200)
        
        # Test featured news
        self.run_api_test("Get Featured News", "GET", "news?featured=true", 200)
        
        # Test breaking news
        self.run_api_test("Get Breaking News", "GET", "news?breaking=true", 200)
        
        # Test stats endpoint
        self.run_api_test("Get News Stats", "GET", "news/stats/overview", 200)

    def test_admin_authentication(self):
        """Test admin authentication"""
        print("\n🔐 Testing Admin Authentication...")
        
        # Test with correct credentials
        credentials = base64.b64encode(b"admin:admin123").decode('utf-8')
        success, response_data = self.run_api_test(
            "Admin Login (Correct)", 
            "GET", 
            "admin/settings", 
            200, 
            auth=credentials
        )
        
        if success:
            self.admin_auth = credentials
            print("✅ Admin authentication successful")
        else:
            print("❌ Admin authentication failed")
        
        # Test with wrong credentials
        wrong_credentials = base64.b64encode(b"admin:wrongpass").decode('utf-8')
        self.run_api_test(
            "Admin Login (Wrong)", 
            "GET", 
            "admin/settings", 
            401, 
            auth=wrong_credentials
        )

    def test_admin_settings(self):
        """Test admin settings management"""
        if not self.admin_auth:
            print("❌ Skipping admin settings tests - no authentication")
            return
        
        print("\n⚙️ Testing Admin Settings...")
        
        # Get current settings
        success, settings_data = self.run_api_test(
            "Get Admin Settings", 
            "GET", 
            "admin/settings", 
            200, 
            auth=self.admin_auth
        )
        
        # Update settings
        update_data = {
            "emergent_llm_key": "test-key-12345",
            "auto_news_enabled": True
        }
        
        self.run_api_test(
            "Update Admin Settings", 
            "PUT", 
            "admin/settings", 
            200, 
            data=update_data,
            auth=self.admin_auth
        )

    def test_manual_news_creation(self):
        """Test manual news creation"""
        if not self.admin_auth:
            print("❌ Skipping manual news creation - no authentication")
            return
        
        print("\n📝 Testing Manual News Creation...")
        
        test_news = {
            "title": "টেস্ট সংবাদ - স্বয়ংক্রিয় পরীক্ষা",
            "content": "এটি একটি টেস্ট সংবাদ যা স্বয়ংক্রিয় পরীক্ষার জন্য তৈরি করা হয়েছে। এই সংবাদটি বাংলা নিউজ পোর্টালের কার্যকারিতা পরীক্ষা করার জন্য ব্যবহৃত হচ্ছে।",
            "summary": "স্বয়ংক্রিয় পরীক্ষার জন্য তৈরি টেস্ট সংবাদ",
            "category": "প্রযুক্তি",
            "author": "টেস্ট সংবাদদাতা",
            "is_featured": True,
            "is_breaking": False
        }
        
        self.run_api_test(
            "Create Manual Test News", 
            "POST", 
            "admin/test-news", 
            200, 
            data=test_news,
            auth=self.admin_auth
        )

    def test_ai_news_generation(self):
        """Test AI news generation"""
        print("\n🤖 Testing AI News Generation...")
        
        # Test single category generation
        generation_request = {
            "category": "প্রযুক্তি",
            "count": 2
        }
        
        print("⏳ Generating AI news (this may take 10-15 seconds)...")
        success, response_data = self.run_api_test(
            "Generate AI News", 
            "POST", 
            "news/generate", 
            200, 
            data=generation_request
        )
        
        if success:
            print(f"✅ AI news generation successful")
            # Wait a bit for processing
            time.sleep(2)
        
        # Test daily news generation
        print("⏳ Generating daily news for all categories (this may take 30-60 seconds)...")
        self.run_api_test(
            "Generate Daily News", 
            "POST", 
            "news/daily-generate", 
            200
        )

    def test_breaking_news_scraping(self):
        """Test breaking news scraping"""
        print("\n📺 Testing Breaking News Scraping...")
        
        print("⏳ Scraping breaking news from external sources (this may take 10-20 seconds)...")
        success, response_data = self.run_api_test(
            "Fetch Breaking News", 
            "POST", 
            "breaking-news/fetch", 
            200
        )
        
        if success:
            print("✅ Breaking news scraping successful")
            # Test getting breaking news
            self.run_api_test(
                "Get Breaking News List", 
                "GET", 
                "breaking-news", 
                200
            )

    def test_pdf_download(self):
        """Test PDF newspaper download"""
        print("\n📄 Testing PDF Download...")
        
        try:
            url = f"{self.api_url}/news/download-newspaper"
            response = requests.get(url, timeout=30)
            
            success = response.status_code == 200
            content_type = response.headers.get('content-type', '')
            
            if success and 'pdf' in content_type.lower():
                self.log_test("PDF Download", True, f"Content-Type: {content_type}, Size: {len(response.content)} bytes")
            else:
                self.log_test("PDF Download", False, f"Status: {response.status_code}, Content-Type: {content_type}")
                
        except Exception as e:
            self.log_test("PDF Download", False, f"Exception: {str(e)}")

    def test_news_crud_operations(self):
        """Test news CRUD operations"""
        print("\n📰 Testing News CRUD Operations...")
        
        # Create a news article
        test_article = {
            "title": "CRUD টেস্ট সংবাদ",
            "content": "এটি CRUD অপারেশন পরীক্ষার জন্য তৈরি সংবাদ।",
            "summary": "CRUD পরীক্ষার সংবাদ",
            "category": "শিক্ষা",
            "author": "টেস্ট লেখক"
        }
        
        success, response_data = self.run_api_test(
            "Create News Article", 
            "POST", 
            "news", 
            200, 
            data=test_article
        )
        
        if success and response_data.get('id'):
            article_id = response_data['id']
            
            # Get specific article
            self.run_api_test(
                "Get Specific Article", 
                "GET", 
                f"news/{article_id}", 
                200
            )
            
            # Toggle featured status
            self.run_api_test(
                "Toggle Featured Status", 
                "PUT", 
                f"news/{article_id}/featured", 
                200
            )
            
            # Toggle breaking status
            self.run_api_test(
                "Toggle Breaking Status", 
                "PUT", 
                f"news/{article_id}/breaking", 
                200
            )

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Bengali News Portal Backend API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run test suites
        self.test_basic_endpoints()
        self.test_admin_authentication()
        self.test_admin_settings()
        self.test_manual_news_creation()
        self.test_news_crud_operations()
        self.test_ai_news_generation()
        self.test_breaking_news_scraping()
        self.test_pdf_download()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['name']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test function"""
    tester = BengaliNewsPortalTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️ Some tests failed. Check the details above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())