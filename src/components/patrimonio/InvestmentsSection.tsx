"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Plus, FileText, Settings, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import AddInvestmentForm from '@/components/investments/AddInvestmentForm';
import { useNavigate } from 'react-router-dom';

interface InvestmentsSectionProps {
  loading: boolean;
  investimentos: any[];
  contas: any[]; // For investment accounts
  formatCurrency: (value: number) => string;
  fetchPatrimonioData: () => void;
  handleOpenDeleteConfirm: (id: string, table: string, name: string) => void;
  setEditingConta: (conta: any) => void;
  setContaModalOpen: (open: boolean) => void;
}

const InvestmentsSection: React.FC<InvestmentsSectionProps> = ({
  loading,
  investimentos,
  contas,
  formatCurrency,
  fetchPatrimonioData,
  handleOpenDeleteConfirm,
  setEditingConta,
  setContaModalOpen,
}) => {
  const navigate = useNavigate();

  const getAccountIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'investimento': return TrendingUp;
      default: return TrendingUp;
    }
  };

  const investmentAccounts = contas.filter(acc => acc.con_tipo === 'investimento');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-[#141118] dark:text-white">Investimentos</h3>
        <AddInvestmentForm onInvestmentAdded={fetchPatrimonioData} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={`loading-invest-${i}`} className="h-32 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))
        ) : (
          <>
            {investmentAccounts.map((conta) => {
              const Icon = getAccountIcon(conta.con_tipo);
              const isNegative = conta.saldoAtual < 0;
              return (
                <Card 
                  key={conta.con_id}
                  className="group bg-white dark:bg-[#1e1629] rounded-3xl p-6 shadow-soft border-border-light dark:border-[#2d2438] hover:shadow-hover hover:border-primary/20 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-2xl bg-background-light dark:bg-[#2c2435] flex items-center justify-center text-[#756189] group-hover:text-primary transition-colors">
                        <Icon size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#141118] dark:text-white group-hover:text-primary transition-colors">{conta.con_nome}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#756189]">Conta de Investimento</p>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/lancamentos?account=${conta.con_id}`); }}>
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingConta(conta); setContaModalOpen(true); }}>
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); handleOpenDeleteConfirm(conta.con_id, 'contas', conta.con_nome); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#756189] mb-1">Saldo Atual</p>
                    <p className={cn(
                      "text-2xl font-black tracking-tight",
                      isNegative ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {formatCurrency(conta.saldoAtual)}
                    </p>
                  </div>
                </Card>
              );
            })}
            {investimentos.length === 0 && investmentAccounts.length === 0 ? (
              <div className="col-span-full py-10 text-center bg-background-light/50 rounded-3xl border-2 border-dashed border-border-light dark:border-[#2d2438]">
                <AlertCircle className="mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-4" size={48} />
                <p className="text-sm font-bold text-[#756189] uppercase tracking-widest">Nenhum investimento cadastrado.</p>
              </div>
            ) : (
              investimentos.map((inv) => {
                const isNegative = Number(inv.inv_current_value || 0) < 0;
                return (
                  <Card 
                    key={inv.inv_id}
                    className="group bg-white dark:bg-[#1e1629] rounded-3xl p-6 shadow-soft border-border-light dark:border-[#2d2438] hover:shadow-hover hover:border-primary/20 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-background-light dark:bg-[#2c2435] flex items-center justify-center text-[#756189] group-hover:text-primary transition-colors">
                          <TrendingUp size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-[#141118] dark:text-white group-hover:text-primary transition-colors">{inv.inv_name}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#756189]">{inv.inv_type}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/investimentos?id=${inv.inv_id}`); }}>
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); /* setEditingInvestment(inv); setInvestmentModalOpen(true); */ }}>
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); handleOpenDeleteConfirm(inv.inv_id, 'investimentos', inv.inv_name); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#756189] mb-1">Saldo Atual</p>
                      <p className={cn(
                        "text-2xl font-black tracking-tight",
                        isNegative ? "text-rose-600" : "text-emerald-600"
                      )}>
                        {formatCurrency(Number(inv.inv_current_value || 0))}
                      </p>
                    </div>
                  </Card>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InvestmentsSection;