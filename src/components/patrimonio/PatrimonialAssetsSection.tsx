"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Car, Factory, Scale, Plus, Settings, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import AtivoPatrimonialModal from '@/components/patrimonio/AtivoPatrimonialModal';

interface PatrimonialAssetsSectionProps {
  loading: boolean;
  ativosPatrimoniais: any[];
  formatCurrency: (value: number) => string;
  setEditingAtivoPatrimonial: (ativo: any) => void;
  setAtivoPatrimonialModalOpen: (open: boolean) => void;
  handleOpenDeleteConfirm: (id: string, table: string, name: string) => void;
  ativoPatrimonialModalOpen: boolean;
  editingAtivoPatrimonial: any;
  fetchPatrimonioData: () => void;
}

const PatrimonialAssetsSection: React.FC<PatrimonialAssetsSectionProps> = ({
  loading,
  ativosPatrimoniais,
  formatCurrency,
  setEditingAtivoPatrimonial,
  setAtivoPatrimonialModalOpen,
  handleOpenDeleteConfirm,
  ativoPatrimonialModalOpen,
  editingAtivoPatrimonial,
  fetchPatrimonioData,
}) => {
  const getPatrimonialAssetIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'imovel': return Home;
      case 'veiculo': return Car;
      case 'maquina': return Factory;
      default: return Scale;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-[#141118] dark:text-white">Ativos Patrimoniais</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => { setEditingAtivoPatrimonial(null); setAtivoPatrimonialModalOpen(true); }}
          className="size-10 rounded-xl bg-background-light dark:bg-[#2c2435] text-text-main-light dark:text-white hover:bg-gray-200 dark:hover:bg-[#3a3045] transition-colors"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={`loading-ativo-${i}`} className="h-32 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))
        ) : ativosPatrimoniais.length === 0 ? (
          <div className="col-span-full py-10 text-center bg-background-light/50 rounded-3xl border-2 border-dashed border-border-light dark:border-[#2d2438]">
            <AlertCircle className="mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-4" size={48} />
            <p className="text-sm font-bold text-[#756189] uppercase tracking-widest">Nenhum ativo patrimonial cadastrado.</p>
          </div>
        ) : (
          ativosPatrimoniais.map((ativo) => {
            const Icon = getPatrimonialAssetIcon(ativo.apa_tipo);
            return (
              <Card 
                key={ativo.apa_id}
                className="group bg-white dark:bg-[#1e1629] rounded-3xl p-6 shadow-soft border-border-light dark:border-[#2d2438] hover:shadow-hover hover:border-primary/20 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-background-light dark:bg-[#2c2435] flex items-center justify-center text-[#756189] group-hover:text-primary transition-colors">
                      <Icon size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#141118] dark:text-white group-hover:text-primary transition-colors">{ativo.apa_nome}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#756189]">{ativo.apa_tipo}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingAtivoPatrimonial(ativo); setAtivoPatrimonialModalOpen(true); }}>
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); handleOpenDeleteConfirm(ativo.apa_id, 'ativos_patrimoniais', ativo.apa_nome); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-6">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#756189] mb-1">Valor Estimado</p>
                  <p className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(Number(ativo.apa_valor_estimado || 0))}
                  </p>
                </div>
              </Card>
            );
          })
        )}
      </div>
      <AtivoPatrimonialModal
        open={ativoPatrimonialModalOpen}
        onOpenChange={setAtivoPatrimonialModalOpen}
        onSuccess={fetchPatrimonioData}
        ativo={editingAtivoPatrimonial}
      />
    </div>
  );
};

export default PatrimonialAssetsSection;