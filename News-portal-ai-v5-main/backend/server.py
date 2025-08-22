from fastapi import FastAPI, APIRouter, HTTPException, Query, BackgroundTasks, Response, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage
import asyncio
from weasyprint import HTML, CSS
from io import BytesIO
import tempfile
import requests
from bs4 import BeautifulSoup
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
import secrets
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBasic()

# WebSocket connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# News Categories
NEWS_CATEGORIES = [
    "রাজনীতি",
    "খেলাধুলা", 
    "প্রযুক্তি",
    "বিনোদন",
    "অর্থনীতি",
    "আন্তর্জাতিক",
    "স্বাস্থ্য",
    "শিক্ষা"
]

# Bengali news websites for scraping
NEWS_WEBSITES = {
    "prothomalo": "https://www.prothomalo.com",
    "bdnews24": "https://bangla.bdnews24.com",
    "somoynews": "https://www.somoynews.tv",
    "jamuna": "https://www.jamuna.tv",
    "channel24": "https://www.channel24bd.tv",
    "banglanews24": "https://www.banglanews24.com"
}

# Define Models
class NewsArticle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    summary: str
    category: str
    author: str = "সংবাদদাতা"
    published_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    image_url: Optional[str] = None
    is_featured: bool = False
    is_breaking: bool = False
    views: int = 0
    source: Optional[str] = None
    source_url: Optional[str] = None

class NewsArticleCreate(BaseModel):
    title: str
    content: str
    summary: str
    category: str
    author: Optional[str] = "সংবাদদাতা"
    image_url: Optional[str] = None
    is_featured: bool = False
    is_breaking: bool = False
    source: Optional[str] = None
    source_url: Optional[str] = None

class GenerateNewsRequest(BaseModel):
    category: str
    count: int = 5

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class AdminSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    emergent_llm_key: str
    auto_news_enabled: bool = True
    breaking_news_interval: int = 15  # minutes
    auto_breaking_news: bool = True
    last_key_update: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminSettingsUpdate(BaseModel):
    emergent_llm_key: Optional[str] = None
    auto_news_enabled: Optional[bool] = None
    breaking_news_interval: Optional[int] = None
    auto_breaking_news: Optional[bool] = None

class AdminAuth(BaseModel):
    username: str
    password: str

class BreakingNewsRequest(BaseModel):
    sources: Optional[List[str]] = ["somoynews", "jamuna", "prothomalo"]

class AdminStats(BaseModel):
    total_news: int
    featured_news: int
    breaking_news: int
    today_news: int
    category_stats: dict
    recent_activities: List[dict]
    system_health: dict

# Admin Authentication
def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    username = os.environ.get('ADMIN_USERNAME', 'admin')
    password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    
    if credentials.username != username or credentials.password != password:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return credentials.username

# Background task for auto breaking news fetch
async def fetch_breaking_news_background():
    while True:
        try:
            # Check if auto breaking news is enabled
            settings = await db.admin_settings.find_one()
            if not settings or not settings.get('auto_breaking_news', True):
                await asyncio.sleep(300)  # Wait 5 minutes if disabled
                continue
            
            interval = settings.get('breaking_news_interval', 15) * 60  # Convert to seconds
            
            # Fetch new breaking news
            breaking_news_data = await scrape_breaking_news()
            
            if breaking_news_data:
                new_articles = []
                for news_data in breaking_news_data:
                    # Check if this news already exists
                    existing = await db.news_articles.find_one({
                        "title": news_data['title'],
                        "is_breaking": True
                    })
                    
                    if not existing:
                        # Create new breaking news article
                        article = NewsArticle(
                            title=news_data['title'],
                            content=news_data['content'],
                            summary=news_data['summary'],
                            category="ব্রেকিং নিউজ",
                            is_breaking=True,
                            source=news_data['source'],
                            source_url=news_data.get('source_url'),
                            image_url=news_data.get('image_url')
                        )
                        
                        article_dict = article.dict()
                        await db.news_articles.insert_one(article_dict)
                        new_articles.append(article_dict)
                
                # Broadcast new breaking news to all connected clients
                if new_articles:
                    await manager.broadcast(json.dumps({
                        "type": "breaking_news",
                        "data": new_articles
                    }))
                    
                    logging.info(f"Auto-fetched {len(new_articles)} new breaking news articles")
            
            await asyncio.sleep(interval)
            
        except Exception as e:
            logging.error(f"Error in background breaking news fetch: {str(e)}")
            await asyncio.sleep(300)  # Wait 5 minutes on error

