import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { Card } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Separator } from './components/ui/separator';
import { ScrollArea } from './components/ui/scroll-area';
import { Loader2, Newspaper, Zap, Star, Clock, Eye, TrendingUp, Globe, Download } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NEWS_CATEGORIES = [
  "রাজনীতি",
  "খেলাধুলা", 
  "প্রযুক্তি",
  "বিনোদন",
  "অর্থনীতি",
  "আন্তর্জাতিক",
  "স্বাস্থ্য",
  "শিক্ষা"
];

function App() {
  const [news, setNews] = useState([]);
  const [categories, setCategories] = useState(NEWS_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('সব');
  const [featuredNews, setFeaturedNews] = useState([]);
  const [breakingNews, setBreakingNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState({});
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    fetchNews();
    fetchFeaturedNews();
    fetchBreakingNews();
    fetchStats();
  }, []);

  const fetchNews = async (category = null) => {
    try {
      setLoading(true);
      const params = category && category !== 'সব' ? { category } : {};
      const response = await axios.get(`${API}/news`, { params });
      setNews(response.data);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeaturedNews = async () => {
    try {
      const response = await axios.get(`${API}/news`, { 
        params: { featured: true, limit: 5 } 
      });
      setFeaturedNews(response.data);
    } catch (error) {
      console.error('Error fetching featured news:', error);
    }
  };

  const fetchBreakingNews = async () => {
    try {
      const response = await axios.get(`${API}/news`, { 
        params: { breaking: true, limit: 3 } 
      });
      setBreakingNews(response.data);
    } catch (error) {
      console.error('Error fetching breaking news:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/news/stats/overview`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const generateNews = async (category) => {
    try {
      setGenerating(true);
      await axios.post(`${API}/news/generate`, {
        category,
        count: 3
      });
      
      // Refresh news after generation
      await fetchNews(selectedCategory === 'সব' ? null : selectedCategory);
      await fetchFeaturedNews();
      await fetchStats();
      
    } catch (error) {
      console.error('Error generating news:', error);
      alert('সংবাদ তৈরিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setGenerating(false);
    }
  };

  const downloadNewspaper = async () => {
    try {
      const response = await axios.get(`${API}/news/download-newspaper`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get today's date for filename
      const today = new Date();
      const dateStr = today.getFullYear() + '_' + 
                     String(today.getMonth() + 1).padStart(2, '0') + '_' + 
                     String(today.getDate()).padStart(2, '0');
      
      link.setAttribute('download', `bangla_news_${dateStr}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading newspaper:', error);
      alert('সংবাদপত্র ডাউনলোড করতে সমস্যা হয়েছে।');
    }
  };

  const generateDailyNews = async () => {
    try {
      setGenerating(true);
      await axios.post(`${API}/news/daily-generate`);
      
      // Refresh all data
      await fetchNews();
      await fetchFeaturedNews();
      await fetchBreakingNews();
      await fetchStats();
      
      alert('দৈনিক সংবাদ সফলভাবে তৈরি হয়েছে!');
    } catch (error) {
      console.error('Error generating daily news:', error);
      alert('দৈনিক সংবাদ তৈরিতে সমস্যা হয়েছে।');
    } finally {
      setGenerating(false);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    fetchNews(category === 'সব' ? null : category);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openArticle = (article) => {
    setSelectedArticle(article);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-slate-200/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl">
                <Newspaper className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  বাংলা নিউজ পোর্টাল
                </h1>
                <p className="text-sm text-slate-500">AI চালিত আধুনিক সংবাদ প্ল্যাটফর্ম</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={downloadNewspaper}
                variant="outline"
                className="border-blue-500 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl font-semibold shadow-md transition-all duration-300"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF ডাউনলোড
              </Button>
              
              <Button
                onClick={generateDailyNews}
                disabled={generating}
                className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white px-6 py-2 rounded-xl font-semibold shadow-lg transition-all duration-300"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                দৈনিক সংবাদ তৈরি
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Breaking News Ticker */}
      {breakingNews.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-3 shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex items-center space-x-4">
              <Badge className="bg-white text-red-600 font-bold px-3 py-1 rounded-full">
                <Zap className="w-4 h-4 mr-1" />
                ব্রেকিং নিউজ
              </Badge>
              <div className="flex-1 overflow-hidden">
                <div className="animate-marquee whitespace-nowrap">
                  {breakingNews.map((article, index) => (
                    <span key={article.id} className="inline-block mr-12 font-medium">
                      {article.title}
                      {index < breakingNews.length - 1 && ' • '}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 font-medium">মোট সংবাদ</p>
                <p className="text-3xl font-bold text-blue-800">{stats.total_news || 0}</p>
              </div>
              <Newspaper className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-600 font-medium">ফিচার সংবাদ</p>
                <p className="text-3xl font-bold text-emerald-800">{stats.featured_news || 0}</p>
              </div>
              <Star className="w-8 h-8 text-emerald-500" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 font-medium">ব্রেকিং নিউজ</p>
                <p className="text-3xl font-bold text-red-800">{stats.breaking_news || 0}</p>
              </div>
              <Zap className="w-8 h-8 text-red-500" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 font-medium">ক্যাটাগরি</p>
                <p className="text-3xl font-bold text-purple-800">{categories.length}</p>
              </div>
              <Globe className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Category Tabs */}
        <Tabs defaultValue="সব" className="space-y-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-white/40">
            <TabsList className="grid w-full grid-cols-5 md:grid-cols-9 gap-1">
              <TabsTrigger 
                value="সব" 
                onClick={() => handleCategoryChange('সব')}
                className="rounded-xl font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
              >
                সব
              </TabsTrigger>
              {categories.map((category) => (
                <TabsTrigger 
                  key={category} 
                  value={category}
                  onClick={() => handleCategoryChange(category)}
                  className="rounded-xl font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value={selectedCategory} className="space-y-6">
            {/* AI Generation Button for specific category */}
            {selectedCategory !== 'সব' && (
              <div className="flex justify-center">
                <Button
                  onClick={() => generateNews(selectedCategory)}
                  disabled={generating}
                  className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <TrendingUp className="w-4 h-4 mr-2" />
                  )}
                  {selectedCategory} এর জন্য AI সংবাদ তৈরি করুন
                </Button>
              </div>
            )}

            {/* Featured News Section */}
            {featuredNews.length > 0 && selectedCategory === 'সব' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Star className="w-6 h-6 text-yellow-500" />
                  <h2 className="text-2xl font-bold text-slate-800">ফিচার সংবাদ</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {featuredNews.map((article) => (
                    <Card 
                      key={article.id} 
                      className="group hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-white to-yellow-50 border-yellow-200"
                      onClick={() => openArticle(article)}
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full">
                            <Star className="w-3 h-3 mr-1" />
                            ফিচার
                          </Badge>
                          <Badge variant="outline" className="text-slate-600">
                            {article.category}
                          </Badge>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                        <p className="text-slate-600 mb-4 line-clamp-3">{article.summary}</p>
                        <div className="flex items-center justify-between text-sm text-slate-500">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {formatDate(article.published_at)}
                            </span>
                            <span className="flex items-center">
                              <Eye className="w-4 h-4 mr-1" />
                              {article.views} দেখা হয়েছে
                            </span>
                          </div>
                          <span className="font-medium">{article.author}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <Separator className="my-8" />
              </div>
            )}

            {/* News Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-2 text-lg text-slate-600">সংবাদ লোড হচ্ছে...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {news.map((article) => (
                  <Card 
                    key={article.id} 
                    className="group hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer bg-white/80 backdrop-blur-sm border-slate-200/60"
                    onClick={() => openArticle(article)}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <Badge 
                          variant="outline" 
                          className="text-slate-600 border-slate-300 bg-white/60"
                        >
                          {article.category}
                        </Badge>
                        {article.is_breaking && (
                          <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 rounded-full text-xs">
                            <Zap className="w-3 h-3 mr-1" />
                            ব্রেকিং
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-slate-600 mb-4 line-clamp-3">{article.summary}</p>
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <div className="flex items-center space-x-3">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(article.published_at)}
                          </span>
                          <span className="flex items-center">
                            <Eye className="w-3 h-3 mr-1" />
                            {article.views}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {news.length === 0 && !loading && (
              <div className="text-center py-12">
                <Newspaper className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-600 mb-2">কোন সংবাদ পাওয়া যায়নি</h3>
                <p className="text-slate-500 mb-6">এই ক্যাটাগরিতে এখনো কোন সংবাদ নেই।</p>
                {selectedCategory !== 'সব' && (
                  <Button
                    onClick={() => generateNews(selectedCategory)}
                    disabled={generating}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold"
                  >
                    {generating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <TrendingUp className="w-4 h-4 mr-2" />
                    )}
                    AI দিয়ে সংবাদ তৈরি করুন
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Article Modal */}
      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline">{selectedArticle.category}</Badge>
                      {selectedArticle.is_featured && (
                        <Badge className="bg-yellow-500 text-white">
                          <Star className="w-3 h-3 mr-1" />
                          ফিচার
                        </Badge>
                      )}
                      {selectedArticle.is_breaking && (
                        <Badge className="bg-red-500 text-white">
                          <Zap className="w-3 h-3 mr-1" />
                          ব্রেকিং
                        </Badge>
                      )}
                    </div>
                    <DialogTitle className="text-2xl font-bold text-slate-800 leading-tight">
                      {selectedArticle.title}
                    </DialogTitle>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                  <div className="flex items-center space-x-4">
                    <span>লেখক: {selectedArticle.author}</span>
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatDate(selectedArticle.published_at)}
                    </span>
                    <span className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      {selectedArticle.views} দেখা হয়েছে
                    </span>
                  </div>
                </div>
              </DialogHeader>
              
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 pb-6">
                  <div className="bg-slate-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <p className="text-lg font-medium text-slate-700">{selectedArticle.summary}</p>
                  </div>
                  
                  <div className="text-slate-700 leading-relaxed space-y-4">
                    {selectedArticle.content.split('\n').map((paragraph, index) => (
                      paragraph.trim() && (
                        <p key={index} className="text-justify">
                          {paragraph}
                        </p>
                      )
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-2 rounded-lg">
                <Newspaper className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold">বাংলা নিউজ পোর্টাল</h3>
            </div>
            <p className="text-slate-300 mb-4">
              AI চালিত আধুনিক বাংলা সংবাদ প্ল্যাটফর্ম - সত্য, নির্ভরযোগ্য এবং আপডেট সংবাদের জন্য
            </p>
            <p className="text-slate-400 text-sm">
              © 2025 বাংলা নিউজ পোর্টাল। সকল অধিকার সংরক্ষিত।
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;