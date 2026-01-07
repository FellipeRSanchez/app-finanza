"use client";

import { Menu, Search, Bell, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface TopbarProps {
  onMenuClick: () => void;
  title: string;
}

const Topbar = ({ onMenuClick, title }: TopbarProps) => {
  const [hideValues, setHideValues] = useState(false);

  return (
    <header className="h-20 flex items-center justify-between px-8 py-4 bg-white/80 dark:bg-[#191022]/90 backdrop-blur-md sticky top-0 z-10 border-b border-[#e0dbe6] dark:border-[#3a3045]">
      <div className="flex items-center gap-4 lg:hidden">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="text-text-main-light dark:text-white">
          <Menu className="w-6 h-6" />
        </Button>
        <span className="font-bold text-lg">{title}</span>
      </div>

      <div className="hidden lg:flex flex-col">
        <h2 className="text-xl font-bold leading-tight">{title}</h2>
        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium">Gerencie suas finanças em um só lugar</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input 
            className="h-10 pl-9 pr-4 rounded-xl bg-background-light dark:bg-[#2c2435] border-none text-sm focus-visible:ring-2 focus-visible:ring-primary/50 w-64 placeholder-gray-400 dark:text-white transition-all" 
            placeholder="Buscar..." 
            type="text"
          />
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setHideValues(!hideValues)}
          className="size-10 rounded-xl bg-background-light dark:bg-[#2c2435] text-text-main-light dark:text-white hover:bg-gray-200 dark:hover:bg-[#3a3045] transition-colors"
          title={hideValues ? "Mostrar valores" : "Ocultar valores"}
        >
          {hideValues ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </Button>

        <Button 
          variant="ghost" 
          size="icon"
          className="size-10 rounded-xl bg-background-light dark:bg-[#2c2435] text-text-main-light dark:text-white hover:bg-gray-200 dark:hover:bg-[#3a3045] transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-[#2c2435]"></span>
        </Button>
      </div>
    </header>
  );
};

export default Topbar;