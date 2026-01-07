"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface LancamentosHeaderProps {
  onNewLancamentoClick: () => void;
}

const LancamentosHeader: React.FC<LancamentosHeaderProps> = ({ onNewLancamentoClick }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black text-[#141118] dark:text-white tracking-tight">Lançamentos</h1>
        <p className="text-text-secondary-light dark:text-[#a08cb6] font-medium text-sm">Extrato financeiro detalhado</p>
      </div>
      
      <Button 
        onClick={onNewLancamentoClick}
        className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/25 transition-all"
      >
        <Plus className="w-5 h-5 mr-2" /> Novo Lançamento
      </Button>
    </div>
  );
};

export default LancamentosHeader;