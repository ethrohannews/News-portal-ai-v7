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
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Switch } from './components/ui/switch';
import { 
  Loader2, 
  Newspaper, 
  Zap, 
  Star, 
  Clock, 
  Eye, 
  TrendingUp, 
  Globe, 
  Download,
  Settings,
  Key,
  Shield,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Image as ImageIcon,
  Plus,
  Save
} from 'lucide-react';

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
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminAuth, setAdminAuth] = useState(null);
  const [adminSettings, setAdminSettings] = useState(null);
  const [fetchingBreaking, setFetchingBreaking] = useState(false);
  const [showBreakingNews, setShowBreakingNews] = useState(false);
  const [allBreakingNews, setAllBreakingNews] = useState([]);

  // Admin states
  const [adminForm, setAdminForm] = useState({
    username: '',
    password: ''
  });
  const [settingsForm, setSettingsForm] = useState({
    emergent_llm_key: '',
    auto_news_enabled: true
  });
  const [testNewsForm, setTestNewsForm] = useState({
    title: '',
    content: '',
    summary: '',
    category: 'রাজনীতি',
    author: 'সংবাদদাতা',
    image_url: '',
    is_featured: false,
    is_breaking: false
  });

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

  const fetchAllBreakingNews = async () => {
    try {
      const response = await axios.get(`${API}/breaking-news`);
      setAllBreakingNews(response.data);
    } catch (error) {
      console.error('Error fetching all breaking news:', error);
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
      const response = await axios.get(`${API}/download-newspaper`, {
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

  const fetchBreakingNewsFromSources = async () => {
    try {
      setFetchingBreaking(true);
      const response = await axios.post(`${API}/breaking-news/fetch`);
      
      // Refresh breaking news
      await fetchBreakingNews();
      await fetchAllBreakingNews();
      await fetchStats();
      
      alert(`${response.data.message}`);
      setShowBreakingNews(true);
      
    } catch (error) {
      console.error('Error fetching breaking news:', error);
      alert('ব্রেকিং নিউজ সংগ্রহে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setFetchingBreaking(false);
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

  // Admin functions
  const loginAdmin = async () => {
    try {
      const credentials = btoa(`${adminForm.username}:${adminForm.password}`);
      const response = await axios.get(`${API}/admin/settings`, {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });
      
      setAdminAuth(credentials);
      setAdminSettings(response.data);
      setSettingsForm({
        emergent_llm_key: response.data.emergent_llm_key,
        auto_news_enabled: response.data.auto_news_enabled
      });
      
      alert('অ্যাডমিন লগইন সফল!');
    } catch (error) {
      console.error('Admin login error:', error);
      alert('অ্যাডমিন লগইন ব্যর্থ! ইউজারনেম বা পাসওয়ার্ড ভুল।');
    }
  };

  const updateAdminSettings = async () => {
    try {
      if (!adminAuth) return;
      
      await axios.put(`${API}/admin/settings`, settingsForm, {
        headers: {
          'Authorization': `Basic ${adminAuth}`
        }
      });
      
      alert('সেটিংস সফলভাবে আপডেট হয়েছে!');
      
      // Refresh settings
      const response = await axios.get(`${API}/admin/settings`, {
        headers: {
          'Authorization': `Basic ${adminAuth}`
        }
      });
      setAdminSettings(response.data);
      
    } catch (error) {
      console.error('Settings update error:', error);
      alert('সেটিংস আপডেটে সমস্যা হয়েছে।');
    }
  };

  const createTestNews = async () => {
    try {
      if (!adminAuth) return;
      
      await axios.post(`${API}/admin/test-news`, testNewsForm, {
        headers: {
          'Authorization': `Basic ${adminAuth}`
        }
      });
      
      alert('টেস্ট সংবাদ সফলভাবে তৈরি হয়েছে!');
      
      // Reset form
      setTestNewsForm({
        title: '',
        content: '',
        summary: '',
        category: 'রাজনীতি',
        author: 'সংবাদদাতা',
        image_url: '',
        is_featured: false,
        is_breaking: false
      });
      
      // Refresh news
      await fetchNews();
      await fetchFeaturedNews();
      await fetchBreakingNews();
      await fetchStats();
      
    } catch (error) {
      console.error('Test news creation error:', error);
      alert('টেস্ট সংবাদ তৈরিতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/90 border-b border-orange-200/60 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-orange-600 to-red-600 p-3 rounded-xl shadow-lg">
                <Newspaper className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-800 to-red-700 bg-clip-text text-transparent">
                  বাংলা নিউজ পোর্টাল
                </h1>
                <p className="text-sm text-orange-600 font-medium">আধুনিক সংবাদ প্ল্যাটফর্ম</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Breaking News Button */}
              <Button
                onClick={fetchBreakingNewsFromSources}
                disabled={fetchingBreaking}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-all duration-300 animate-pulse"
              >
                {fetchingBreaking ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                ব্রেকিং নিউজ
              </Button>

              <Button
                onClick={downloadNewspaper}
                variant="outline"
                className="border-orange-500 text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-xl font-semibold shadow-md transition-all duration-300"
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
                  <TrendingUp className="w-4 h-4 mr-2" />
                )}
                দৈনিক সংবাদ তৈরি
              </Button>

              <Button
                onClick={() => setShowAdmin(true)}
                variant="outline"
                className="border-slate-400 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl font-semibold shadow-md transition-all duration-300"
              >
                <Settings className="w-4 h-4 mr-2" />
                অ্যাডমিন
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
              <Badge className="bg-white text-red-600 font-bold px-3 py-1 rounded-full animate-pulse">
                <Zap className="w-4 h-4 mr-1" />
                ব্রেকিং নিউজ
              </Badge>
              <div className="flex-1 overflow-hidden">
                <div className="animate-marquee whitespace-nowrap">
                  {breakingNews.map((article, index) => (
                    <span key={article.id} className="inline-block mr-12 font-medium cursor-pointer hover:underline" onClick={() => openArticle(article)}>
                      {article.title}
                      {index < breakingNews.length - 1 && ' • '}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => { fetchAllBreakingNews(); setShowBreakingNews(true); }}
                variant="outline"
                size="sm"
                className="border-white text-white hover:bg-white/20 rounded-lg"
              >
                সব দেখুন
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 font-medium">মোট সংবাদ</p>
                <p className="text-3xl font-bold text-blue-800">{stats.total_news || 0}</p>
              </div>
              <Newspaper className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-600 font-medium">ফিচার সংবাদ</p>
                <p className="text-3xl font-bold text-emerald-800">{stats.featured_news || 0}</p>
              </div>
              <Star className="w-8 h-8 text-emerald-500" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 font-medium">ব্রেকিং নিউজ</p>
                <p className="text-3xl font-bold text-red-800">{stats.breaking_news || 0}</p>
              </div>
              <Zap className="w-8 h-8 text-red-500" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
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
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-orange-200/40">
            <TabsList className="grid w-full grid-cols-5 md:grid-cols-9 gap-1">
              <TabsTrigger 
                value="সব" 
                onClick={() => handleCategoryChange('সব')}
                className="rounded-xl font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
              >
                সব
              </TabsTrigger>
              {categories.map((category) => (
                <TabsTrigger 
                  key={category} 
                  value={category}
                  onClick={() => handleCategoryChange(category)}
                  className="rounded-xl font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
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
                  {selectedCategory} এর জন্য সংবাদ তৈরি করুন
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
                      className="group hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-white to-yellow-50 border-yellow-200 shadow-lg"
                      onClick={() => openArticle(article)}
                    >
                      <div className="p-6">
                        {article.image_url && (
                          <div className="mb-4 rounded-lg overflow-hidden">
                            <img 
                              src={article.image_url} 
                              alt={article.title}
                              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-3">
                          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full">
                            <Star className="w-3 h-3 mr-1" />
                            ফিচার
                          </Badge>
                          <Badge variant="outline" className="text-slate-600">
                            {article.category}
                          </Badge>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-orange-600 transition-colors line-clamp-2">
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
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-lg text-slate-600">সংবাদ লোড হচ্ছে...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {news.map((article) => (
                  <Card 
                    key={article.id} 
                    className="group hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer bg-white/90 backdrop-blur-sm border-slate-200/60 shadow-lg"
                    onClick={() => openArticle(article)}
                  >
                    <div className="p-6">
                      {article.image_url && (
                        <div className="mb-4 rounded-lg overflow-hidden">
                          <img 
                            src={article.image_url} 
                            alt={article.title}
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-3">
                        <Badge 
                          variant="outline" 
                          className="text-slate-600 border-slate-300 bg-white/60"
                        >
                          {article.category}
                        </Badge>
                        {article.is_breaking && (
                          <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 rounded-full text-xs animate-pulse">
                            <Zap className="w-3 h-3 mr-1" />
                            ব্রেকিং
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-3 group-hover:text-orange-600 transition-colors line-clamp-2">
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
                        {article.source && (
                          <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {article.source}
                          </span>
                        )}
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
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-xl font-semibold"
                  >
                    {generating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <TrendingUp className="w-4 h-4 mr-2" />
                    )}
                    সংবাদ তৈরি করুন
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
                      {selectedArticle.source && (
                        <Badge variant="outline" className="text-xs">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          {selectedArticle.source}
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
                  {selectedArticle.image_url && (
                    <div className="rounded-lg overflow-hidden">
                      <img 
                        src={selectedArticle.image_url} 
                        alt={selectedArticle.title}
                        className="w-full h-64 object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="bg-slate-50 p-4 rounded-lg border-l-4 border-orange-500">
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

                  {selectedArticle.source_url && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <a 
                        href={selectedArticle.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        মূল সংবাদ দেখুন
                      </a>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Breaking News Modal */}
      <Dialog open={showBreakingNews} onOpenChange={setShowBreakingNews}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-600 flex items-center">
              <Zap className="w-6 h-6 mr-2" />
              সব ব্রেকিং নিউজ
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
              {allBreakingNews.map((article) => (
                <Card 
                  key={article.id} 
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 border-red-200"
                  onClick={() => {
                    setShowBreakingNews(false);
                    openArticle(article);
                  }}
                >
                  <div className="p-4">
                    {article.image_url && (
                      <div className="mb-3 rounded-lg overflow-hidden">
                        <img 
                          src={article.image_url} 
                          alt={article.title}
                          className="w-full h-32 object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className="bg-red-500 text-white text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        ব্রেকিং
                      </Badge>
                      {article.source && (
                        <Badge variant="outline" className="text-xs">
                          {article.source}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-800 mb-2 line-clamp-2 hover:text-red-600 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{article.summary}</p>
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
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
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Admin Panel Modal */}
      <Dialog open={showAdmin} onOpenChange={setShowAdmin}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center">
              <Shield className="w-6 h-6 mr-2" />
              অ্যাডমিন প্যানেল
            </DialogTitle>
          </DialogHeader>

          {!adminAuth ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">ইউজারনেম</Label>
                <Input
                  id="username"
                  value={adminForm.username}
                  onChange={(e) => setAdminForm({...adminForm, username: e.target.value})}
                  placeholder="অ্যাডমিন ইউজারনেম"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">পাসওয়ার্ড</Label>
                <Input
                  id="password"
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                  placeholder="অ্যাডমিন পাসওয়ার্ড"
                />
              </div>
              <Button onClick={loginAdmin} className="w-full">
                লগইন
              </Button>
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-4">
              <Tabs defaultValue="settings" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="settings">সেটিংস</TabsTrigger>
                  <TabsTrigger value="test-news">টেস্ট সংবাদ</TabsTrigger>
                  <TabsTrigger value="stats">পরিসংখ্যান</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-4">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Key className="w-5 h-5 mr-2" />
                      ইউনিভার্সাল কী ম্যানেজমেন্ট
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>বর্তমান কী</Label>
                        <Input
                          type="password"
                          value={settingsForm.emergent_llm_key}
                          onChange={(e) => setSettingsForm({...settingsForm, emergent_llm_key: e.target.value})}
                          placeholder="নতুন EMERGENT_LLM_KEY দিন"
                        />
                        {adminSettings?.last_key_update && (
                          <p className="text-sm text-slate-500">
                            শেষ আপডেট: {formatDate(adminSettings.last_key_update)}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settingsForm.auto_news_enabled}
                          onCheckedChange={(checked) => setSettingsForm({...settingsForm, auto_news_enabled: checked})}
                        />
                        <Label>অটো নিউজ আপলোডার</Label>
                      </div>
                      
                      <Button onClick={updateAdminSettings} className="flex items-center">
                        <Save className="w-4 h-4 mr-2" />
                        সেটিংস সেভ করুন
                      </Button>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="test-news" className="space-y-4">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Plus className="w-5 h-5 mr-2" />
                      ম্যানুয়াল টেস্ট সংবাদ তৈরি
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>শিরোনাম</Label>
                        <Input
                          value={testNewsForm.title}
                          onChange={(e) => setTestNewsForm({...testNewsForm, title: e.target.value})}
                          placeholder="সংবাদের শিরোনাম"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>সারাংশ</Label>
                        <Textarea
                          value={testNewsForm.summary}
                          onChange={(e) => setTestNewsForm({...testNewsForm, summary: e.target.value})}
                          placeholder="সংবাদের সারাংশ"
                          rows={3}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>বিস্তারিত</Label>
                        <Textarea
                          value={testNewsForm.content}
                          onChange={(e) => setTestNewsForm({...testNewsForm, content: e.target.value})}
                          placeholder="সংবাদের বিস্তারিত বিষয়বস্তু"
                          rows={6}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>ক্যাটাগরি</Label>
                          <Select value={testNewsForm.category} onValueChange={(value) => setTestNewsForm({...testNewsForm, category: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {NEWS_CATEGORIES.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>লেখক</Label>
                          <Input
                            value={testNewsForm.author}
                            onChange={(e) => setTestNewsForm({...testNewsForm, author: e.target.value})}
                            placeholder="লেখকের নাম"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>ছবির URL (ঐচ্ছিক)</Label>
                        <Input
                          value={testNewsForm.image_url}
                          onChange={(e) => setTestNewsForm({...testNewsForm, image_url: e.target.value})}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={testNewsForm.is_featured}
                            onCheckedChange={(checked) => setTestNewsForm({...testNewsForm, is_featured: checked})}
                          />
                          <Label>ফিচার সংবাদ</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={testNewsForm.is_breaking}
                            onCheckedChange={(checked) => setTestNewsForm({...testNewsForm, is_breaking: checked})}
                          />
                          <Label>ব্রেকিং নিউজ</Label>
                        </div>
                      </div>
                      
                      <Button onClick={createTestNews} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        টেস্ট সংবাদ তৈরি করুন
                      </Button>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="stats" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h4 className="font-semibold text-blue-600">মোট সংবাদ</h4>
                      <p className="text-2xl font-bold">{stats.total_news || 0}</p>
                    </Card>
                    <Card className="p-4">
                      <h4 className="font-semibold text-emerald-600">ফিচার সংবাদ</h4>
                      <p className="text-2xl font-bold">{stats.featured_news || 0}</p>
                    </Card>
                    <Card className="p-4">
                      <h4 className="font-semibold text-red-600">ব্রেকিং নিউজ</h4>
                      <p className="text-2xl font-bold">{stats.breaking_news || 0}</p>
                    </Card>
                    <Card className="p-4">
                      <h4 className="font-semibold text-purple-600">ক্যাটাগরি</h4>
                      <p className="text-2xl font-bold">{categories.length}</p>
                    </Card>
                  </div>
                  
                  {stats.category_stats && (
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3">ক্যাটাগরি অনুযায়ী সংবাদ</h4>
                      <div className="space-y-2">
                        {Object.entries(stats.category_stats).map(([category, count]) => (
                          <div key={category} className="flex justify-between">
                            <span>{category}</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-lg">
                <Newspaper className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold">বাংলা নিউজ পোর্টাল</h3>
            </div>
            <p className="text-slate-300 mb-4">
              আধুনিক বাংলা সংবাদ প্ল্যাটফর্ম - সত্য, নির্ভরযোগ্য এবং আপডেট সংবাদের জন্য
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