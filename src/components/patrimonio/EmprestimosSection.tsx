"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Plus, Settings, Trash2, AlertCircle, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import EmprestimoModal from '@/components/patrimonio/EmprestimoModal';

interface EmprestimosSectionProps {
  loading: boolean;
  emprestimos: any[];
  formatCurrency: (value: number) => string;
  setEditingEmprestimo: (item: any) => void;
  setEmprestimoModalOpen: (open: boolean) => void;
  handleOpenDeleteConfirm: (id: string, table: string, name: string) => void;
  emprestimoModalOpen: boolean;
  editingEmprestimo: any;
  fetchPatrimonioData: () => void;
}

const EmprestimosSection: React.FC<EmprestimosSectionProps> = ({
  loading,
  emprestimos,
  formatCurrency,
  setEditingEmprestimo,
  setEmprestimoModalOpen,
  handleOpenDeleteConfirm,
  emprestimoModalOpen,
  editingEmprestimo,
  fetchPatrimonioData,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-[#141118] dark:text-white">Empréstimos</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => { setEditingEmprestimo(null); setEmprestimoModalOpen(true); }}
          className="size-10 rounded-xl bg-background-light dark:bg-[#2c2435] text-text-main-light dark:text-white hover:bg-gray-200 dark:hover:bg-[#3a3045] transition-colors"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={`loading-emprestimo-${i}`} className="h-32 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))
        ) : emprestimos.length === 0 ? (
          <div className="col-span-full py-10 text-center bg-background-light/50 rounded-3xl border-2 border-dashed border-border-light dark:border-[#2d2438]">
            <AlertCircle className="mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-4" size={48} />
            <p className="text-sm font-bold text-[#756189] uppercase tracking-widest">Nenhum empréstimo cadastrado.</p>
          </div>
        ) : (
          emprestimos.map((emp) => {
            const isNegative = Number(emp.emp_saldo_devedor || 0) > 0; // Empréstimo é sempre um passivo
            return (
              <Card 
                key={emp.emp_id}
                className="group bg-white dark:bg-[#1e1629] rounded-3xl p-6 shadow-soft border-border-light dark:border-[#2d2438] hover:shadow-hover hover:border-primary/20 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-background-light dark:bg-[#2c2435] flex items-center justify-center text-[#756189] group-hover:text-primary transition-colors">
                      <DollarSign size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#141118] dark:text-white group-hover:text-primary transition-colors">{emp.emp_nome}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#756189]">{emp.emp_instituicao || 'Empréstimo'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); /* Ver parcelas */ }}>
                      <CalendarDays className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingEmprestimo(emp); setEmprestimoModalOpen(true); }}>
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); handleOpenDeleteConfirm(emp.emp_id, 'emprestimos', emp.emp_nome); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-6">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#756189] mb-1">Saldo Devedor</p>
                  <p className={cn(
                    "text-2xl font-black tracking-tight",
                    isNegative ? "text-rose-600" : "text-emerald-600"
                  )}>
                    {formatCurrency(Number(emp.emp_saldo_devedor || 0))}
                  </p>
                </div>
              </Card>
            );
          })
        )}
      </div>
      <EmprestimoModal
        open={emprestimoModalOpen}
        onOpenChange={setEmprestimoModalOpen}
        onSuccess={fetchPatrimonioData}
        emprestimo={editingEmprestimo}
      />
    </div>
  );
};

export default EmprestimosSection;