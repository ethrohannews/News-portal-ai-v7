import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';

export const ThemeToggle = () => {
  const { theme, actualTheme, setTheme, isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    {
      key: 'light',
      label: 'লাইট মোড',
      icon: Sun,
      description: 'সাদা ব্যাকগ্রাউন্ড'
    },
    {
      key: 'dark',
      label: 'ডার্ক মোড',
      icon: Moon,
      description: 'কালো ব্যাকগ্রাউন্ড'
    },
    {
      key: 'system',
      label: 'সিস্টেম',
      icon: Monitor,
      description: 'সিস্টেমের সেটিং অনুযায়ী'
    }
  ];

  const getCurrentIcon = () => {
    if (theme === 'system') {
      return Monitor;
    }
    return actualTheme === 'dark' ? Moon : Sun;
  };

  const CurrentIcon = getCurrentIcon();

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`
            relative h-9 w-9 rounded-lg border transition-all duration-200
            ${isDarkMode 
              ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 text-slate-200' 
              : 'border-orange-200 bg-white/70 hover:bg-orange-50 text-slate-700'
            }
          `}
        >
          <CurrentIcon className={`h-4 w-4 transition-all duration-200 ${
            isDarkMode ? 'text-slate-300' : 'text-orange-600'
          }`} />
          <span className="sr-only">থিম পরিবর্তন করুন</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className={`
          w-48 p-2 border rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200
          ${isDarkMode 
            ? 'bg-slate-800/90 border-slate-700 text-slate-200' 
            : 'bg-white/90 border-orange-200 text-slate-700'
          }
        `}
      >
        <div className={`
          px-2 py-1.5 text-xs font-medium border-b mb-1
          ${isDarkMode 
            ? 'text-slate-400 border-slate-700' 
            : 'text-slate-500 border-orange-100'
          }
        `}>
          <div className="flex items-center space-x-1">
            <Palette className="w-3 h-3" />
            <span>থিম সিলেক্ট করুন</span>
          </div>
        </div>
        
        {themes.map(({ key, label, icon: Icon, description }) => (
          <DropdownMenuItem
            key={key}
            onClick={() => {
              setTheme(key);
              setIsOpen(false);
            }}
            className={`
              flex items-center space-x-3 px-2 py-2.5 rounded-md cursor-pointer transition-all duration-200
              ${theme === key 
                ? (isDarkMode 
                    ? 'bg-slate-700/60 text-slate-100' 
                    : 'bg-orange-100 text-orange-900'
                  )
                : (isDarkMode 
                    ? 'hover:bg-slate-700/40 text-slate-300' 
                    : 'hover:bg-orange-50 text-slate-700'
                  )
              }
            `}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 ${
              theme === key 
                ? (isDarkMode ? 'text-slate-200' : 'text-orange-600')
                : (isDarkMode ? 'text-slate-400' : 'text-slate-500')
            }`} />
            <div className="flex-1 min-w-0">
              <div className={`font-medium text-sm ${
                theme === key 
                  ? (isDarkMode ? 'text-slate-100' : 'text-orange-900')
                  : (isDarkMode ? 'text-slate-300' : 'text-slate-700')
              }`}>
                {label}
              </div>
              <div className={`text-xs ${
                isDarkMode ? 'text-slate-500' : 'text-slate-500'
              }`}>
                {description}
              </div>
            </div>
            {theme === key && (
              <div className={`w-2 h-2 rounded-full ${
                isDarkMode ? 'bg-slate-300' : 'bg-orange-500'
              }`} />
            )}
          </DropdownMenuItem>
        ))}
        
        <div className={`
          px-2 py-1.5 text-xs border-t mt-1 pt-2
          ${isDarkMode 
            ? 'text-slate-500 border-slate-700' 
            : 'text-slate-400 border-orange-100'
          }
        `}>
          বর্তমান: {actualTheme === 'dark' ? 'ডার্ক মোড' : 'লাইট মোড'}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};