import React from 'react';

export const Input = ({ 
  className = '', 
  type = 'text',
  placeholder = '',
  value,
  onChange,
  onKeyPress,
  ...props 
}) => {
  return (
    <input
      type={type}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyPress={onKeyPress}
      {...props}
    />
  );
};