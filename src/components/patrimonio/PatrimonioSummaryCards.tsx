"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { ArrowUpRight, Droplet, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatrimonioSummaryCardsProps {
  saldoDisponivel: number;
  totalAtivos: number;
  totalPassivos: number;
  formatCurrency: (value: number) => string;
}

const PatrimonioSummaryCards: React.FC<PatrimonioSummaryCardsProps> = ({
  saldoDisponivel,
  totalAtivos,
  totalPassivos,
  formatCurrency,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Saldo Disponível */}
      <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 overflow-hidden group">
        <p className="text-[#756189] text-[10px] font-black uppercase tracking-widest">Saldo Disponível</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{formatCurrency(saldoDisponivel)}</p>
          <ArrowUpRight className="text-emerald-500/30 group-hover:text-emerald-500 transition-colors" size={32} />
        </div>
      </Card>
      
      {/* Ativos */}
      <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 overflow-hidden group">
        <p className="text-[#756189] text-[10px] font-black uppercase tracking-widest">Ativos</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-2xl font-black text-[#141118] dark:text-white tracking-tight">{formatCurrency(totalAtivos)}</p>
          <Droplet className="text-blue-500/30 group-hover:text-blue-500 transition-colors" size={32} />
        </div>
      </Card>

      {/* Passivos */}
      <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 overflow-hidden group">
        <p className="text-[#756189] text-[10px] font-black uppercase tracking-widest">Passivos</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{formatCurrency(totalPassivos)}</p>
          <ArrowDownRight className="text-rose-500/30 group-hover:text-rose-500 transition-colors" size={32} />
        </div>
      </Card>
    </div>
  );
};

export default PatrimonioSummaryCards;