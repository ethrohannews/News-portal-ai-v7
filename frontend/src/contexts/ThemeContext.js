import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('system');
  const [actualTheme, setActualTheme] = useState('light');

  // Function to get system theme
  const getSystemTheme = () => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // Function to apply theme to document
  const applyTheme = (themeToApply) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(themeToApply);
    setActualTheme(themeToApply);
  };

  // Initialize theme on component mount
  useEffect(() => {
    // Get saved theme from localStorage or default to 'system'
    const savedTheme = localStorage.getItem('news-portal-theme') || 'system';
    setTheme(savedTheme);

    // Determine actual theme to apply
    let themeToApply;
    if (savedTheme === 'system') {
      themeToApply = getSystemTheme();
    } else {
      themeToApply = savedTheme;
    }

    applyTheme(themeToApply);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      if (theme === 'system') {
        const newTheme = e.matches ? 'dark' : 'light';
        applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setThemeMode = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('news-portal-theme', newTheme);

    // Apply the theme
    let themeToApply;
    if (newTheme === 'system') {
      themeToApply = getSystemTheme();
    } else {
      themeToApply = newTheme;
    }

    applyTheme(themeToApply);
  };

  const value = {
    theme,
    actualTheme,
    setTheme: setThemeMode,
    isSystemTheme: theme === 'system',
    isDarkMode: actualTheme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};