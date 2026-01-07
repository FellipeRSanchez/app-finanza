"use client";

import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  TrendingUp, 
  Landmark, 
  Search, 
  Database, 
  ArrowUp, 
  ChevronRight, 
  MoreVertical, 
  ChevronLeft,
  Plus,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Investimentos = () => {
  return (
    <MainLayout title="Investimentos">
      <div className="container mx-auto max-w-7xl p-4 lg:p-8">
        {/* Page Heading */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <span>Finanças</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-primary">Investimentos</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-4xl">
              Meus Investimentos
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Acompanhe a performance detalhada da sua carteira.
            </p>
          </div>
          <Button className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90">
            <Plus className="w-5 h-5" /> Novo Aporte
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#1e1629] p-6 shadow-sm transition-all hover:shadow-md border border-transparent dark:border-[#2d2438]">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/5 transition-transform group-hover:scale-110 dark:bg-primary/10"></div>
            <div className="relative z-10 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Landmark size={20} />
                <span className="text-sm font-medium">Total Investido</span>
              </div>
              <span className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-3xl">R$ 120.000,00</span>
            </div>
          </Card>
          
          <Card className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#1e1629] p-6 shadow-sm transition-all hover:shadow-md border border-transparent dark:border-[#2d2438]">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-emerald-500/5 transition-transform group-hover:scale-110 dark:bg-emerald-500/10"></div>
            <div className="relative z-10 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Wallet size={20} />
                <span className="text-sm font-medium">Saldo Atual</span>
              </div>
              <span className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-3xl">R$ 132.450,00</span>
            </div>
          </Card>

          <Card className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#1e1629] p-6 shadow-sm transition-all hover:shadow-md border border-transparent dark:border-[#2d2438]">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-emerald-500/5 transition-transform group-hover:scale-110 dark:bg-emerald-500/10"></div>
            <div className="relative z-10 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <TrendingUp size={20} />
                <span className="text-sm font-medium">Rentabilidade</span>
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 lg:text-3xl">+R$ 12.450,00</span>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <ArrowUp size={12} className="mr-1" /> 10,3%
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Content Area */}
        <Card className="flex flex-col gap-6 rounded-2xl bg-white dark:bg-[#1e1629] p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 h-10 w-10 p-2.5" />
              <Input className="block w-full rounded-xl border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary dark:border-[#2d2438] dark:bg-[#251b30] dark:text-white" placeholder="Buscar ativo..." />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary/90">Todos</Button>
              {['Ações', 'Renda Fixa', 'FIIs', 'Cripto'].map(chip => (
                <Button key={chip} variant="ghost" className="rounded-lg border border-slate-200 bg-white dark:border-[#2d2438] dark:bg-[#251b30] px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300">{chip}</Button>
              ))}
            </div>
          </div>

          <div className="relative overflow-x-auto rounded-xl border border-slate-100 dark:border-[#2d2438]">
            <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="bg-slate-50 text-xs uppercase text-slate-700 dark:bg-[#251b30] dark:text-slate-300">
                <tr>
                  <th className="px-6 py-4 font-semibold">Ativo</th>
                  <th className="px-6 py-4 font-semibold">Tipo</th>
                  <th className="px-6 py-4 font-semibold text-right">Preço Médio</th>
                  <th className="px-6 py-4 font-semibold text-right">Saldo Atual</th>
                  <th className="px-6 py-4 font-semibold text-right">Rentabilidade</th>
                  <th className="px-6 py-4 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2d2438]">
                {[
                  { symbol: 'AAPL34', name: 'Apple Inc.', type: 'Ações BDR', avg: 'R$ 42,50', cur: 'R$ 18.450,00', perf: '+R$ 2.450,00', pct: '15,31%', pos: true },
                  { symbol: 'Tesouro Selic', name: 'Vencimento 2027', type: 'Renda Fixa', avg: '-', cur: 'R$ 45.000,00', perf: '+R$ 3.120,00', pct: '7,45%', pos: true },
                  { symbol: 'MGLU3', name: 'Magazine Luiza', type: 'Ações Brasil', avg: 'R$ 12,40', cur: 'R$ 2.300,00', perf: '-R$ 2.700,00', pct: '-54,00%', pos: false }
                ].map((item, i) => (
                  <tr key={i} className="bg-white dark:bg-[#1e1629] transition-colors hover:bg-slate-50 dark:hover:bg-[#251b30]">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-[#2d2438] text-slate-600 dark:text-slate-300">
                          <Database size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{item.symbol}</span>
                          <span className="text-xs font-normal text-slate-500">{item.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset", 
                        item.type === 'Renda Fixa' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-purple-50 text-purple-700 ring-purple-700/10'
                      )}>{item.type}</span>
                    </td>
                    <td className="px-6 py-4 text-right">{item.avg}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">{item.cur}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className={cn("text-sm font-bold", item.pos ? "text-emerald-600" : "text-red-600")}>{item.perf}</span>
                        <span className={cn("text-xs", item.pos ? "text-emerald-600" : "text-red-600")}>{item.pct}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button variant="ghost" size="icon" className="rounded-full text-slate-400"><MoreVertical size={20} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-[#2d2438]">
            <span className="text-sm text-slate-500 dark:text-slate-400">Mostrando 1-3 de 12 ativos</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border border-slate-200 text-slate-400" disabled><ChevronLeft size={18} /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border border-slate-200 text-slate-400"><ChevronRight size={18} /></Button>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Investimentos;