# Start background task
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(fetch_breaking_news_background())

# Image Processing Functions
def process_image(image_url: str) -> str:
    """Process and modify image to avoid copyright issues"""
    try:
        # Download image
        response = requests.get(image_url, timeout=10)
        if response.status_code != 200:
            return None
            
        # Convert to PIL Image
        image = Image.open(BytesIO(response.content))
        
        # Apply modifications to avoid copyright
        # 1. Add subtle blur
        image = image.filter(ImageFilter.GaussianBlur(radius=0.5))
        
        # 2. Adjust brightness and contrast
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(1.1)
        
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.05)
        
        # 3. Add subtle color adjustment
        enhancer = ImageEnhance.Color(image)
        image = enhancer.enhance(0.95)
        
        # 4. Resize if too large
        if image.width > 800 or image.height > 600:
            image.thumbnail((800, 600), Image.Resampling.LANCZOS)
        
        # Save processed image (in production, save to cloud storage)
        processed_filename = f"processed_{uuid.uuid4().hex[:10]}.jpg"
        processed_path = f"/tmp/{processed_filename}"
        image.save(processed_path, "JPEG", quality=85)
        
        return processed_path
        
    except Exception as e:
        logging.error(f"Error processing image: {str(e)}")
        return None

# Web Scraping Functions
async def scrape_breaking_news() -> List[dict]:
    """Scrape breaking news from Bengali news websites"""
    breaking_news = []
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        # Scrape from Somoy News
        try:
            response = requests.get("https://www.somoynews.tv/bangla", headers=headers, timeout=10)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Find breaking news section
                breaking_elements = soup.find_all(['div', 'article'], class_=lambda x: x and ('breaking' in x.lower() or 'urgent' in x.lower() or 'latest' in x.lower()))[:3]
                
                for element in breaking_elements:
                    title_elem = element.find(['h1', 'h2', 'h3', 'h4', 'a'])
                    img_elem = element.find('img')
                    
                    if title_elem:
                        title = title_elem.get_text(strip=True)
                        link = title_elem.get('href', '') if title_elem.name == 'a' else ''
                        if link and not link.startswith('http'):
                            link = f"https://www.somoynews.tv{link}"
                        
                        image_url = None
                        if img_elem and img_elem.get('src'):
                            image_url = img_elem.get('src')
                            if not image_url.startswith('http'):
                                image_url = f"https://www.somoynews.tv{image_url}"
                        
                        if len(title) > 10:  # Valid title
                            breaking_news.append({
                                "title": title,
                                "source": "সময় টিভি",
                                "source_url": link,
                                "image_url": image_url,
                                "content": f"সময় টিভি থেকে প্রাপ্ত ব্রেকিং নিউজ: {title}",
                                "summary": title[:100] + "..." if len(title) > 100 else title
                            })
        except Exception as e:
            logging.warning(f"Error scraping Somoy News: {str(e)}")
        
        # Scrape from Jamuna TV
        try:
            response = requests.get("https://www.jamuna.tv", headers=headers, timeout=10)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Find latest news
                news_elements = soup.find_all(['div', 'article'], class_=lambda x: x and ('news' in x.lower() or 'item' in x.lower()))[:3]
                
                for element in news_elements:
                    title_elem = element.find(['h1', 'h2', 'h3', 'h4', 'a'])
                    img_elem = element.find('img')
                    
                    if title_elem:
                        title = title_elem.get_text(strip=True)
                        link = title_elem.get('href', '') if title_elem.name == 'a' else ''
                        if link and not link.startswith('http'):
                            link = f"https://www.jamuna.tv{link}"
                        
                        image_url = None
                        if img_elem and img_elem.get('src'):
                            image_url = img_elem.get('src')
                            if not image_url.startswith('http'):
                                image_url = f"https://www.jamuna.tv{image_url}"
                        
                        if len(title) > 10:  # Valid title
                            breaking_news.append({
                                "title": title,
                                "source": "যমুনা টিভি",
                                "source_url": link,
                                "image_url": image_url,
                                "content": f"যমুনা টিভি থেকে প্রাপ্ত গুরুত্বপূর্ণ সংবাদ: {title}",
                                "summary": title[:100] + "..." if len(title) > 100 else title
                            })
        except Exception as e:
            logging.warning(f"Error scraping Jamuna TV: {str(e)}")
        
        # Scrape from Prothom Alo
        try:
            response = requests.get("https://www.prothomalo.com", headers=headers, timeout=10)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Find latest news
                news_elements = soup.find_all(['div', 'article'], class_=lambda x: x and ('story' in x.lower() or 'news' in x.lower()))[:2]
                
                for element in news_elements:
                    title_elem = element.find(['h1', 'h2', 'h3', 'h4', 'a'])
                    img_elem = element.find('img')
                    
                    if title_elem:
                        title = title_elem.get_text(strip=True)
                        link = title_elem.get('href', '') if title_elem.name == 'a' else ''
                        if link and not link.startswith('http'):
                            link = f"https://www.prothomalo.com{link}"
                        
                        image_url = None
                        if img_elem and img_elem.get('src'):
                            image_url = img_elem.get('src')
                            if not image_url.startswith('http'):
                                image_url = f"https://www.prothomalo.com{image_url}"
                        
                        if len(title) > 10:  # Valid title
                            breaking_news.append({
                                "title": title,
                                "source": "প্রথম আলো",
                                "source_url": link,
                                "image_url": image_url,
                                "content": f"প্রথম আলো থেকে প্রাপ্ত সংবাদ: {title}",
                                "summary": title[:100] + "..." if len(title) > 100 else title
                            })
        except Exception as e:
            logging.warning(f"Error scraping Prothom Alo: {str(e)}")
        
    except Exception as e:
        logging.error(f"Error in breaking news scraping: {str(e)}")
    
    return breaking_news[:8]  # Return max 8 breaking news

