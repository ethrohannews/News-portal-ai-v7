import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';

export const ThemeToggle = () => {
  const { theme, actualTheme, setTheme, isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  console.log('ThemeToggle rendered:', { theme, actualTheme, isDarkMode });

  const handleClick = () => {
    console.log('Theme toggle clicked, current theme:', theme);
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getCurrentIcon = () => {
    if (theme === 'system') {
      return Monitor;
    }
    return actualTheme === 'dark' ? Moon : Sun;
  };

  const CurrentIcon = getCurrentIcon();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
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
  );
};