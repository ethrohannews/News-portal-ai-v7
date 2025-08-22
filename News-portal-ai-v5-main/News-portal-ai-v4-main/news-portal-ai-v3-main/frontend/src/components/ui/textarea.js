import React from 'react';

export const Textarea = ({ 
  className = '', 
  placeholder = '',
  value,
  onChange,
  rows = 3,
  ...props 
}) => {
  return (
    <textarea
      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      {...props}
    />
  );
};