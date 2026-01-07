"use client";

import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Wallet, 
  CreditCard, 
  BarChart3, 
  LogOut, 
  TrendingUp, 
  Upload,
  CheckCircle,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Visão Geral', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Lançamentos', href: '/lancamentos', icon: FileText },
  { name: 'Minhas Contas', href: '/patrimonio', icon: Wallet }, // Updated name
  { name: 'Cartões', href: '/cartoes', icon: CreditCard },
  { name: 'Investimentos', href: '/investimentos', icon: TrendingUp },
  { name: 'Importação', href: '/importacao-extratos', icon: Upload },
  { name: 'Fechamento', href: '/fechamento', icon: CheckCircle },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
];

const Sidebar = () => {
  const location = useLocation();
  const { signOut, user } = useAuth();

  return (
    <div className="h-full bg-white dark:bg-[#1e1629] border-r border-border-light dark:border-[#2d2438] flex flex-col shrink-0 z-20">
      {/* Branding Area */}
      <div className="p-8 pb-6 flex flex-col items-center gap-2">
        <img src="/logo.png" alt="Ratio Logo" className="h-12 w-12 object-contain" />
        <span className="text-[10px] font-black tracking-[0.2em] text-text-secondary-light dark:text-[#a08cb6] uppercase">
          Finanças Pro
        </span>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-4 flex flex-col gap-1 overflow-y-auto mt-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-4 px-4 py-3 rounded-xl transition-all group',
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-background-light dark:hover:bg-[#2d2438] hover:text-text-main-light dark:hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5",
                  isActive ? "text-white" : "group-hover:text-primary"
                )}
              />
              <span className={cn("text-sm font-medium", isActive && "font-bold")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
      
      {/* Footer Actions */}
      <div className="p-4 border-t border-border-light dark:border-[#2d2438] space-y-1">
        <Link
          to="/configuracoes"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group',
            location.pathname === '/configuracoes' ? 'bg-primary/10 text-primary' : 'text-text-secondary-light hover:bg-background-light'
          )}
        >
          <Settings className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Ajustes</span>
        </Link>
        <button
          onClick={signOut}
          className="flex items-center w-full gap-3 px-3 py-2.5 rounded-xl text-rose-600 dark:text-red-400 hover:bg-rose-50 dark:hover:bg-red-900/10 font-medium transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Sair da conta</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;