# AI News Generation Function
async def generate_news_with_ai(category: str, count: int = 1) -> List[dict]:
    """Generate news articles using AI for a specific category"""
    
    # Check if auto news is enabled
    settings = await db.admin_settings.find_one()
    if settings and not settings.get('auto_news_enabled', True):
        return []
    
    # Get API key from settings or environment
    api_key = None
    if settings and settings.get('emergent_llm_key'):
        api_key = settings['emergent_llm_key']
    else:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
    
    if not api_key:
        raise HTTPException(status_code=500, detail="AI API key not configured")
    
    # Get current date for AI context
    current_date = datetime.now(timezone.utc).strftime("%B %d, %Y")
    current_date_bangla = datetime.now(timezone.utc).strftime("%d %B %Y")
    
    chat = LlmChat(
        api_key=api_key,
        session_id=f"news-generation-{category}",
        system_message=f"""আপনি একজন পেশাদার বাংলা সংবাদকর্মী। আজকের তারিখ হলো: {current_date} ({current_date_bangla})। আপনার কাজ হলো {category} বিভাগের জন্য আজকের দিনের (২০২৫ সালের আগস্ট মাসের) সাম্প্রতিক এবং আকর্ষণীয় সংবাদ তৈরি করা।

গুরুত্বপূর্ণ নির্দেশনা:
1. সংবাদ অবশ্যই আজকের তারিখের (আগস্ট ২০২৫) সাথে প্রাসঙ্গিক হতে হবে
2. পুরানো ঘটনার কথা বলবেন না, শুধুমাত্র সাম্প্রতিক ঘটনা নিয়ে লিখবেন
3. বর্তমান সময়ের trends এবং technology নিয়ে লিখবেন
4. "গতকাল", "আজ", "সম্প্রতি", "এই মাসে" এই ধরনের current timeframe ব্যবহার করুন

নিয়মাবলী:
1. প্রতিটি সংবাদ বাংলায় লিখুন
2. সংবাদের শিরোনাম আকর্ষণীয় এবং current হতে হবে
3. সংবাদের মূল বিষয়বস্তু তথ্যপূর্ণ এবং বিস্তারিত হতে হবে (কমপক্ষে ৩০০ শব্দ)
4. একটি সংক্ষিপ্ত সারাংশ দিন (৫০-৮০ শব্দ)
5. সংবাদটি অবশ্যই ২০২৫ সালের আগস্ট মাসের context এ হতে হবে

JSON ফরম্যাটে উত্তর দিন:
{{
  "title": "সংবাদের শিরোনাম",
  "content": "সংবাদের বিস্তারিত বিষয়বস্তু",
  "summary": "সংবাদের সারাংশ"
}}

শুধুমাত্র JSON object return করুন, অন্য কোনো text নয়।"""
    ).with_model("openai", "gpt-4o-mini")
    
    articles = []
    
    for i in range(count):
        try:
            user_message = UserMessage(
                text=f"{category} বিভাগের জন্য আজকের দিনের (২২ আগস্ট ২০২৫) একটি সাম্প্রতিক এবং আকর্ষণীয় সংবাদ তৈরি করুন। এটি অবশ্যই বর্তমান সময়ের (২০২৫ সালের আগস্ট মাস) সাথে প্রাসঙ্গিক হতে হবে। পুরানো ঘটনার কথা বলবেন না।"
            )
            
            response = await chat.send_message(user_message)
            
            # Parse JSON response
            import json
            try:
                # Clean the response if it has markdown formatting
                response_text = response.strip()
                if response_text.startswith('```json'):
                    response_text = response_text[7:]
                if response_text.endswith('```'):
                    response_text = response_text[:-3]
                
                article_data = json.loads(response_text)
                
                # Handle different field names that AI might use
                if 'headline' in article_data:
                    article_data['title'] = article_data.pop('headline')
                if 'শিরোনাম' in article_data:
                    article_data['title'] = article_data.pop('শিরোনাম')
                if 'body' in article_data:
                    article_data['content'] = article_data.pop('body')
                if 'বিষয়বস্তু' in article_data:
                    article_data['content'] = article_data.pop('বিষয়বস্তু')
                if 'description' in article_data:
                    article_data['summary'] = article_data.pop('description')
                if 'সারাংশ' in article_data:
                    article_data['summary'] = article_data.pop('সারাংশ')
                    
                # Ensure all required fields exist
                if 'title' not in article_data:
                    article_data['title'] = f"{category} বিষয়ক সংবাদ {i+1}"
                if 'content' not in article_data:
                    article_data['content'] = response[:1000]  # Use AI response as content
                if 'summary' not in article_data:
                    article_data['summary'] = f"{category} সম্পর্কিত গুরুত্বপূর্ণ সংবাদ"
                    
                article_data['category'] = category
                articles.append(article_data)
                
            except json.JSONDecodeError as e:
                # Fallback if JSON parsing fails
                articles.append({
                    "title": f"{category} বিভাগের সংবাদ {i+1}",
                    "content": response,
                    "summary": f"{category} সম্পর্কিত গুরুত্বপূর্ণ সংবাদ",
                    "category": category
                })
                
        except Exception as e:
            logging.warning(f"Error generating article {i+1}: {str(e)}")
            continue
    
    return articles

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle client messages if needed
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Routes
@api_router.get("/")
async def root():
    return {"message": "বাংলা নিউজ পোর্টাল API"}

