"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Calendar, Eye, Wallet, PiggyBank, Plus, TrendingUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Dashboard = () => {
  const { user } = useAuth();
  
  return (
    <MainLayout title="Painel Principal">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Welcome/Date */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-[#756189] dark:text-[#a08cb6] font-medium text-sm mb-1 capitalize">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
            <h1 className="text-3xl font-bold text-[#141118] dark:text-white tracking-tight">Bom dia, {user?.email?.split('@')[0]}! 👋</h1>
          </div>
          <Button variant="ghost" className="text-sm font-medium text-[#756189] dark:text-[#a08cb6] hover:text-primary dark:hover:text-primary transition-colors flex items-center gap-1">
            Filtro: Este Mês <ChevronDown className="w-4 h-4" />
          </Button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-[#141118] to-[#2d2438] rounded-2xl p-6 text-white shadow-xl shadow-gray-200 dark:shadow-none flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="flex justify-between items-start z-10">
              <div className="flex items-center gap-2 text-gray-300">
                <Wallet className="w-5 h-5" />
                <span className="text-sm font-medium">Saldo Total</span>
              </div>
              <button className="text-gray-400 hover:text-white transition-colors">
                <Eye className="w-5 h-5" />
              </button>
            </div>
            <div className="z-10 mt-4">
              <h2 className="text-3xl font-bold tracking-tight mb-1">R$ 124.500,00</h2>
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                  <TrendingUp className="w-3 h-3" /> +2.5%
                </span>
                <span className="text-xs text-gray-400">vs. mês anterior</span>
              </div>
            </div>
          </Card>

          <Card className="bg-white dark:bg-[#1e1629] rounded-2xl p-6 border border-[#f2f0f4] dark:border-[#2d2438] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <span className="text-[#756189] dark:text-[#a08cb6] text-sm font-medium">Receitas</span>
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-bold text-[#141118] dark:text-white tracking-tight">R$ 12.000,00</h2>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs font-medium mt-1">+10% este mês</p>
            </div>
          </Card>

          <Card className="bg-white dark:bg-[#1e1629] rounded-2xl p-6 border border-[#f2f0f4] dark:border-[#2d2438] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <span className="text-[#756189] dark:text-[#a08cb6] text-sm font-medium">Despesas</span>
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-bold text-[#141118] dark:text-white tracking-tight">R$ 4.500,00</h2>
              <p className="text-red-600 dark:text-red-400 text-xs font-medium mt-1">+5% este mês</p>
            </div>
          </Card>

          <Card className="bg-white dark:bg-[#1e1629] rounded-2xl p-6 border border-[#f2f0f4] dark:border-[#2d2438] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <span className="text-[#756189] dark:text-[#a08cb6] text-sm font-medium">Resultado</span>
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-bold text-[#141118] dark:text-white tracking-tight">R$ 7.500,00</h2>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs font-medium mt-1">+15% de margem</p>
            </div>
          </Card>
        </div>

        {/* Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white dark:bg-[#1e1629] rounded-2xl p-6 border border-[#f2f0f4] dark:border-[#2d2438] shadow-sm flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-[#141118] dark:text-white">Fluxo de Caixa</h3>
                <p className="text-sm text-[#756189] dark:text-[#a08cb6]">Entradas vs Saídas (6 Meses)</p>
              </div>
              <div className="flex gap-2 bg-[#f2f0f4] dark:bg-[#2d2438] p-1 rounded-lg">
                <Button variant="ghost" size="sm" className="bg-white dark:bg-[#362b45] text-[#141118] dark:text-white text-xs font-medium rounded shadow-sm">Mensal</Button>
                <Button variant="ghost" size="sm" className="text-[#756189] dark:text-[#a08cb6] text-xs font-medium">Anual</Button>
              </div>
            </div>
            {/* Custom Chart Implementation matching design */}
            <div className="flex-1 flex items-end justify-between gap-4 px-2 pt-8 pb-2">
              {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'].map((month, i) => (
                <div key={month} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group cursor-pointer">
                  <div className="flex gap-1 items-end w-full justify-center max-w-[40px]" style={{ height: `${30 + (i * 10)}%` }}>
                    <div className="w-full bg-emerald-400/80 rounded-t-sm h-[80%] group-hover:bg-emerald-500 transition-colors"></div>
                    <div className="w-full bg-red-400/80 rounded-t-sm h-[40%] group-hover:bg-red-500 transition-colors"></div>
                  </div>
                  <span className={cn("text-xs font-medium", i === 5 ? "text-primary font-bold" : "text-[#756189] dark:text-[#a08cb6]")}>{month}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-white dark:bg-[#1e1629] rounded-2xl p-6 border border-[#f2f0f4] dark:border-[#2d2438] shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#141118] dark:text-white">Minhas Contas</h3>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full bg-[#f2f0f4] dark:bg-[#362b45] flex items-center justify-center text-[#141118] dark:text-white hover:bg-[#e5e7eb] transition-colors">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-col gap-4 flex-1">
              {[
                { name: 'Nubank', type: 'Conta Corrente', value: 'R$ 5.200,00', color: '#820AD1' },
                { name: 'Itaú', type: 'Investimentos', value: 'R$ 110.000,00', color: '#EC7000' },
                { name: 'Bradesco', type: 'Poupança', value: 'R$ 8.500,00', color: '#dc2626' },
                { name: 'Carteira', type: 'Dinheiro', value: 'R$ 800,00', color: '#141118' }
              ].map((acc) => (
                <div key={acc.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#f7f6f8] dark:hover:bg-[#2d2438] transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs" 
                      style={{ backgroundColor: acc.color }}
                    >
                      {acc.name.substring(0, 2)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[#141118] dark:text-white">{acc.name}</span>
                      <span className="text-xs text-[#756189] dark:text-[#a08cb6]">{acc.type}</span>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-[#141118] dark:text-white">{acc.value}</p>
                </div>
              ))}
              <Button variant="outline" className="mt-auto w-full py-3 rounded-xl border border-[#f2f0f4] dark:border-[#362b45] text-sm font-medium text-[#756189] dark:text-[#a08cb6] hover:bg-[#f7f6f8] dark:hover:bg-[#2d2438] transition-colors">
                Gerenciar Contas
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;