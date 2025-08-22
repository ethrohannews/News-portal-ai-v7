import React from 'react';

export const Separator = ({ className = '' }) => {
  return (
    <div className={`border-t border-gray-200 ${className}`} />
  );
};