"use client";

import { Menu, Search, Bell, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

interface TopbarProps {
  onMenuClick: () => void;
  title: string; // Mantido para compatibilidade, mas o título pode ser gerenciado no MainLayout ou nas páginas
}

const Topbar = ({ onMenuClick, title }: TopbarProps) => {
  const { user } = useAuth();

  return (
    <header className="h-20 bg-card-light/80 dark:bg-[#1e1629]/80 backdrop-blur-md border-b border-border-light dark:border-[#2d2438] flex items-center justify-between px-6 md:px-8 shrink-0 z-10">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden text-text-secondary-light dark:text-text-secondary-dark hover:bg-background-light dark:hover:bg-[#2d2438]"
        >
          <Menu className="w-6 h-6" />
        </Button>
        <h2 className="text-xl font-bold text-text-main-light dark:text-text-main-dark hidden sm:block">{title}</h2>
      </div>

      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="hidden md:flex items-center bg-background-light dark:bg-[#2d2438] rounded-xl px-4 h-11 w-64 transition-all focus-within:w-80 focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark" />
          <Input
            className="bg-transparent border-none focus-visible:ring-0 text-sm w-full text-text-main-light dark:text-text-main-dark placeholder-text-secondary-light dark:placeholder-text-secondary-dark"
            placeholder="Buscar transações..."
            type="text"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="relative text-text-main-light dark:text-text-main-dark hover:bg-background-light dark:hover:bg-[#2d2438]"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-[#1e1629]"></span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex text-text-main-light dark:text-text-main-dark hover:bg-background-light dark:hover:bg-[#2d2438]"
          >
            {/* Placeholder for user avatar, replace with actual image if available */}
            <UserCircle className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;