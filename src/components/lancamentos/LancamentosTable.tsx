"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Wallet, Tag, CheckCircle2, Clock, ArrowUpRight, ArrowDownLeft, Edit2, Trash2, Repeat2, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LancamentosTableProps {
  lancamentos: any[];
  loading: boolean;
  onEditOperation: (item: any) => void;
  onDeleteOperation: (id: string, type: 'lancamento' | 'transferencia' | 'pagamento') => void;
  formatCurrency: (value: number) => string;
}

const LancamentosTable: React.FC<LancamentosTableProps> = ({ lancamentos, loading, onEditOperation, onDeleteOperation, formatCurrency }) => {
  return (
    <Card className="bg-white border-border-light rounded-3xl shadow-soft overflow-hidden border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-background-light/50 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow className="border-border-light">
              <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest text-[#756189] pl-8">Data</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-[#756189]">Descrição</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-[#756189]">Conta</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-[#756189]">Categoria</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-[#756189]">Valor</TableHead>
              <TableHead className="w-[80px] text-center text-[10px] font-black uppercase tracking-widest text-[#756189]">Icon</TableHead>
              <TableHead className="w-[120px] text-right text-[10px] font-black uppercase tracking-widest text-[#756189] pr-8">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={7} className="h-16 animate-pulse" /></TableRow>) :
            lancamentos.length === 0 ? <TableRow><TableCell colSpan={7} className="h-64 text-center opacity-40 uppercase font-black text-xs">Nenhum lançamento</TableCell></TableRow> :
            lancamentos.map((l) => {
              const isIncome = l.lan_valor > 0;
              
              // Force category identification for system legs
              const isTransfer = !!l.lan_transferencia;
              const isPayment = !!l.lan_pagamento;
              
              const catName = isTransfer ? "Transferência" : (isPayment ? "Pagamento de Fatura" : (l.categorias?.cat_nome || "Sem Categoria"));
              const Icon = isTransfer ? Repeat2 : (isPayment ? CreditCard : (isIncome ? ArrowDownLeft : ArrowUpRight));

              return (
                <TableRow key={l.lan_id} className="group hover:bg-background-light/30 transition-colors">
                  <TableCell className="pl-8 text-xs font-bold text-[#756189]">{format(new Date(l.lan_data), 'dd/MM', { locale: ptBR })}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[#141118]">{l.lan_descricao}</span>
                      <span className="text-[9px] font-black uppercase flex items-center gap-1">
                        {l.lan_conciliado ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> : <Clock className="w-2.5 h-2.5 text-amber-500" />}
                        {l.lan_conciliado ? "Confirmado" : "Pendente"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-[#756189]"><Wallet className="w-3 h-3 inline mr-1" />{l.contas?.con_nome}</TableCell>
                  <TableCell>
                    <span className="px-3 py-1 rounded-full bg-background-light text-[9px] font-black uppercase tracking-widest text-[#756189] border">
                      <Tag className="w-2.5 h-2.5 inline mr-1" />{catName}
                    </span>
                  </TableCell>
                  <TableCell className={cn("text-right font-black text-sm", isIncome ? "text-emerald-600" : "text-rose-600")}>
                    {isIncome ? "+" : ""}{formatCurrency(l.lan_valor)}
                  </TableCell>
                  <TableCell>
                    <div className={cn("size-8 rounded-full flex items-center justify-center mx-auto", isTransfer ? "bg-blue-100 text-blue-600" : (isPayment ? "bg-purple-100 text-purple-600" : (isIncome ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600")))}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </TableCell>
                  <TableCell className="pr-8 text-right opacity-0 group-hover:opacity-100">
                    <Button variant="ghost" size="icon" onClick={() => onEditOperation(l)} className="h-8 w-8 hover:bg-primary/10"><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDeleteOperation(l.lan_id, isTransfer ? 'transferencia' : (isPayment ? 'pagamento' : 'lancamento'))} className="h-8 w-8 hover:bg-rose-100 text-rose-600"><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default LancamentosTable;