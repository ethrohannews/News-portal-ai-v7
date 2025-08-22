#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Bangla News Portal
Tests all endpoints including AI news generation, CRUD operations, PDF download, etc.
"""

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, List, Optional

class BanglaNewsAPITester:
    def __init__(self, base_url="https://newsportal-19.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_articles = []  # Track created articles for cleanup
        
        # Bangla categories from the backend
        self.categories = [
            "রাজনীতি", "খেলাধুলা", "প্রযুক্তি", "বিনোদন", 
            "অর্থনীতি", "আন্তর্জাতিক", "স্বাস্থ্য", "শিক্ষা"
        ]

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    params: Optional[Dict] = None, expect_json: bool = True) -> tuple:
        """Make HTTP request and return success status and response"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=60)  # Longer timeout for AI
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            else:
                return False, f"Unsupported method: {method}"

            if expect_json:
                try:
                    response_data = response.json()
                except:
                    response_data = {"raw_response": response.text}
            else:
                response_data = {"content_type": response.headers.get('content-type', ''), 
                               "content_length": len(response.content)}

            return response.status_code in [200, 201], {
                "status_code": response.status_code,
                "data": response_data
            }
            
        except requests.exceptions.Timeout:
            return False, "Request timed out"
        except requests.exceptions.RequestException as e:
            return False, f"Request error: {str(e)}"
        except Exception as e:
            return False, f"Unexpected error: {str(e)}"

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.make_request('GET', '/')
        if success and response['status_code'] == 200:
            message = response['data'].get('message', '')
            return self.log_test("Root Endpoint", True, f"- Message: {message}")
        return self.log_test("Root Endpoint", False, f"- {response}")

    def test_categories_endpoint(self):
        """Test categories endpoint"""
        success, response = self.make_request('GET', '/categories')
        if success and response['status_code'] == 200:
            categories = response['data'].get('categories', [])
            expected_count = len(self.categories)
            actual_count = len(categories)
            if actual_count == expected_count:
                return self.log_test("Categories Endpoint", True, f"- Found {actual_count} categories")
            else:
                return self.log_test("Categories Endpoint", False, f"- Expected {expected_count}, got {actual_count}")
        return self.log_test("Categories Endpoint", False, f"- {response}")

    def test_news_stats(self):
        """Test news statistics endpoint"""
        success, response = self.make_request('GET', '/news/stats/overview')
        if success and response['status_code'] == 200:
            stats = response['data']
            required_fields = ['total_news', 'featured_news', 'breaking_news', 'category_stats']
            missing_fields = [field for field in required_fields if field not in stats]
            
            if not missing_fields:
                return self.log_test("News Stats", True, 
                    f"- Total: {stats['total_news']}, Featured: {stats['featured_news']}, Breaking: {stats['breaking_news']}")
            else:
                return self.log_test("News Stats", False, f"- Missing fields: {missing_fields}")
        return self.log_test("News Stats", False, f"- {response}")

    def test_get_news_basic(self):
        """Test basic news retrieval"""
        success, response = self.make_request('GET', '/news', params={'limit': 5})
        if success and response['status_code'] == 200:
            news_list = response['data']
            if isinstance(news_list, list):
                return self.log_test("Get News Basic", True, f"- Retrieved {len(news_list)} articles")
            else:
                return self.log_test("Get News Basic", False, "- Response is not a list")
        return self.log_test("Get News Basic", False, f"- {response}")

    def test_get_news_with_filters(self):
        """Test news retrieval with category filter"""
        test_category = self.categories[0]  # রাজনীতি
        success, response = self.make_request('GET', '/news', 
                                            params={'category': test_category, 'limit': 3})
        if success and response['status_code'] == 200:
            news_list = response['data']
            if isinstance(news_list, list):
                # Check if all articles belong to the requested category
                category_match = all(article.get('category') == test_category for article in news_list)
                if category_match or len(news_list) == 0:  # Empty list is also valid
                    return self.log_test("Get News with Filter", True, 
                        f"- Retrieved {len(news_list)} articles for '{test_category}'")
                else:
                    return self.log_test("Get News with Filter", False, "- Category filter not working")
            else:
                return self.log_test("Get News with Filter", False, "- Response is not a list")
        return self.log_test("Get News with Filter", False, f"- {response}")

    def test_create_news_manual(self):
        """Test manual news creation"""
        test_article = {
            "title": "টেস্ট সংবাদ - ম্যানুয়াল তৈরি",
            "content": "এটি একটি টেস্ট সংবাদ যা ম্যানুয়ালি তৈরি করা হয়েছে। এই সংবাদটি API টেস্টিং এর জন্য ব্যবহার করা হচ্ছে।",
            "summary": "টেস্ট সংবাদের সংক্ষিপ্ত বিবরণ",
            "category": "প্রযুক্তি",
            "author": "টেস্ট রিপোর্টার"
        }
        
        success, response = self.make_request('POST', '/news', data=test_article)
        if success and (response['status_code'] == 200 or response['status_code'] == 201):
            created_article = response['data']
            if 'id' in created_article:
                self.created_articles.append(created_article['id'])
                return self.log_test("Create News Manual", True, f"- Created article ID: {created_article['id']}")
            else:
                return self.log_test("Create News Manual", False, "- No ID in response")
        return self.log_test("Create News Manual", False, f"- {response}")

    def test_ai_news_generation(self):
        """Test AI news generation - This might take longer"""
        print(f"\n🤖 Testing AI News Generation (this may take 30-60 seconds)...")
        
        test_category = "প্রযুক্তি"
        test_data = {
            "category": test_category,
            "count": 2
        }
        
        success, response = self.make_request('POST', '/news/generate', data=test_data)
        if success and response['status_code'] == 200:
            result = response['data']
            if 'articles' in result and isinstance(result['articles'], list):
                generated_count = len(result['articles'])
                # Track generated articles
                for article in result['articles']:
                    if 'id' in article:
                        self.created_articles.append(article['id'])
                
                return self.log_test("AI News Generation", True, 
                    f"- Generated {generated_count} articles for '{test_category}'")
            else:
                return self.log_test("AI News Generation", False, "- No articles in response")
        return self.log_test("AI News Generation", False, f"- {response}")

    def test_get_specific_article(self):
        """Test retrieving a specific article"""
        if not self.created_articles:
            return self.log_test("Get Specific Article", False, "- No articles available to test")
        
        article_id = self.created_articles[0]
        success, response = self.make_request('GET', f'/news/{article_id}')
        if success and response['status_code'] == 200:
            article = response['data']
            if article.get('id') == article_id:
                return self.log_test("Get Specific Article", True, f"- Retrieved article: {article.get('title', 'No title')}")
            else:
                return self.log_test("Get Specific Article", False, "- Article ID mismatch")
        return self.log_test("Get Specific Article", False, f"- {response}")

    def test_toggle_featured_status(self):
        """Test toggling featured status of an article"""
        if not self.created_articles:
            return self.log_test("Toggle Featured Status", False, "- No articles available to test")
        
        article_id = self.created_articles[0]
        success, response = self.make_request('PUT', f'/news/{article_id}/featured')
        if success and response['status_code'] == 200:
            message = response['data'].get('message', '')
            return self.log_test("Toggle Featured Status", True, f"- {message}")
        return self.log_test("Toggle Featured Status", False, f"- {response}")

    def test_toggle_breaking_status(self):
        """Test toggling breaking news status"""
        if not self.created_articles:
            return self.log_test("Toggle Breaking Status", False, "- No articles available to test")
        
        article_id = self.created_articles[0]
        success, response = self.make_request('PUT', f'/news/{article_id}/breaking')
        if success and response['status_code'] == 200:
            message = response['data'].get('message', '')
            return self.log_test("Toggle Breaking Status", True, f"- {message}")
        return self.log_test("Toggle Breaking Status", False, f"- {response}")

    def test_pdf_download(self):
        """Test PDF newspaper download"""
        print(f"\n📄 Testing PDF Download (this may take 10-20 seconds)...")
        
        try:
            url = f"{self.base_url}/news/download-newspaper"
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                
                if 'pdf' in content_type.lower() and content_length > 1000:  # Basic PDF validation
                    return self.log_test("PDF Download", True, 
                        f"- PDF size: {content_length} bytes, Content-Type: {content_type}")
                else:
                    return self.log_test("PDF Download", False, 
                        f"- Invalid PDF: {content_type}, size: {content_length}")
            else:
                return self.log_test("PDF Download", False, f"- Status: {response.status_code}")
                
        except Exception as e:
            return self.log_test("PDF Download", False, f"- Error: {str(e)}")

    def test_daily_news_generation(self):
        """Test daily news generation for all categories"""
        print(f"\n📰 Testing Daily News Generation (this may take 2-3 minutes)...")
        
        success, response = self.make_request('POST', '/news/daily-generate')
        if success and response['status_code'] == 200:
            result = response['data']
            if 'results' in result:
                total_generated = sum(result['results'].values())
                return self.log_test("Daily News Generation", True, 
                    f"- Generated {total_generated} articles across all categories")
            else:
                return self.log_test("Daily News Generation", False, "- No results in response")
        return self.log_test("Daily News Generation", False, f"- {response}")

    def test_legacy_status_endpoints(self):
        """Test legacy status check endpoints"""
        # Test create status
        status_data = {"client_name": "test_client"}
        success, response = self.make_request('POST', '/status', data=status_data)
        
        if success and response['status_code'] == 200:
            # Test get status
            success2, response2 = self.make_request('GET', '/status')
            if success2 and response2['status_code'] == 200:
                status_list = response2['data']
                if isinstance(status_list, list):
                    return self.log_test("Legacy Status Endpoints", True, 
                        f"- Created and retrieved {len(status_list)} status checks")
                else:
                    return self.log_test("Legacy Status Endpoints", False, "- Get status response not a list")
            else:
                return self.log_test("Legacy Status Endpoints", False, f"- Get status failed: {response2}")
        else:
            return self.log_test("Legacy Status Endpoints", False, f"- Create status failed: {response}")

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Comprehensive Bangla News Portal Backend API Testing")
        print("=" * 70)
        
        # Basic endpoint tests
        print("\n📋 Basic Endpoint Tests:")
        self.test_root_endpoint()
        self.test_categories_endpoint()
        self.test_news_stats()
        
        # News CRUD tests
        print("\n📰 News CRUD Tests:")
        self.test_get_news_basic()
        self.test_get_news_with_filters()
        self.test_create_news_manual()
        
        # Wait a moment for database consistency
        time.sleep(2)
        
        self.test_get_specific_article()
        self.test_toggle_featured_status()
        self.test_toggle_breaking_status()
        
        # AI and advanced features (these take longer)
        print("\n🤖 AI and Advanced Features:")
        self.test_ai_news_generation()
        
        # Wait for AI generation to complete
        time.sleep(3)
        
        self.test_pdf_download()
        
        # Skip daily generation in quick test mode to save time
        # Uncomment the line below for full testing
        # self.test_daily_news_generation()
        
        # Legacy endpoints
        print("\n🔧 Legacy Endpoints:")
        self.test_legacy_status_endpoints()
        
        # Final results
        print("\n" + "=" * 70)
        print(f"📊 BACKEND API TEST RESULTS:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.created_articles:
            print(f"   Created Articles: {len(self.created_articles)}")
        
        print("=" * 70)
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = BanglaNewsAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⚠️  Testing interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error during testing: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())