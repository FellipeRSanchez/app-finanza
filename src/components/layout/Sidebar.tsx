"use client";

import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Wallet, 
  CreditCard, 
  BarChart3, 
  Settings, 
  LogOut, 
  UserCircle, 
  TrendingUp, 
  Upload,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Visão Geral', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transações', href: '/lancamentos', icon: FileText },
  { name: 'Contas', href: '/patrimonio', icon: Wallet },
  { name: 'Cartões', href: '/cartoes', icon: CreditCard },
  { name: 'Investimentos', href: '/investimentos', icon: TrendingUp },
  { name: 'Importação', href: '/importacao-extratos', icon: Upload },
  { name: 'Fechamento', href: '/fechamento', icon: CheckCircle },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
];

const settingsNavigation = [
  { name: 'Ajustes', href: '/configuracoes', icon: Settings },
];

const Sidebar = () => {
  const location = useLocation();
  const { signOut, user } = useAuth();

  return (
    <div className="h-full bg-card-light dark:bg-[#1e1629] border-r border-border-light dark:border-[#2d2438] flex flex-col shrink-0 z-20">
      {/* Logo Area */}
      <div className="p-8 pb-6 flex items-center gap-3">
        <div className="bg-primary-new/10 flex items-center justify-center rounded-xl w-10 h-10 text-primary-new">
          <Wallet className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-main-light dark:text-white">Finanças</h1>
          <p className="text-text-secondary-light dark:text-text-secondary-dark text-xs font-medium uppercase tracking-wider">Premium</p>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-4 flex flex-col gap-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-4 px-4 py-3 rounded-xl transition-all group',
                isActive
                  ? 'bg-primary-new text-white shadow-lg shadow-primary-new/20'
                  : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-background-light dark:hover:bg-[#2d2438] hover:text-text-main-light dark:hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5",
                  isActive ? "text-white" : "group-hover:text-primary-new"
                )}
              />
              <span className={cn("text-sm font-medium", isActive && "font-bold")}>
                {item.name}
              </span>
            </Link>
          );
        })}
        
        <div className="mt-4 pt-4 border-t border-border-light dark:border-[#2d2438]">
          <p className="px-4 text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-2">
            Configurações
          </p>
          {settingsNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-4 px-4 py-3 rounded-xl transition-all group',
                  isActive
                    ? 'bg-primary-new text-white shadow-lg shadow-primary-new/20'
                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-background-light dark:hover:bg-[#2d2438] hover:text-text-main-light dark:hover:text-white'
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5",
                    isActive ? "text-white" : "group-hover:text-primary-new"
                  )}
                />
                <span className={cn("text-sm font-medium", isActive && "font-bold")}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
      
      {/* User Profile and Sign Out */}
      <div className="p-4 border-t border-border-light dark:border-[#2d2438]">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-background-light dark:hover:bg-[#2d2438] cursor-pointer transition-colors overflow-hidden">
          <div className="bg-background-light dark:bg-[#2d2438] rounded-full h-10 w-10 border-2 border-white dark:border-[#2d2438] shadow-sm flex items-center justify-center shrink-0">
            <UserCircle className="w-full h-full text-gray-400 dark:text-gray-600" />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm font-bold text-text-main-light dark:text-white truncate">
              {user?.email?.split('@')[0] || 'Usuário'}
            </h3>
            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark truncate">
              Plano Premium
            </p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center w-full gap-3 px-3 py-2.5 mt-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 font-medium transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Sair da conta</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;