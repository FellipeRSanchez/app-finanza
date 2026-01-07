"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  Tag, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Edit2, 
  Trash2,
  Repeat2, // For transfers
  CreditCard, // For payments
  Banknote // Generic for common lancamentos
} from 'lucide-react';
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

const LancamentosTable: React.FC<LancamentosTableProps> = ({
  lancamentos,
  loading,
  onEditOperation,
  onDeleteOperation,
  formatCurrency,
}) => {
  return (
    <Card className="bg-white border-border-light rounded-3xl shadow-soft overflow-hidden border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-background-light/50 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow className="border-border-light hover:bg-transparent">
              <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14 pl-8">Data</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14">Descrição</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14">Conta</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14">Categoria</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14">Valor</TableHead>
              <TableHead className="w-[80px] text-center text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14">Tipo</TableHead>
              <TableHead className="w-[120px] text-right text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14 pr-8">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i} className="animate-pulse border-border-light">
                  <TableCell className="h-16 pl-8"><div className="h-3 bg-gray-100 rounded w-12" /></TableCell>
                  <TableCell><div className="h-3 bg-gray-100 rounded w-32" /></TableCell>
                  <TableCell><div className="h-3 bg-gray-100 rounded w-20" /></TableCell>
                  <TableCell><div className="h-3 bg-gray-100 rounded w-24" /></TableCell>
                  <TableCell className="text-right"><div className="h-3 bg-gray-100 rounded w-16 ml-auto" /></TableCell>
                  <TableCell><div className="h-8 w-8 bg-gray-100 rounded-full mx-auto" /></TableCell>
                  <TableCell className="pr-8 text-right"><div className="h-8 w-20 bg-gray-100 rounded-lg ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : lancamentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-40">
                    <Wallet className="w-12 h-12 text-[#756189]" />
                    <p className="text-sm font-bold uppercase tracking-widest">Nenhuma operação encontrada</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              lancamentos.map((item) => {
                let date, description, accountName, categoryName, value, isConciliado, operationId, operationType;
                let icon, iconBgClass, iconColorClass, valueColorClass;

                if (item.operationType === 'lancamento') {
                  date = item.lan_data;
                  description = item.lan_descricao;
                  accountName = item.contas?.con_nome || "—";
                  categoryName = item.categorias?.cat_nome || "Sem Categoria";
                  value = item.lan_valor;
                  isConciliado = item.lan_conciliado;
                  operationId = item.lan_id;
                  operationType = 'lancamento';

                  const isIncome = value > 0;
                  icon = isIncome ? ArrowDownLeft : ArrowUpRight;
                  iconBgClass = isIncome ? "bg-emerald-100" : "bg-rose-100";
                  iconColorClass = isIncome ? "text-emerald-600" : "text-rose-600";
                  valueColorClass = isIncome ? "text-emerald-600" : "text-rose-600";

                } else if (item.operationType === 'transferencia') {
                  date = item.tra_data;
                  description = item.tra_descricao || `Transferência de ${item.conta_origem?.con_nome} para ${item.conta_destino?.con_nome}`;
                  accountName = `${item.conta_origem?.con_nome} → ${item.conta_destino?.con_nome}`;
                  categoryName = "Transferência";
                  value = item.tra_valor;
                  isConciliado = item.tra_conciliado;
                  operationId = item.tra_id;
                  operationType = 'transferencia';

                  icon = Repeat2;
                  iconBgClass = "bg-blue-100";
                  iconColorClass = "text-blue-600";
                  valueColorClass = "text-blue-600"; // Transfers are usually neutral or positive for destination

                } else if (item.operationType === 'pagamento') {
                  date = item.pag_data;
                  description = `Pagamento de Fatura: ${item.conta_destino?.con_nome}`;
                  accountName = `${item.conta_origem?.con_nome} → ${item.conta_destino?.con_nome}`;
                  categoryName = "Pagamento de Fatura";
                  value = item.pag_valor;
                  isConciliado = item.pag_conciliado;
                  operationId = item.pag_id;
                  operationType = 'pagamento';

                  icon = CreditCard;
                  iconBgClass = "bg-purple-100";
                  iconColorClass = "text-purple-600";
                  valueColorClass = "text-purple-600";
                } else {
                  return null; // Should not happen
                }

                const DisplayIcon = icon;

                return (
                  <TableRow key={operationId} className="border-border-light hover:bg-background-light/30 group transition-colors cursor-pointer">
                    <TableCell className="pl-8 py-4">
                      <span className="text-xs font-bold text-[#756189]">{format(new Date(date), 'dd/MM', { locale: ptBR })}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#141118] line-clamp-1">{description}</span>
                        <span className="text-[10px] text-text-secondary-light font-bold flex items-center gap-1">
                          {isConciliado ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-amber-500" />}
                          {isConciliado ? "Confirmado" : "Pendente"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-[#756189] flex items-center gap-2">
                        <Wallet className="w-3 h-3" />
                        {accountName}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background-light text-[10px] font-black uppercase tracking-wider text-[#756189] border border-border-light">
                        <Tag className="w-3 h-3" />
                        {categoryName}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "text-sm font-black tracking-tight",
                        valueColorClass
                      )}>
                        {value > 0 && operationType === 'lancamento' ? "+" : ""} {formatCurrency(Math.abs(value))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center mx-auto",
                        iconBgClass, iconColorClass
                      )}>
                        <DisplayIcon className="w-4 h-4" />
                      </div>
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onEditOperation(item)}
                          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onDeleteOperation(operationId, operationType)}
                          className="h-8 w-8 rounded-lg hover:bg-rose-100 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default LancamentosTable;