import React from 'react';
import { Button } from './ui/button';
import { Sun } from 'lucide-react';

export const ThemeToggle = () => {
  const handleClick = () => {
    console.log('Simple theme toggle clicked!');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="h-9 w-9 rounded-lg border border-orange-200 bg-white/70 hover:bg-orange-50 text-slate-700"
    >
      <Sun className="h-4 w-4 text-orange-600" />
      <span className="sr-only">থিম পরিবর্তন করুন</span>
    </Button>
  );
};