@api_router.get("/categories")
async def get_categories():
    return {"categories": NEWS_CATEGORIES}

# Enhanced Admin Routes
@api_router.get("/admin/settings")
async def get_admin_settings(admin: str = Depends(verify_admin)):
    """Get admin settings"""
    settings = await db.admin_settings.find_one()
    if not settings:
        # Create default settings
        default_settings = AdminSettings(
            emergent_llm_key=os.environ.get('EMERGENT_LLM_KEY', ''),
            auto_news_enabled=True,
            breaking_news_interval=15,
            auto_breaking_news=True
        )
        await db.admin_settings.insert_one(default_settings.dict())
        return default_settings
    
    return AdminSettings(**settings)

@api_router.get("/admin/stats")
async def get_admin_stats(admin: str = Depends(verify_admin)) -> AdminStats:
    """Get comprehensive admin statistics"""
    try:
        # Basic counts
        total_news = await db.news_articles.count_documents({})
        featured_news = await db.news_articles.count_documents({"is_featured": True})
        breaking_news = await db.news_articles.count_documents({"is_breaking": True})
        
        # Today's news
        today = datetime.now(timezone.utc).date()
        today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
        today_news = await db.news_articles.count_documents({
            "published_at": {"$gte": today_start}
        })
        
        # Category wise count
        category_stats = {}
        for category in NEWS_CATEGORIES:
            count = await db.news_articles.count_documents({"category": category})
            category_stats[category] = count
        
        # Recent activities
        recent_articles = await db.news_articles.find({}).sort("published_at", -1).limit(5).to_list(length=None)
        recent_activities = []
        for article in recent_articles:
            recent_activities.append({
                "type": "news_created",
                "title": article['title'][:50] + "..." if len(article['title']) > 50 else article['title'],
                "category": article['category'],
                "timestamp": article['published_at'].isoformat(),
                "is_breaking": article.get('is_breaking', False),
                "is_featured": article.get('is_featured', False)
            })
        
        # System health
        system_health = {
            "database_status": "healthy",
            "api_status": "active",
            "breaking_news_fetch": "active",
            "total_articles_today": today_news
        }
        
        return AdminStats(
            total_news=total_news,
            featured_news=featured_news,
            breaking_news=breaking_news,
            today_news=today_news,
            category_stats=category_stats,
            recent_activities=recent_activities,
            system_health=system_health
        )
        
    except Exception as e:
        logging.error(f"Error getting admin stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"পরিসংখ্যান লোড করতে সমস্যা: {str(e)}")

@api_router.delete("/admin/clear-test-data")
async def clear_test_data(admin: str = Depends(verify_admin)):
    """Clear test data from database"""
    try:
        # Delete test articles
        result = await db.news_articles.delete_many({
            "$or": [
                {"title": {"$regex": "CRUD"}},
                {"title": {"$regex": "টেস্ট"}},
                {"author": {"$regex": "টেস্ট"}},
                {"content": {"$regex": "CRUD"}},
                {"content": {"$regex": "পরীক্ষা"}}
            ]
        })
        
        return {
            "message": f"{result.deleted_count}টি টেস্ট ডেটা সফলভাবে মুছে ফেলা হয়েছে",
            "deleted_count": result.deleted_count
        }
    except Exception as e:
        logging.error(f"Error clearing test data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"টেস্ট ডেটা মুছতে সমস্যা: {str(e)}")

@api_router.put("/admin/settings")
async def update_admin_settings(
    update_data: AdminSettingsUpdate,
    admin: str = Depends(verify_admin)
):
    """Update admin settings"""
    settings = await db.admin_settings.find_one()
    if not settings:
        settings = AdminSettings().dict()
    
    update_dict = {}
    if update_data.emergent_llm_key is not None:
        update_dict['emergent_llm_key'] = update_data.emergent_llm_key
        update_dict['last_key_update'] = datetime.now(timezone.utc)
    
    if update_data.auto_news_enabled is not None:
        update_dict['auto_news_enabled'] = update_data.auto_news_enabled
    
    if update_data.breaking_news_interval is not None:
        update_dict['breaking_news_interval'] = update_data.breaking_news_interval
    
    if update_data.auto_breaking_news is not None:
        update_dict['auto_breaking_news'] = update_data.auto_breaking_news
    
    if update_dict:
        await db.admin_settings.update_one(
            {},
            {"$set": update_dict},
            upsert=True
        )
    
    updated_settings = await db.admin_settings.find_one()
    return AdminSettings(**updated_settings)

@api_router.post("/admin/test-news")
async def create_test_news(
    article: NewsArticleCreate,
    admin: str = Depends(verify_admin)
):
    """Create test news manually from admin panel"""
    news_article = NewsArticle(**article.dict())
    article_dict = news_article.dict()
    await db.news_articles.insert_one(article_dict)
    return {"message": "টেস্ট সংবাদ সফলভাবে তৈরি হয়েছে", "article": news_article}

@api_router.post("/admin/generate-all-categories")
async def generate_news_all_categories(admin: str = Depends(verify_admin)):
    """Generate news for all categories - Admin only"""
    try:
        all_generated = []
        failed_categories = []
        
        for category in NEWS_CATEGORIES:
            try:
                # Generate 3-5 news for each category
                articles_data = await generate_news_with_ai(category, 4)
                
                # Save to database
                saved_articles = []
                for article_data in articles_data:
                    article = NewsArticle(**article_data)
                    article_dict = article.dict()
                    await db.news_articles.insert_one(article_dict)
                    saved_articles.append(article)
                
                all_generated.extend(saved_articles)
                
            except Exception as e:
                logging.error(f"Error generating news for category {category}: {str(e)}")
                failed_categories.append(category)
                continue
        
        return {
            "message": f"সফলভাবে {len(all_generated)}টি সংবাদ তৈরি হয়েছে",
            "total_generated": len(all_generated),
            "categories_processed": len(NEWS_CATEGORIES) - len(failed_categories),
            "failed_categories": failed_categories,
            "articles": all_generated
        }
        
    except Exception as e:
        logging.error(f"Error in generate all categories: {str(e)}")
        raise HTTPException(status_code=500, detail=f"সব ক্যাটাগরিতে সংবাদ তৈরিতে সমস্যা: {str(e)}")

@api_router.post("/admin/force-breaking-news")
async def force_fetch_breaking_news(admin: str = Depends(verify_admin)):
    """Manually force fetch breaking news"""
    try:
        breaking_news_data = await scrape_breaking_news()
        
        saved_articles = []
        for news_data in breaking_news_data:
            # Check if this news already exists
            existing = await db.news_articles.find_one({
                "title": news_data['title'],
                "is_breaking": True
            })
            
            if not existing:
                article = NewsArticle(
                    title=news_data['title'],
                    content=news_data['content'],
                    summary=news_data['summary'],
                    category="ব্রেকিং নিউজ",
                    is_breaking=True,
                    source=news_data['source'],
                    source_url=news_data.get('source_url'),
                    image_url=news_data.get('image_url')
                )
                
                article_dict = article.dict()
                await db.news_articles.insert_one(article_dict)
                saved_articles.append(article)
        
        # Broadcast new breaking news
        if saved_articles:
            await manager.broadcast(json.dumps({
                "type": "breaking_news",
                "data": [article.dict() for article in saved_articles]
            }))
        
        return {
            "message": f"{len(saved_articles)}টি নতুন ব্রেকিং নিউজ সংগ্রহ করা হয়েছে",
            "articles": saved_articles
        }
        
    except Exception as e:
        logging.error(f"Error forcing breaking news fetch: {str(e)}")
        raise HTTPException(status_code=500, detail=f"ব্রেকিং নিউজ সংগ্রহে সমস্যা: {str(e)}")

# Breaking News Routes
@api_router.post("/breaking-news/fetch")
async def fetch_breaking_news():
    """Fetch breaking news from external sources"""
    try:
        breaking_news_data = await scrape_breaking_news()
        
        # Save breaking news to database
        saved_articles = []
        for news_data in breaking_news_data:
            # Process image if available
            processed_image = None
            if news_data.get('image_url'):
                processed_image = process_image(news_data['image_url'])
                if processed_image:
                    news_data['image_url'] = processed_image
            
            # Create news article
            article = NewsArticle(
                title=news_data['title'],
                content=news_data['content'],
                summary=news_data['summary'],
                category="ব্রেকিং নিউজ",
                is_breaking=True,
                source=news_data['source'],
                source_url=news_data.get('source_url'),
                image_url=news_data.get('image_url')
            )
            
            article_dict = article.dict()
            await db.news_articles.insert_one(article_dict)
            saved_articles.append(article)
        
        return {
            "message": f"{len(saved_articles)}টি ব্রেকিং নিউজ সংগ্রহ করা হয়েছে",
            "articles": saved_articles
        }
        
    except Exception as e:
        logging.error(f"Error fetching breaking news: {str(e)}")
        raise HTTPException(status_code=500, detail=f"ব্রেকিং নিউজ সংগ্রহে সমস্যা: {str(e)}")

@api_router.get("/breaking-news", response_model=List[NewsArticle])
async def get_breaking_news():
    """Get all breaking news"""
    articles = await db.news_articles.find(
        {"is_breaking": True}
    ).sort("published_at", -1).limit(20).to_list(length=None)
    
    return [NewsArticle(**article) for article in articles]

@api_router.get("/breaking-news/latest")
async def get_latest_breaking_news():
    """Get latest breaking news for ticker"""
    articles = await db.news_articles.find(
        {"is_breaking": True}
    ).sort("published_at", -1).limit(10).to_list(length=None)
    
    return [{
        "id": article['id'],
        "title": article['title'],
        "published_at": article['published_at'].isoformat()
    } for article in articles]

# Regular News Routes
@api_router.post("/news/generate")
async def generate_news(request: GenerateNewsRequest, background_tasks: BackgroundTasks):
    """Generate news articles using AI"""
    try:
        if request.category not in NEWS_CATEGORIES:
            raise HTTPException(status_code=400, detail="Invalid category")
        
        # Generate articles
        articles_data = await generate_news_with_ai(request.category, request.count)
        
        # Save to database
        saved_articles = []
        for article_data in articles_data:
            article = NewsArticle(**article_data)
            article_dict = article.dict()
            await db.news_articles.insert_one(article_dict)
            saved_articles.append(article)
        
        return {
            "message": f"{len(saved_articles)}টি সংবাদ সফলভাবে তৈরি হয়েছে",
            "articles": saved_articles
        }
        
    except Exception as e:
        logging.error(f"Error generating news: {str(e)}")
        raise HTTPException(status_code=500, detail=f"সংবাদ তৈরিতে সমস্যা হয়েছে: {str(e)}")

@api_router.get("/news", response_model=List[NewsArticle])
async def get_news(
    category: Optional[str] = None,
    limit: int = Query(default=20, le=100),
    skip: int = Query(default=0, ge=0),
    featured: Optional[bool] = None,
    breaking: Optional[bool] = None
):
    """Get news articles with filtering"""
    query = {}
    
    if category:
        query["category"] = category
    if featured is not None:
        query["is_featured"] = featured
    if breaking is not None:
        query["is_breaking"] = breaking
    
    articles = await db.news_articles.find(query).sort("published_at", -1).skip(skip).limit(limit).to_list(length=None)
    return [NewsArticle(**article) for article in articles]

@api_router.get("/news/{article_id}", response_model=NewsArticle)
async def get_article(article_id: str):
    """Get specific news article"""
    article = await db.news_articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="সংবাদটি পাওয়া যায়নি")
    
    # Increment view count
    await db.news_articles.update_one(
        {"id": article_id},
        {"$inc": {"views": 1}}
    )
    
    return NewsArticle(**article)

@api_router.post("/news", response_model=NewsArticle)
async def create_news(article: NewsArticleCreate):
    """Create a new news article"""
    news_article = NewsArticle(**article.dict())
    article_dict = news_article.dict()
    await db.news_articles.insert_one(article_dict)
    return news_article

@api_router.put("/news/{article_id}/featured")
async def toggle_featured(article_id: str):
    """Toggle featured status of an article"""
    article = await db.news_articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="সংবাদটি পাওয়া যায়নি")
    
    new_status = not article.get("is_featured", False)
    await db.news_articles.update_one(
        {"id": article_id},
        {"$set": {"is_featured": new_status}}
    )
    
    return {"message": f"ফিচার স্ট্যাটাস পরিবর্তন করা হয়েছে: {'ফিচার করা হয়েছে' if new_status else 'ফিচার থেকে সরানো হয়েছে'}"}

