import React, { useState, useEffect, useMemo } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import axios from 'axios';
import './App.css';

// UI Components
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Switch } from './components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from './components/ui/sheet';

// Icons
import { 
  Newspaper, 
  TrendingUp, 
  Loader2, 
  Star, 
  Clock, 
  Eye, 
  Zap, 
  ExternalLink,
  Shield,
  Key,
  Plus,
  Save,
  BarChart3,
  Settings,
  Users,
  Activity,
  Globe,
  Cpu,
  Database,
  Wifi,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Home,
  ArrowLeft,
  Menu,
  X,
  Palette
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// News Categories
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
  return (
    <ThemeProvider>
      <NewsPortalContent />
    </ThemeProvider>
  );
}

function NewsPortalContent() {
  // Theme Hook
  const { isDarkMode, actualTheme } = useTheme();
  
  // State Management
  const [currentPage, setCurrentPage] = useState('home'); // 'home' or 'admin'
  const [news, setNews] = useState([]);
  const [featuredNews, setFeaturedNews] = useState([]);
  const [breakingNews, setBreakingNews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('সব');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Mobile states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Enhanced Breaking news ticker states
  const [breakingNewsTicker, setBreakingNewsTicker] = useState([]);
  const [currentTickerIndex, setCurrentTickerIndex] = useState(0);
  const [isBreakingNewsVisible, setIsBreakingNewsVisible] = useState(false);
  
  // Admin states
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminForm, setAdminForm] = useState({ username: '', password: '' });
  const [adminSettings, setAdminSettings] = useState(null);
  const [adminStats, setAdminStats] = useState({});
  const [settingsForm, setSettingsForm] = useState({
    emergent_llm_key: '',
    auto_news_enabled: true,
    breaking_news_interval: 15,
    auto_breaking_news: true
  });
  const [testNewsForm, setTestNewsForm] = useState({
    title: '',
    summary: '',
    content: '',
    category: 'রাজনীতি',
    author: 'সংবাদদাতা',
    image_url: '',
    is_featured: false,
    is_breaking: false
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';
    let ws;
    
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'breaking_news') {
            // Update breaking news when new ones arrive
            setBreakingNews(prev => [...data.data, ...prev]);
            setBreakingNewsTicker(prev => [
              ...data.data.map(article => ({ id: article.id, title: article.title })),
              ...prev
            ]);
            
            // Show breaking news banner with notification
            setIsBreakingNewsVisible(true);
            
            // Auto-hide after 30 seconds
            setTimeout(() => {
              setIsBreakingNewsVisible(false);
            }, 30000);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // Enhanced Breaking news ticker rotation with faster cycle for urgent news
  useEffect(() => {
    if (breakingNewsTicker.length > 0) {
      const interval = setInterval(() => {
        setCurrentTickerIndex(prev => (prev + 1) % breakingNewsTicker.length);
      }, 3000); // Faster rotation for breaking news urgency
      
      return () => clearInterval(interval);
    }
  }, [breakingNewsTicker]);

  // Load initial data
  useEffect(() => {
    loadCategories();
    loadNews();
    loadBreakingNews();
    loadBreakingNewsTicker();
  }, [selectedCategory]);

  // Auto-refresh breaking news ticker every 10 minutes
  useEffect(() => {
    const interval = setInterval(loadBreakingNewsTicker, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Show breaking news on page load if available
  useEffect(() => {
    if (breakingNewsTicker.length > 0) {
      setIsBreakingNewsVisible(true);
    }
  }, [breakingNewsTicker]);

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/categories`);
      setCategories(['সব', ...response.data.categories]);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadNews = async () => {
    setLoading(true);
    try {
      const params = selectedCategory !== 'সব' ? { category: selectedCategory } : {};
      const response = await axios.get(`${BACKEND_URL}/api/news`, { params });
      
      const articles = response.data;
      setNews(articles.filter(article => !article.is_featured));
      setFeaturedNews(articles.filter(article => article.is_featured));
    } catch (error) {
      console.error('Error loading news:', error);
    }
    setLoading(false);
  };

  const loadBreakingNews = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/breaking-news`);
      setBreakingNews(response.data);
    } catch (error) {
      console.error('Error loading breaking news:', error);
    }
  };

  const loadBreakingNewsTicker = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/breaking-news/latest`);
      setBreakingNewsTicker(response.data);
    } catch (error) {
      console.error('Error loading breaking news ticker:', error);
    }
  };

  const generateNews = async (category) => {
    setGenerating(true);
    try {
      await axios.post(`${BACKEND_URL}/api/news/generate`, {
        category,
        count: 3
      });
      loadNews();
    } catch (error) {
      console.error('Error generating news:', error);
      alert('সংবাদ তৈরিতে সমস্যা হয়েছে। অ্যাডমিন প্যানেল থেকে API কী চেক করুন।');
    }
    setGenerating(false);
  };

  const openArticle = async (article) => {
    setSelectedArticle(article);
    // Update view count
    try {
      await axios.get(`${BACKEND_URL}/api/news/${article.id}`);
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  };

  // Function to handle breaking news click
  const handleBreakingNewsClick = () => {
    if (breakingNewsTicker.length > 0) {
      const currentBreakingNews = breakingNewsTicker[currentTickerIndex];
      // Find the full article from breaking news
      const fullArticle = breakingNews.find(article => article.id === currentBreakingNews.id);
      if (fullArticle) {
        openArticle(fullArticle);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Admin functions
  const loginAdmin = async () => {
    try {
      const credentials = btoa(`${adminForm.username}:${adminForm.password}`);
      const response = await axios.get(`${BACKEND_URL}/api/admin/settings`, {
        headers: { Authorization: `Basic ${credentials}` }
      });
      
      setAdminAuth(credentials);
      setAdminSettings(response.data);
      setSettingsForm({
        emergent_llm_key: response.data.emergent_llm_key || '',
        auto_news_enabled: response.data.auto_news_enabled || true,
        breaking_news_interval: response.data.breaking_news_interval || 15,
        auto_breaking_news: response.data.auto_breaking_news || true
      });
      loadAdminStats();
    } catch (error) {
      alert('ভুল ইউজারনেম বা পাসওয়ার্ড');
    }
  };

  const loadAdminStats = async () => {
    if (!adminAuth) return;
    
    try {
      const response = await axios.get(`${BACKEND_URL}/api/admin/stats`, {
        headers: { Authorization: `Basic ${adminAuth}` }
      });
      setAdminStats(response.data);
    } catch (error) {
      console.error('Error loading admin stats:', error);
    }
  };

  const updateAdminSettings = async () => {
    try {
      await axios.put(`${BACKEND_URL}/api/admin/settings`, settingsForm, {
        headers: { Authorization: `Basic ${adminAuth}` }
      });
      alert('সেটিংস সফলভাবে আপডেট হয়েছে');
      
      const response = await axios.get(`${BACKEND_URL}/api/admin/settings`, {
        headers: { Authorization: `Basic ${adminAuth}` }
      });
      setAdminSettings(response.data);
    } catch (error) {
      alert('সেটিংস আপডেট করতে সমস্যা হয়েছে');
    }
  };

  const createTestNews = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/admin/test-news`, testNewsForm, {
        headers: { Authorization: `Basic ${adminAuth}` }
      });
      alert('টেস্ট সংবাদ সফলভাবে তৈরি হয়েছে');
      
      // Reset form
      setTestNewsForm({
        title: '',
        summary: '',
        content: '',
        category: 'রাজনীতি',
        author: 'সংবাদদাতা',
        image_url: '',
        is_featured: false,
        is_breaking: false
      });
      
      loadNews();
    } catch (error) {
      alert('টেস্ট সংবাদ তৈরি করতে সমস্যা হয়েছে');
    }
  };

  const generateAllCategoriesNews = async () => {
    try {
      setGenerating(true);
      const response = await axios.post(`${BACKEND_URL}/api/admin/generate-all-categories`, {}, {
        headers: { Authorization: `Basic ${adminAuth}` }
      });
      alert(`${response.data.message}\nমোট ক্যাটাগরি: ${response.data.categories_processed}টি`);
      loadAdminStats();
    } catch (error) {
      alert('সব ক্যাটাগরিতে সংবাদ তৈরি করতে সমস্যা হয়েছে');
    }
    setGenerating(false);
  };

  const forceBreakingNewsFetch = async () => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/admin/force-breaking-news`, {}, {
        headers: { Authorization: `Basic ${adminAuth}` }
      });
      alert(response.data.message);
      loadBreakingNews();
      loadBreakingNewsTicker();
    } catch (error) {
      alert('ব্রেকিং নিউজ সংগ্রহ করতে সমস্যা হয়েছে');
    }
  };

  // Render Admin Page
  if (currentPage === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
        {/* Admin Header */}
        <header className="bg-black/20 backdrop-blur-md border-b border-white/10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 md:space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentPage('home')}
                  className="text-white hover:bg-white/10 p-2 md:px-4"
                >
                  <ArrowLeft className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">হোম পেজে ফিরুন</span>
                </Button>
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className="bg-gradient-to-r from-cyan-400 to-blue-500 p-2 rounded-lg">
                    <Shield className="w-4 h-4 md:w-6 md:h-6 text-white" />
                  </div>
                  <div className="hidden md:block">
                    <h1 className="text-lg md:text-2xl font-bold text-white">অ্যাডমিন কন্ট্রোল প্যানেল</h1>
                    <p className="text-blue-200 text-xs md:text-sm">Advanced News Portal Management</p>
                  </div>
                </div>
              </div>
              
              {adminAuth && (
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className="hidden md:flex items-center space-x-2 bg-green-500/20 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-300 text-sm">সিস্টেম সক্রিয়</span>
                  </div>
                  
                  {/* Theme Toggle in Admin */}
                  <ThemeToggle />
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAdminAuth(false);
                      setAdminForm({ username: '', password: '' });
                    }}
                    className="text-white border-white/20 hover:bg-white/10 text-xs md:text-sm p-2 md:px-4"
                  >
                    <span className="hidden md:inline">লগ আউট</span>
                    <X className="w-4 h-4 md:hidden" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
          {!adminAuth ? (
            // Login Form
            <div className="max-w-md mx-auto">
              <Card className="bg-black/40 backdrop-blur-md border-white/10 p-4 md:p-8">
                <div className="text-center mb-6">
                  <div className="bg-gradient-to-r from-cyan-400 to-blue-500 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-2">অ্যাডমিন লগইন</h2>
                  <p className="text-slate-300 text-sm md:text-base">সিস্টেমে প্রবেশ করার জন্য লগইন করুন</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">ইউজারনেম</Label>
                    <Input
                      value={adminForm.username}
                      onChange={(e) => setAdminForm({...adminForm, username: e.target.value})}
                      placeholder="অ্যাডমিন ইউজারনেম"
                      className="bg-black/20 border-white/20 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">পাসওয়ার্ড</Label>
                    <Input
                      type="password"
                      value={adminForm.password}
                      onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                      placeholder="অ্যাডমিন পাসওয়ার্ড"
                      className="bg-black/20 border-white/20 text-white placeholder:text-slate-400"
                      onKeyPress={(e) => e.key === 'Enter' && loginAdmin()}
                    />
                  </div>
                  <Button onClick={loginAdmin} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                    <Shield className="w-4 h-4 mr-2" />
                    লগইন করুন
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            // Admin Dashboard - Mobile Optimized
            <div className="space-y-4 md:space-y-8">
              {/* Quick Stats - Mobile Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md border-white/10 p-3 md:p-6">
                  <div className="flex flex-col md:flex-row items-center md:justify-between">
                    <div className="text-center md:text-left">
                      <p className="text-blue-200 text-xs md:text-sm font-medium">মোট সংবাদ</p>
                      <p className="text-xl md:text-3xl font-bold text-white">{adminStats.total_news || 0}</p>
                    </div>
                    <Newspaper className="w-5 h-5 md:w-8 md:h-8 text-blue-400 mt-1 md:mt-0" />
                  </div>
                </Card>
                
                <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-md border-white/10 p-3 md:p-6">
                  <div className="flex flex-col md:flex-row items-center md:justify-between">
                    <div className="text-center md:text-left">
                      <p className="text-emerald-200 text-xs md:text-sm font-medium">ফিচার সংবাদ</p>
                      <p className="text-xl md:text-3xl font-bold text-white">{adminStats.featured_news || 0}</p>
                    </div>
                    <Star className="w-5 h-5 md:w-8 md:h-8 text-emerald-400 mt-1 md:mt-0" />
                  </div>
                </Card>
                
                <Card className="bg-gradient-to-br from-red-500/20 to-orange-500/20 backdrop-blur-md border-white/10 p-3 md:p-6">
                  <div className="flex flex-col md:flex-row items-center md:justify-between">
                    <div className="text-center md:text-left">
                      <p className="text-red-200 text-xs md:text-sm font-medium">ব্রেকিং নিউজ</p>
                      <p className="text-xl md:text-3xl font-bold text-white">{adminStats.breaking_news || 0}</p>
                    </div>
                    <Zap className="w-5 h-5 md:w-8 md:h-8 text-red-400 mt-1 md:mt-0" />
                  </div>
                </Card>
                
                <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md border-white/10 p-3 md:p-6">
                  <div className="flex flex-col md:flex-row items-center md:justify-between">
                    <div className="text-center md:text-left">
                      <p className="text-purple-200 text-xs md:text-sm font-medium">আজকের সংবাদ</p>
                      <p className="text-xl md:text-3xl font-bold text-white">{adminStats.today_news || 0}</p>
                    </div>
                    <Activity className="w-5 h-5 md:w-8 md:h-8 text-purple-400 mt-1 md:mt-0" />
                  </div>
                </Card>
              </div>

              {/* Main Dashboard */}
              <Tabs defaultValue="overview" className="space-y-6">
                <div className="overflow-x-auto">
                  <TabsList className="bg-black/40 backdrop-blur-md border-white/10 w-full md:w-auto">
                    <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white/20 text-xs md:text-sm px-2 md:px-4">ওভারভিউ</TabsTrigger>
                    <TabsTrigger value="settings" className="text-white data-[state=active]:bg-white/20 text-xs md:text-sm px-2 md:px-4">সিস্টেম সেটিংস</TabsTrigger>
                    <TabsTrigger value="content" className="text-white data-[state=active]:bg-white/20 text-xs md:text-sm px-2 md:px-4">কন্টেন্ট ম্যানেজমেন্ট</TabsTrigger>
                    <TabsTrigger value="analytics" className="text-white data-[state=active]:bg-white/20 text-xs md:text-sm px-2 md:px-4">অ্যানালিটিক্স</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* System Health - Mobile Optimized */}
                    <Card className="bg-black/40 backdrop-blur-md border-white/10 p-4 md:p-6">
                      <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center">
                        <Cpu className="w-4 h-4 md:w-5 md:h-5 mr-2 text-cyan-400" />
                        সিস্টেম হেল্থ
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Database className="w-4 h-4 text-green-400" />
                            <span className="text-slate-300 text-sm md:text-base">ডাটাবেস</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-sm">সক্রিয়</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Globe className="w-4 h-4 text-blue-400" />
                            <span className="text-slate-300 text-sm md:text-base">API স্ট্যাটাস</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-sm">অনলাইন</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Wifi className="w-4 h-4 text-orange-400" />
                            <span className="text-slate-300 text-sm md:text-base">ব্রেকিং নিউজ</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-sm">স্বয়ংক্রিয়</span>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Recent Activities - Mobile Optimized */}
                    <Card className="bg-black/40 backdrop-blur-md border-white/10 p-4 md:p-6">
                      <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center">
                        <Activity className="w-4 h-4 md:w-5 md:h-5 mr-2 text-purple-400" />
                        সাম্প্রতিক কার্যক্রম
                      </h3>
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {adminStats.recent_activities?.map((activity, index) => (
                          <div key={index} className="flex items-start space-x-3 p-2 md:p-3 bg-white/5 rounded-lg">
                            <div className="flex-shrink-0">
                              {activity.is_breaking ? (
                                <Zap className="w-4 h-4 text-red-400 mt-0.5" />
                              ) : activity.is_featured ? (
                                <Star className="w-4 h-4 text-yellow-400 mt-0.5" />
                              ) : (
                                <Newspaper className="w-4 h-4 text-blue-400 mt-0.5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs md:text-sm text-white font-medium truncate">{activity.title}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">
                                  {activity.category}
                                </Badge>
                                <span className="text-xs text-slate-400">
                                  {formatDate(activity.timestamp)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  {/* Quick Actions - Mobile Grid */}
                  <Card className="bg-black/40 backdrop-blur-md border-white/10 p-4 md:p-6">
                    <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center">
                      <RefreshCw className="w-4 h-4 md:w-5 md:h-5 mr-2 text-cyan-400" />
                      কুইক অ্যাকশন
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                      <Button
                        onClick={generateAllCategoriesNews}
                        disabled={generating}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-xs md:text-sm"
                      >
                        {generating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        সব ক্যাটাগরিতে নিউজ
                      </Button>
                      <Button
                        onClick={forceBreakingNewsFetch}
                        className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-xs md:text-sm"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        ব্রেকিং নিউজ আপডেট
                      </Button>
                      <Button
                        onClick={loadAdminStats}
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-xs md:text-sm"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        স্ট্যাটাস রিফ্রেশ
                      </Button>
                      <Button
                        onClick={() => axios.delete(`${BACKEND_URL}/api/admin/clear-test-data`, {
                          headers: { Authorization: `Basic ${adminAuth}` }
                        }).then(() => {
                          alert('টেস্ট ডেটা মুছে দেওয়া হয়েছে');
                          loadAdminStats();
                        })}
                        variant="destructive"
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-xs md:text-sm"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        টেস্ট ডেটা মুছুন
                      </Button>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-6">
                  <Card className="bg-black/40 backdrop-blur-md border-white/10 p-4 md:p-6">
                    <h3 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6 flex items-center">
                      <Settings className="w-4 h-4 md:w-5 md:h-5 mr-2 text-cyan-400" />
                      সিস্টেম কনফিগারেশন
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                      {/* API Settings */}
                      <div className="space-y-4">
                        <h4 className="text-base md:text-lg font-medium text-white flex items-center">
                          <Key className="w-4 h-4 mr-2 text-yellow-400" />
                          API কনফিগারেশন
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-slate-300 text-sm md:text-base">Emergent LLM Key</Label>
                            <Input
                              type="password"
                              value={settingsForm.emergent_llm_key}
                              onChange={(e) => setSettingsForm({...settingsForm, emergent_llm_key: e.target.value})}
                              placeholder="নতুন API কী যোগ করুন"
                              className="bg-black/20 border-white/20 text-white placeholder:text-slate-400"
                            />
                            {adminSettings?.last_key_update && (
                              <p className="text-xs text-slate-400 mt-1">
                                শেষ আপডেট: {formatDate(adminSettings.last_key_update)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Automation Settings */}
                      <div className="space-y-4">
                        <h4 className="text-base md:text-lg font-medium text-white flex items-center">
                          <Cpu className="w-4 h-4 mr-2 text-green-400" />
                          অটোমেশন সেটিংস
                        </h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <div>
                              <Label className="text-white text-sm md:text-base">AI সংবাদ জেনারেশন</Label>
                              <p className="text-xs md:text-sm text-slate-400">স্বয়ংক্রিয় সংবাদ তৈরি সক্রিয়</p>
                            </div>
                            <Switch
                              checked={settingsForm.auto_news_enabled}
                              onCheckedChange={(checked) => setSettingsForm({...settingsForm, auto_news_enabled: checked})}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <div>
                              <Label className="text-white text-sm md:text-base">অটো ব্রেকিং নিউজ</Label>
                              <p className="text-xs md:text-sm text-slate-400">স্বয়ংক্রিয় ব্রেকিং নিউজ সংগ্রহ</p>
                            </div>
                            <Switch
                              checked={settingsForm.auto_breaking_news}
                              onCheckedChange={(checked) => setSettingsForm({...settingsForm, auto_breaking_news: checked})}
                            />
                          </div>

                          <div>
                            <Label className="text-slate-300 text-sm md:text-base">ব্রেকিং নিউজ চেক ইন্টারভাল (মিনিট)</Label>
                            <Select 
                              value={settingsForm.breaking_news_interval.toString()} 
                              onValueChange={(value) => setSettingsForm({...settingsForm, breaking_news_interval: parseInt(value)})}
                            >
                              <SelectTrigger className="bg-black/20 border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">১০ মিনিট</SelectItem>
                                <SelectItem value="15">১৫ মিনিট</SelectItem>
                                <SelectItem value="30">৩০ মিনিট</SelectItem>
                                <SelectItem value="60">১ ঘন্টা</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-white/10">
                      <Button onClick={updateAdminSettings} className="w-full md:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                        <Save className="w-4 h-4 mr-2" />
                        সেটিংস সেভ করুন
                      </Button>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="content" className="space-y-6">
                  <Card className="bg-black/40 backdrop-blur-md border-white/10 p-4 md:p-6">
                    <h3 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6 flex items-center">
                      <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2 text-green-400" />
                      নতুন সংবাদ তৈরি করুন
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-slate-300 text-sm md:text-base">শিরোনাম</Label>
                          <Input
                            value={testNewsForm.title}
                            onChange={(e) => setTestNewsForm({...testNewsForm, title: e.target.value})}
                            placeholder="সংবাদের শিরোনাম"
                            className="bg-black/20 border-white/20 text-white placeholder:text-slate-400"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-slate-300 text-sm md:text-base">সারাংশ</Label>
                          <Textarea
                            value={testNewsForm.summary}
                            onChange={(e) => setTestNewsForm({...testNewsForm, summary: e.target.value})}
                            placeholder="সংবাদের সারাংশ"
                            rows={3}
                            className="bg-black/20 border-white/20 text-white placeholder:text-slate-400"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-slate-300 text-sm md:text-base">ক্যাটাগরি</Label>
                            <Select value={testNewsForm.category} onValueChange={(value) => setTestNewsForm({...testNewsForm, category: value})}>
                              <SelectTrigger className="bg-black/20 border-white/20 text-white">
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
                          
                          <div>
                            <Label className="text-slate-300 text-sm md:text-base">লেখক</Label>
                            <Input
                              value={testNewsForm.author}
                              onChange={(e) => setTestNewsForm({...testNewsForm, author: e.target.value})}
                              placeholder="লেখকের নাম"
                              className="bg-black/20 border-white/20 text-white placeholder:text-slate-400"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-slate-300 text-sm md:text-base">ছবির URL (ঐচ্ছিক)</Label>
                          <Input
                            value={testNewsForm.image_url}
                            onChange={(e) => setTestNewsForm({...testNewsForm, image_url: e.target.value})}
                            placeholder="https://example.com/image.jpg"
                            className="bg-black/20 border-white/20 text-white placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label className="text-slate-300 text-sm md:text-base">বিস্তারিত বিষয়বস্তু</Label>
                          <Textarea
                            value={testNewsForm.content}
                            onChange={(e) => setTestNewsForm({...testNewsForm, content: e.target.value})}
                            placeholder="সংবাদের বিস্তারিত বিষয়বস্তু লিখুন..."
                            rows={6} 
                            className="bg-black/20 border-white/20 text-white placeholder:text-slate-400"
                          />
                        </div>
                        
                        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={testNewsForm.is_featured}
                              onCheckedChange={(checked) => setTestNewsForm({...testNewsForm, is_featured: checked})}
                            />
                            <Label className="text-slate-300 text-sm md:text-base">ফিচার সংবাদ</Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={testNewsForm.is_breaking}
                              onCheckedChange={(checked) => setTestNewsForm({...testNewsForm, is_breaking: checked})}
                            />
                            <Label className="text-slate-300 text-sm md:text-base">ব্রেকিং নিউজ</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-white/10">
                      <Button onClick={createTestNews} className="w-full md:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                        <Plus className="w-4 h-4 mr-2" />
                        সংবাদ প্রকাশ করুন
                      </Button>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6">
                  {/* Category Statistics */}
                  <Card className="bg-black/40 backdrop-blur-md border-white/10 p-4 md:p-6">
                    <h3 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6 flex items-center">
                      <BarChart3 className="w-4 h-4 md:w-5 md:h-5 mr-2 text-purple-400" />
                      ক্যাটাগরি অনুযায়ী পরিসংখ্যান
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {adminStats.category_stats && Object.entries(adminStats.category_stats).map(([category, count]) => (
                        <div key={category} className="bg-white/5 p-3 md:p-4 rounded-lg">
                          <h4 className="text-white font-medium text-sm md:text-base">{category}</h4>
                          <p className="text-xl md:text-2xl font-bold text-cyan-400">{count}</p>
                          <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                            <div 
                              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min((count / Math.max(...Object.values(adminStats.category_stats))) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Home Page - Mobile Responsive
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      {/* Enhanced Breaking News Ticker - More Animated and Colorful */}
      {breakingNewsTicker.length > 0 && isBreakingNewsVisible && (
        <div className="breaking-news-ticker py-3 px-2 md:px-4 overflow-hidden sticky top-0 z-50">
          <div className="flex items-center">
            <div className="breaking-label flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full mr-3 md:mr-4 flex-shrink-0">
              <Zap className="w-3 h-3 md:w-4 md:h-4 animate-pulse text-white" />
              <span className="breaking-text font-bold text-xs md:text-sm text-white">ব্রেকিং নিউজ</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div 
                className="animate-marquee-fast whitespace-nowrap breaking-news-clickable"
                onClick={handleBreakingNewsClick}
              >
                <span className="breaking-text text-sm md:text-lg font-bold text-white cursor-pointer hover:text-yellow-300 transition-colors duration-300">
                  🔥 {breakingNewsTicker[currentTickerIndex]?.title} 🔥
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBreakingNewsVisible(false)}
              className="text-white hover:bg-white/20 p-1 ml-2 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Header - Mobile Responsive */}
      <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-orange-100">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 md:p-3 rounded-xl shadow-lg">
                <Newspaper className="w-5 h-5 md:w-8 md:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  বাংলা নিউজ পোর্টাল
                </h1>
                <p className="text-slate-600 text-xs md:text-base hidden md:block">আধুনিক বাংলা সংবাদ প্ল্যাটফর্ম</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Breaking News Status Indicator */}
              {breakingNewsTicker.length > 0 && (
                <div className="hidden md:flex items-center space-x-2 bg-red-100 px-3 py-1 rounded-full">
                  <Zap className="w-3 h-3 text-red-600 animate-pulse" />
                  <span className="text-red-600 text-xs font-medium">{breakingNewsTicker.length} ব্রেকিং নিউজ</span>
                </div>
              )}
              
              {/* Theme Toggle */}
              <ThemeToggle />
              
              <Button
                onClick={() => setCurrentPage('admin')}
                variant="outline"
                className="border-orange-200 text-orange-600 hover:bg-orange-50 text-xs md:text-sm p-2 md:px-4 md:py-2"
              >
                <Shield className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                <span className="hidden md:inline">অ্যাডমিন প্যানেল</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Mobile Responsive */}
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-4 md:space-y-8">
          <div className="flex justify-center">
            {/* Mobile: Horizontal scroll tabs */}
            <div className="md:hidden w-full overflow-x-auto">
              <div className="min-w-max">
                <TabsList className="bg-white/70 backdrop-blur-sm p-1 shadow-lg border border-orange-100 flex w-max">
                  {categories.map((category) => (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className="px-3 py-2 text-slate-700 font-medium rounded-lg transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white text-sm whitespace-nowrap flex-shrink-0"
                    >
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>
            
            {/* Desktop: Regular tabs */}
            <div className="hidden md:block">
              <TabsList className="bg-white/70 backdrop-blur-sm p-1 shadow-lg border border-orange-100">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="px-6 py-3 text-slate-700 font-medium rounded-lg transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
                  >
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <TabsContent value={selectedCategory} className="space-y-4 md:space-y-6">
            {/* Featured News Section - Mobile Optimized */}
            {featuredNews.length > 0 && selectedCategory === 'সব' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
                  <h2 className="text-xl md:text-2xl font-bold text-slate-800">ফিচার সংবাদ</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  {featuredNews.map((article) => (
                    <Card 
                      key={article.id} 
                      className="group hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-white to-yellow-50 border-yellow-200 shadow-lg"
                      onClick={() => openArticle(article)}
                    >
                      <div className="p-4 md:p-6">
                        {article.image_url && (
                          <div className="mb-4 rounded-lg overflow-hidden">
                            <img 
                              src={article.image_url} 
                              alt={article.title}
                              className="w-full h-32 md:h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-3">
                          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-2 md:px-3 py-1 rounded-full text-xs md:text-sm">
                            <Star className="w-3 h-3 mr-1" />
                            ফিচার
                          </Badge>
                          <Badge variant="outline" className="text-slate-600 text-xs md:text-sm">
                            {article.category}
                          </Badge>
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-3 group-hover:text-orange-600 transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                        <p className="text-slate-600 mb-4 line-clamp-3 text-sm md:text-base">{article.summary}</p>
                        <div className="flex items-center justify-between text-xs md:text-sm text-slate-500">
                          <div className="flex items-center space-x-2 md:space-x-4">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                              {formatDate(article.published_at)}
                            </span>
                            <span className="flex items-center">
                              <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                              {article.views} দেখা হয়েছে
                            </span>
                          </div>
                          <span className="font-medium text-xs md:text-sm">{article.author}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <Separator className="my-6 md:my-8" />
              </div>
            )}

            {/* News Grid - Mobile Responsive */}
            {loading ? (
              <div className="flex items-center justify-center py-8 md:py-12">
                <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-base md:text-lg text-slate-600">সংবাদ লোড হচ্ছে...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {news.map((article) => (
                  <Card 
                    key={article.id} 
                    className="group hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer bg-white/90 backdrop-blur-sm border-slate-200/60 shadow-lg"
                    onClick={() => openArticle(article)}
                  >
                    <div className="p-4 md:p-6">
                      {article.image_url && (
                        <div className="mb-4 rounded-lg overflow-hidden">
                          <img 
                            src={article.image_url} 
                            alt={article.title}
                            className="w-full h-24 md:h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-3">
                        <Badge 
                          variant="outline" 
                          className="text-slate-600 border-slate-300 bg-white/60 text-xs md:text-sm"
                        >
                          {article.category}
                        </Badge>
                        {article.is_breaking && (
                          <Badge className="breaking-badge bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 rounded-full text-xs">
                            <Zap className="w-3 h-3 mr-1" />
                            ব্রেকিং
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-base md:text-lg font-bold text-slate-800 mb-3 group-hover:text-orange-600 transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-slate-600 mb-4 line-clamp-3 text-sm md:text-base">{article.summary}</p>
                      <div className="flex items-center justify-between text-xs md:text-sm text-slate-500">
                        <div className="flex items-center space-x-2 md:space-x-3">
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
              <div className="text-center py-8 md:py-12">
                <Newspaper className="w-12 h-12 md:w-16 md:h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg md:text-xl font-semibold text-slate-600 mb-2">কোন সংবাদ পাওয়া যায়নি</h3>
                <p className="text-slate-500 mb-6 text-sm md:text-base">এই ক্যাটাগরিতে এখনো কোন সংবাদ নেই।</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Article Modal - Mobile Responsive */}
      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] md:max-h-[80vh] overflow-hidden mx-2 md:mx-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2 flex-wrap">
                      <Badge variant="outline" className="text-xs md:text-sm">{selectedArticle.category}</Badge>
                      {selectedArticle.is_featured && (
                        <Badge className="bg-yellow-500 text-white text-xs md:text-sm">
                          <Star className="w-3 h-3 mr-1" />
                          ফিচার
                        </Badge>
                      )}
                      {selectedArticle.is_breaking && (
                        <Badge className="breaking-badge bg-red-500 text-white text-xs md:text-sm">
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
                    <DialogTitle className="text-lg md:text-2xl font-bold text-slate-800 leading-tight">
                      {selectedArticle.title}
                    </DialogTitle>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs md:text-sm text-slate-500 mb-4 flex-wrap gap-2">
                  <div className="flex items-center space-x-2 md:space-x-4 flex-wrap">
                    <span>লেখক: {selectedArticle.author}</span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      {formatDate(selectedArticle.published_at)}
                    </span>
                    <span className="flex items-center">
                      <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      {selectedArticle.views} দেখা হয়েছে
                    </span>
                  </div>
                </div>
              </DialogHeader>
              
              <ScrollArea className="flex-1 pr-2 md:pr-4">
                <div className="space-y-4 pb-6">
                  {selectedArticle.image_url && (
                    <div className="rounded-lg overflow-hidden">
                      <img 
                        src={selectedArticle.image_url} 
                        alt={selectedArticle.title}
                        className="w-full h-48 md:h-64 object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="bg-slate-50 p-3 md:p-4 rounded-lg border-l-4 border-orange-500">
                    <p className="text-base md:text-lg font-medium text-slate-700">{selectedArticle.summary}</p>
                  </div>
                  
                  <div className="text-slate-700 leading-relaxed space-y-4 text-sm md:text-base">
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
                        className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm md:text-base"
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

      {/* Footer - Mobile Responsive */}
      <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-6 md:py-8 mt-8 md:mt-16">
        <div className="container mx-auto px-3 md:px-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-lg">
                <Newspaper className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-bold">বাংলা নিউজ পোর্টাল</h3>
            </div>
            <p className="text-slate-300 mb-4 text-sm md:text-base">
              আধুনিক বাংলা সংবাদ প্ল্যাটফর্ম - সত্য, নির্ভরযোগ্য এবং আপডেট সংবাদের জন্য
            </p>
            <p className="text-slate-400 text-xs md:text-sm">
              © 2025 বাংলা নিউজ পোর্টাল। সকল অধিকার সংরক্ষিত।
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;