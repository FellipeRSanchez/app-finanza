"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, ChevronDown, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LancamentosFiltersProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const LancamentosFilters: React.FC<LancamentosFiltersProps> = ({
  showFilters,
  setShowFilters,
  searchTerm,
  setSearchTerm,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "rounded-xl h-11 px-4 font-bold border border-border-light transition-all",
            showFilters ? "bg-primary/10 text-primary border-primary/20" : "bg-white text-[#756189]"
          )}
        >
          <Filter className="w-4 h-4 mr-2" /> 
          {showFilters ? "Ocultar Filtros" : "Filtros"}
          <ChevronDown className={cn("w-4 h-4 ml-2 transition-transform", showFilters && "rotate-180")} />
        </Button>

        <div className="relative flex-1 sm:w-80 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#756189] w-4 h-4 group-focus-within:text-primary" />
          <Input 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Pesquisar descrição ou conta..." 
            className="pl-10 rounded-xl bg-white border-border-light h-11 shadow-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest text-text-secondary-light">
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Confirmados</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" /> Pendentes</span>
      </div>
    </div>
  );
};

export default LancamentosFilters;