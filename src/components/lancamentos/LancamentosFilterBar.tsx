"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LancamentosFilterBarProps {
  filterType: string;
  setFilterType: (type: string) => void;
  filterAccount: string;
  setFilterAccount: (account: string) => void;
  filterCategory: string;
  setFilterCategory: (category: string) => void;
  filterPeriod: string;
  setFilterPeriod: (period: string) => void;
  customRange: { start: string; end: string };
  setCustomRange: (range: { start: string; end: string }) => void;
  accounts: any[];
  categories: any[];
  onApplyFilters: () => void;
  onClearFilters: () => void;
}

const LancamentosFilterBar: React.FC<LancamentosFilterBarProps> = ({
  filterType,
  setFilterType,
  filterAccount,
  setFilterAccount,
  filterCategory,
  setFilterCategory,
  filterPeriod,
  setFilterPeriod,
  customRange,
  setCustomRange,
  accounts,
  categories,
  onApplyFilters,
  onClearFilters,
}) => {
  return (
    <Card className="bg-white border-border-light rounded-3xl shadow-soft animate-in slide-in-from-top-4 duration-300 border">
      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-[#756189]">Período</Label>
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="h-11 rounded-xl bg-background-light/50 border-border-light font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg rounded-xl">
              <SelectItem value="thisMonth">Este Mês</SelectItem>
              <SelectItem value="lastMonth">Mês Anterior</SelectItem>
              <SelectItem value="last7">Últimos 7 dias</SelectItem>
              <SelectItem value="last30">Últimos 30 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filterPeriod === 'custom' && (
          <div className="lg:col-span-1 grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-[#756189]">Início</Label>
              <Input 
                type="date" 
                value={customRange.start} 
                onChange={e => setCustomRange({...customRange, start: e.target.value})}
                className="rounded-xl h-11 bg-background-light/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-[#756189]">Fim</Label>
              <Input 
                type="date" 
                value={customRange.end} 
                onChange={e => setCustomRange({...customRange, end: e.target.value})}
                className="rounded-xl h-11 bg-background-light/50"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-[#756189]">Conta</Label>
          <Select value={filterAccount} onValueChange={setFilterAccount}>
            <SelectTrigger className="h-11 rounded-xl bg-background-light/50 border-border-light font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg rounded-xl">
              <SelectItem value="all">Todas as contas</SelectItem>
              {accounts.map(acc => (
                <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-[#756189]">Tipo</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-11 rounded-xl bg-background-light/50 border-border-light font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg rounded-xl">
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="receita">Apenas Receitas</SelectItem>
              <SelectItem value="despesa">Apenas Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-[#756189]">Categoria</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-11 rounded-xl bg-background-light/50 border-border-light font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg rounded-xl">
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.cat_id} value={cat.cat_id}>{cat.cat_nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2 md:col-span-2 lg:col-span-1 pt-4 lg:pt-0">
          <Button 
            variant="outline" 
            onClick={onClearFilters}
            className="h-11 flex-1 rounded-xl border-border-light font-bold text-[#756189]"
          >
            Limpar
          </Button>
          <Button 
            onClick={onApplyFilters}
            className="h-11 flex-1 rounded-xl bg-primary text-white font-bold"
          >
            Aplicar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LancamentosFilterBar;