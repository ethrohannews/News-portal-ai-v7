from fastapi import FastAPI, APIRouter, HTTPException, Query, BackgroundTasks, Response
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
import asyncio
from weasyprint import HTML, CSS
from io import BytesIO
import tempfile

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

# Define Models
class NewsArticle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    summary: str
    category: str
    author: str = "AI সংবাদদাতা"
    published_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    image_url: Optional[str] = None
    is_featured: bool = False
    is_breaking: bool = False
    views: int = 0

class NewsArticleCreate(BaseModel):
    title: str
    content: str
    summary: str
    category: str
    author: Optional[str] = "AI সংবাদদাতা"
    image_url: Optional[str] = None
    is_featured: bool = False
    is_breaking: bool = False

class GenerateNewsRequest(BaseModel):
    category: str
    count: int = 5

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# AI News Generation Function
async def generate_news_with_ai(category: str, count: int = 1) -> List[dict]:
    """Generate news articles using AI for a specific category"""
    
    # Initialize AI chat
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="AI API key not configured")
    
    chat = LlmChat(
        api_key=api_key,
        session_id=f"news-generation-{category}",
        system_message=f"""আপনি একজন পেশাদার বাংলা সংবাদকর্মী। আপনার কাজ হলো {category} বিভাগের জন্য সাম্প্রতিক এবং আকর্ষণীয় সংবাদ তৈরি করা।

নিয়মাবলী:
1. প্রতিটি সংবাদ বাংলায় লিখুন
2. সংবাদের শিরোনাম আকর্ষণীয় হতে হবে
3. সংবাদের মূল বিষয়বস্তু তথ্যপূর্ণ এবং বিস্তারিত হতে হবে (কমপক্ষে ৩০০ শব্দ)
4. একটি সংক্ষিপ্ত সারাংশ দিন (৫০-৮০ শব্দ)
5. সংবাদটি বর্তমান সময়ের সাথে প্রাসঙ্গিক হতে হবে

JSON ফরম্যাটে উত্তর দিন। শুধুমাত্র JSON object return করুন, অন্য কোনো text নয়।"""
    ).with_model("openai", "gpt-4o-mini")
    
    articles = []
    
    for i in range(count):
        try:
            user_message = UserMessage(
                text=f"{category} বিভাগের জন্য একটি নতুন এবং আকর্ষণীয় সংবাদ তৈরি করুন। এটি আজকের তারিখ অনুযায়ী প্রাসঙ্গিক হতে হবে।"
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

# Routes
@api_router.get("/")
async def root():
    return {"message": "বাংলা নিউজ পোর্টাল API"}

@api_router.get("/categories")
async def get_categories():
    return {"categories": NEWS_CATEGORIES}

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

# Daily Auto News Generation
@api_router.post("/news/daily-generate")
async def generate_daily_news(background_tasks: BackgroundTasks):
    """Generate daily news for all categories"""
    try:
        total_generated = 0
        results = {}
        
        for category in NEWS_CATEGORIES:
            try:
                articles_data = await generate_news_with_ai(category, 2)  # 2 articles per category
                
                saved_count = 0
                for article_data in articles_data:
                    article = NewsArticle(**article_data)
                    article_dict = article.dict()
                    await db.news_articles.insert_one(article_dict)
                    saved_count += 1
                
                results[category] = saved_count
                total_generated += saved_count
                
            except Exception as e:
                logging.error(f"Error generating daily news for {category}: {str(e)}")
                results[category] = 0
        
        return {
            "message": f"দৈনিক সংবাদ তৈরি সম্পন্ন! মোট {total_generated}টি সংবাদ তৈরি হয়েছে",
            "results": results
        }
        
    except Exception as e:
        logging.error(f"Error in daily news generation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"দৈনিক সংবাদ তৈরিতে সমস্যা: {str(e)}")

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
                <div class="tagline">AI চালিত আধুনিক সংবাদ প্ল্যাটফর্ম</div>
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
                <p>এই সংবাদপত্রটি AI প্রযুক্তি ব্যবহার করে তৈরি করা হয়েছে।</p>
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

@api_router.get("/news/download-newspaper")
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