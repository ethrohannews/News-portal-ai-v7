import React from 'react';

export const Badge = ({ 
  children, 
  className = '', 
  variant = 'default',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full';
  
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    outline: 'border border-gray-200 text-gray-600 bg-white'
  };
  
  const variantClasses = variants[variant] || variants.default;
  
  return (
    <span
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};