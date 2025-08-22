import React, { createContext, useContext, useState } from 'react';

const TabsContext = createContext();

export const Tabs = ({ children, value, onValueChange, defaultValue, className = '', ...props }) => {
  const [activeTab, setActiveTab] = useState(value || defaultValue);
  
  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
    if (onValueChange) {
      onValueChange(newValue);
    }
  };
  
  return (
    <TabsContext.Provider value={{ activeTab: value || activeTab, onTabChange: handleTabChange }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 ${className}`}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  );
};

export const TabsTrigger = ({ children, value, className = '', ...props }) => {
  const { activeTab, onTabChange } = useContext(TabsContext);
  const isActive = activeTab === value;
  
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive 
          ? 'bg-white text-gray-950 shadow-sm' 
          : 'hover:bg-white/50'
      } ${className}`}
      onClick={() => onTabChange(value)}
      role="tab"
      aria-selected={isActive}
      {...props}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ children, value, className = '', ...props }) => {
  const { activeTab } = useContext(TabsContext);
  
  if (activeTab !== value) {
    return null;
  }
  
  return (
    <div
      className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${className}`}
      role="tabpanel"
      {...props}
    >
      {children}
    </div>
  );
};