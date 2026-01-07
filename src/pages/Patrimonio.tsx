"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { TrendingUp, Wallet, Plus, ChevronRight, Download, ArrowUp, ArrowDown, Droplet, CreditCard, Home, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Patrimonio = () => {
  const { user } = useAuth();

  return (
    <MainLayout title="Visão Geral do Patrimônio">
      <div className="mx-auto max-w-[1000px] flex flex-col gap-6">
        {/* Hero Section */}
        <Card className="bg-white dark:bg-[#1e1629] rounded-2xl p-6 lg:p-8 shadow-sm border border-[#f2f0f4] dark:border-[#2d2438] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="flex flex-col gap-2 relative z-10">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-primary w-5 h-5" />
              <p className="text-[#756189] text-sm font-semibold uppercase tracking-wider">Patrimônio Líquido Total</p>
            </div>
            <h1 className="text-[#141118] dark:text-white text-4xl lg:text-5xl font-bold tracking-tight">R$ 1.250.400,00</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> +1.2%
              </span>
              <p className="text-sm text-gray-500">em relação ao mês passado</p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto relative z-10">
            <Button className="flex-1 md:flex-none h-11 px-5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary/20">
              <Plus className="w-4.5 h-4.5" /> Adicionar Ativo
            </Button>
            <Button variant="outline" className="flex-1 md:flex-none h-11 px-5 bg-white border border-[#e0dbe6] hover:bg-[#f9f8fa] text-[#141118] text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
              <Download className="w-4.5 h-4.5" /> Relatório
            </Button>
          </div>
        </Card>

        {/* Summary Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-[#1e1629] rounded-xl p-5 border border-[#f2f0f4] dark:border-[#2d2438] shadow-sm flex flex-col gap-1 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ArrowUp className="text-green-600 w-12 h-12" />
            </div>
            <p className="text-[#756189] text-sm font-medium">Ativos Totais</p>
            <p className="text-[#141118] dark:text-white text-2xl font-bold">R$ 1.300.000,00</p>
            <div className="flex items-center gap-1 text-green-600 text-xs font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" /> <span>0.5% este mês</span>
            </div>
          </Card>
          
          <Card className="bg-white dark:bg-[#1e1629] rounded-xl p-5 border border-[#f2f0f4] dark:border-[#2d2438] shadow-sm flex flex-col gap-1 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ArrowDown className="text-red-600 w-12 h-12" />
            </div>
            <p className="text-[#756189] text-sm font-medium">Passivos Totais</p>
            <p className="text-[#141118] dark:text-white text-2xl font-bold">R$ 49.600,00</p>
            <div className="flex items-center gap-1 text-red-600 text-xs font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" /> <span>2.1% este mês</span>
            </div>
          </Card>

          <Card className="bg-white dark:bg-[#1e1629] rounded-xl p-5 border border-[#f2f0f4] dark:border-[#2d2438] shadow-sm flex flex-col gap-1 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Droplet className="text-blue-600 w-12 h-12" />
            </div>
            <p className="text-[#756189] text-sm font-medium">Liquidez Imediata</p>
            <p className="text-[#141118] dark:text-white text-2xl font-bold">R$ 50.000,00</p>
            <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold mt-1">
              <span>Sem alteração</span>
            </div>
          </Card>
        </div>

        {/* Breakdown Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[#141118] dark:text-white text-lg font-bold">Quebra por Tipo</h3>
            <Button variant="link" className="text-primary text-sm font-semibold hover:underline">Ver Detalhes</Button>
          </div>

          <div className="bg-white dark:bg-[#1e1629] rounded-xl shadow-sm border border-[#f2f0f4] dark:border-[#2d2438] overflow-hidden">
            {[
              { icon: Landmark, name: 'Itaú Personalité', detail: 'Conta Corrente • Final 4920', type: 'Ativo', val: 'R$ 15.000,00', color: 'orange' },
              { icon: TrendingUp, name: 'XP Investimentos', detail: 'Carteira de Ações e FIIs', type: 'Ativo', val: 'R$ 800.000,00', color: 'yellow' },
              { icon: Wallet, name: 'Veículo Próprio', detail: 'BMW 320i 2022', type: 'Ativo', val: 'R$ 285.000,00', color: 'blue' },
              { icon: CreditCard, name: 'Nubank', detail: 'Cartão de Crédito (Fatura Aberta)', type: 'Passivo', val: '- R$ 2.400,00', color: 'purple' },
              { icon: Home, name: 'Financiamento Imobiliário', detail: 'Caixa Econômica - Restam 120 parcelas', type: 'Passivo', val: '- R$ 47.200,00', color: 'gray' }
            ].map((item, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center border-b border-[#f2f0f4] dark:border-[#2d2438] last:border-0 hover:bg-[#fcfbfc] dark:hover:bg-[#251b30] transition-colors">
                <div className="col-span-12 md:col-span-5 flex items-center gap-3">
                  <div className={cn("size-10 rounded-full flex items-center justify-center", 
                    item.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                    item.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                    item.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                    item.color === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                  )}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-[#141118] dark:text-white">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.detail}</p>
                  </div>
                </div>
                <div className="col-span-6 md:col-span-3 flex items-center">
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-md border",
                    item.type === 'Ativo' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                  )}>{item.type}</span>
                </div>
                <div className="col-span-6 md:col-span-4 text-right">
                  <p className={cn("font-bold", item.type === 'Passivo' ? 'text-red-600' : 'text-[#141118] dark:text-white')}>{item.val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Patrimonio;