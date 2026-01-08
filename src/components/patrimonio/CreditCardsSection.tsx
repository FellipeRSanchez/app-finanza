"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus, FileText, Settings, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import ContaModal from '@/components/contas/ContaModal';

interface CreditCardsSectionProps {
  loading: boolean;
  contas: any[]; // Filtered for credit cards
  formatCurrency: (value: number) => string;
  handleOpenDeleteConfirm: (id: string, table: string, name: string) => void;
  setEditingConta: (conta: any) => void;
  setContaModalOpen: (open: boolean) => void;
  contaModalOpen: boolean;
  editingConta: any;
  fetchPatrimonioData: () => void;
  groupId: string;
}

const CreditCardsSection: React.FC<CreditCardsSectionProps> = ({
  loading,
  contas,
  formatCurrency,
  handleOpenDeleteConfirm,
  setEditingConta,
  setContaModalOpen,
  contaModalOpen,
  editingConta,
  fetchPatrimonioData,
  groupId,
}) => {
  const navigate = useNavigate();
  const creditCardAccounts = contas.filter(acc => acc.con_tipo === 'cartao');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-[#141118] dark:text-white">Cartões de Crédito</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/cartoes')}
          className="size-10 rounded-xl bg-background-light dark:bg-[#2c2435] text-text-main-light dark:text-white hover:bg-gray-200 dark:hover:bg-[#3a3045] transition-colors"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={`loading-cartao-${i}`} className="h-32 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))
        ) : creditCardAccounts.length === 0 ? (
          <div className="col-span-full py-10 text-center bg-background-light/50 rounded-3xl border-2 border-dashed border-border-light dark:border-[#2d2438]">
            <AlertCircle className="mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-4" size={48} />
            <p className="text-sm font-bold text-[#756189] uppercase tracking-widest">Nenhum cartão de crédito cadastrado.</p>
          </div>
        ) : (
          creditCardAccounts.map((cartao) => {
            const isNegative = cartao.saldoAtual < 0;
            return (
              <Card 
                key={cartao.con_id}
                className="group bg-white dark:bg-[#1e1629] rounded-3xl p-6 shadow-soft border-border-light dark:border-[#2d2438] hover:shadow-hover hover:border-primary/20 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-background-light dark:bg-[#2c2435] flex items-center justify-center text-[#756189] group-hover:text-primary transition-colors">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#141118] dark:text-white group-hover:text-primary transition-colors">{cartao.con_nome}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#756189]">Limite: {formatCurrency(Number(cartao.con_limite || 0))}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/cartoes?id=${cartao.con_id}`); }}>
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingConta(cartao); setContaModalOpen(true); }}>
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); handleOpenDeleteConfirm(cartao.con_id, 'contas', cartao.con_nome); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-6">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#756189] mb-1">Fatura Atual</p>
                  <p className={cn(
                    "text-2xl font-black tracking-tight",
                    isNegative ? "text-rose-600" : "text-emerald-600"
                  )}>
                    {formatCurrency(cartao.saldoAtual)}
                  </p>
                </div>
              </Card>
            );
          })
        )}
      </div>
      <ContaModal 
        open={contaModalOpen}
        onOpenChange={setContaModalOpen}
        onSuccess={fetchPatrimonioData}
        conta={editingConta}
        grupoId={groupId}
      />
    </div>
  );
};

export default CreditCardsSection;