import React, { createContext, useContext, useState } from 'react';

const SelectContext = createContext();

export const Select = ({ children, value, onValueChange, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleValueChange = (newValue) => {
    if (onValueChange) {
      onValueChange(newValue);
    }
    setIsOpen(false);
  };
  
  return (
    <SelectContext.Provider value={{ 
      value, 
      onValueChange: handleValueChange, 
      isOpen, 
      setIsOpen 
    }}>
      <div className="relative" {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger = ({ children, className = '', ...props }) => {
  const { isOpen, setIsOpen } = useContext(SelectContext);
  
  return (
    <button
      className={`w-full px-3 py-2 text-left border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
      onClick={() => setIsOpen(!isOpen)}
      {...props}
    >
      {children}
    </button>
  );
};

export const SelectValue = ({ placeholder = 'Select...', className = '' }) => {
  const { value } = useContext(SelectContext);
  
  return (
    <span className={className}>
      {value || placeholder}
    </span>
  );
};

export const SelectContent = ({ children, className = '' }) => {
  const { isOpen } = useContext(SelectContext);
  
  if (!isOpen) return null;
  
  return (
    <div className={`absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto ${className}`}>
      {children}
    </div>
  );
};

export const SelectItem = ({ children, value, className = '', ...props }) => {
  const { onValueChange } = useContext(SelectContext);
  
  return (
    <div
      className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${className}`}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </div>
  );
};