@api_router.put("/news/{article_id}/breaking")
async def toggle_breaking(article_id: str):
    """Toggle breaking news status"""
    article = await db.news_articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="সংবাদটি পাওয়া যায়নি")
    
    new_status = not article.get("is_breaking", False)
    await db.news_articles.update_one(
        {"id": article_id},
        {"$set": {"is_breaking": new_status}}
    )
    
    return {"message": f"ব্রেকিং নিউজ স্ট্যাটাস পরিবর্তন করা হয়েছে: {'ব্রেকিং নিউজ' if new_status else 'সাধারণ সংবাদ'}"}

@api_router.get("/news/stats/overview")
async def get_news_stats():
    """Get news statistics"""
    total_news = await db.news_articles.count_documents({})
    featured_news = await db.news_articles.count_documents({"is_featured": True})
    breaking_news = await db.news_articles.count_documents({"is_breaking": True})
    
    # Category wise count
    category_stats = {}
    for category in NEWS_CATEGORIES:
        count = await db.news_articles.count_documents({"category": category})
        category_stats[category] = count
    
    return {
        "total_news": total_news,
        "featured_news": featured_news,
        "breaking_news": breaking_news,
        "category_stats": category_stats
    }

# PDF Newspaper Generation
async def generate_newspaper_pdf():
    """Generate PDF newspaper with all today's news"""
    try:
        # Get today's news from all categories
        today = datetime.now(timezone.utc).date()
        
        # Aggregate news by category
        newspaper_data = {
            "date": today.strftime("%d %B %Y"),
            "categories": {}
        }
        
        total_articles = 0
        for category in NEWS_CATEGORIES:
            articles = await db.news_articles.find({"category": category}).sort("published_at", -1).limit(5).to_list(length=None)
            if articles:
                newspaper_data["categories"][category] = [NewsArticle(**article) for article in articles]
                total_articles += len(articles)
        
        # Generate HTML content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>বাংলা নিউজ পোর্টাল - দৈনিক সংবাদ</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@300;400;500;600;700&display=swap');
                
                body {{
                    font-family: 'Noto Sans Bengali', sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: white;
                    color: #333;
                    font-size: 14px;
                    line-height: 1.6;
                }}
                
                .header {{
                    text-align: center;
                    border-bottom: 3px solid #1e40af;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                }}
                
                .header h1 {{
                    font-size: 32px;
                    color: #1e40af;
                    margin: 0;
                    font-weight: 700;
                }}
                
                .header .tagline {{
                    font-size: 14px;
                    color: #666;
                    margin-top: 5px;
                }}
                
                .header .date {{
                    font-size: 18px;
                    color: #333;
                    margin-top: 10px;
                    font-weight: 500;
                }}
                
                .category-section {{
                    margin-bottom: 40px;
                    page-break-inside: avoid;
                }}
                
                .category-title {{
                    background: linear-gradient(135deg, #1e40af, #3b82f6);
                    color: white;
                    padding: 12px 20px;
                    font-size: 20px;
                    font-weight: 600;
                    margin-bottom: 20px;
                    border-radius: 8px;
                }}
                
                .article {{
                    margin-bottom: 25px;
                    padding: 15px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    background: #fafafa;
                }}
                
                .article-title {{
                    font-size: 18px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 10px;
                    line-height: 1.4;
                }}
                
                .article-summary {{
                    color: #4b5563;
                    margin-bottom: 10px;
                    padding: 10px;
                    background: white;
                    border-left: 4px solid #3b82f6;
                    border-radius: 4px;
                }}
                
                .article-content {{
                    color: #374151;
                    text-align: justify;
                    margin-bottom: 10px;
                }}
                
                .article-meta {{
                    font-size: 12px;
                    color: #6b7280;
                    border-top: 1px solid #e5e7eb;
                    padding-top: 8px;
                    display: flex;
                    justify-content: space-between;
                }}
                
                .footer {{
                    text-align: center;
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #e5e7eb;
                    color: #6b7280;
                    font-size: 12px;
                }}
                
                .stats {{
                    background: #f3f4f6;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                    text-align: center;
                }}
                
                .stats strong {{
                    color: #1e40af;
                    font-size: 16px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>বাংলা নিউজ পোর্টাল</h1>
                <div class="tagline">আধুনিক সংবাদ প্ল্যাটফর্ম</div>
                <div class="date">তারিখ: {newspaper_data["date"]}</div>
            </div>
            
            <div class="stats">
                <strong>আজকের সংবাদ সংখ্যা: {total_articles}টি</strong> | 
                বিভাগ: {len([k for k, v in newspaper_data["categories"].items() if v])}টি
            </div>
        """
        
        # Add categories and articles
        for category, articles in newspaper_data["categories"].items():
            if not articles:
                continue
                
            html_content += f"""
            <div class="category-section">
                <div class="category-title">{category}</div>
            """
            
            for article in articles:
                # Format publish time
                pub_time = article.published_at.strftime("%d/%m/%Y %H:%M")
                
                html_content += f"""
                <div class="article">
                    <div class="article-title">{article.title}</div>
                    <div class="article-summary">{article.summary}</div>
                    <div class="article-content">{article.content[:500]}{'...' if len(article.content) > 500 else ''}</div>
                    <div class="article-meta">
                        <span>লেখক: {article.author}</span>
                        <span>প্রকাশ: {pub_time}</span>
                        <span>দেখা হয়েছে: {article.views} বার</span>
                    </div>
                </div>
                """
            
            html_content += "</div>"
        
        html_content += f"""
            <div class="footer">
                <p><strong>বাংলা নিউজ পোর্টাল</strong> - সত্য, নির্ভরযোগ্য এবং আপডেট সংবাদের জন্য</p>
                <p>© 2025 বাংলা নিউজ পোর্টাল। সকল অধিকার সংরক্ষিত।</p>
            </div>
        </body>
        </html>
        """
        
        # Generate PDF
        pdf_buffer = BytesIO()
        HTML(string=html_content).write_pdf(pdf_buffer)
        
        return pdf_buffer.getvalue()
        
    except Exception as e:
        logging.error(f"Error generating PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF তৈরিতে সমস্যা: {str(e)}")

@api_router.get("/download-newspaper")
async def download_newspaper_pdf():
    """Download today's newspaper as PDF"""
    try:
        pdf_content = await generate_newspaper_pdf()
        
        # Create filename with today's date
        today = datetime.now(timezone.utc).date()
        filename = f"bangla_news_{today.strftime('%Y_%m_%d')}.pdf"
        
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        logging.error(f"Error downloading newspaper: {str(e)}")
        raise HTTPException(status_code=500, detail=f"সংবাদপত্র ডাউনলোড করতে সমস্যা: {str(e)}")

# Legacy status check endpoints
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()