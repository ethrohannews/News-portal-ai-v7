import React from 'react';

export const Label = ({ children, className = '', ...props }) => {
  return (
    <label
      className={`block text-sm font-medium mb-1 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
};