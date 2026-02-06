"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, CheckCircle2, XCircle, Filter, RefreshCcw, AlertCircle, DollarSign, Square } from 'lucide-react';
import { format, parseISO, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';

interface CardAccount {
  con_id: string;
  con_nome: string;
  con_tipo: string;
  con_limite: number;
  con_data_fechamento: number | null;
  con_data_vencimento: number | null;
}

interface Transaction {
  lan_id: string;
  lan_data: string;
  lan_descricao: string;
  lan_valor: number;
  lan_periodo: string | null;
  categoria_nome: string;
  lan_conciliado: boolean;
  is_checked: boolean;
}

interface InvoicePeriod {
  label: string;
  value: string; // YYYY-MM-DD for start of period
  startDate: string;
  endDate: string;
  dueDate: string;
}

const ConferenciaCartao = ({ hideValues }: { hideValues: boolean }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cardAccounts, setCardAccounts] = useState<CardAccount[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [invoicePeriods, setInvoicePeriods] = useState<InvoicePeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  const [systemInvoiceTotal, setSystemInvoiceTotal] = useState<number>(0);
  const [bankInvoiceValue, setBankInvoiceValue] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showUncheckedOnly, setShowUncheckedOnly] = useState(false);
  const [showHighValueOnly, setShowHighValueOnly] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  const HIGH_VALUE_THRESHOLD = 500;

  const formatCurrency = useCallback(
    (value: number) => {
      if (hideValues) return '••••••';
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    },
    [hideValues]
  );

  useEffect(() => {
    const fetchCardAccounts = async () => {
      try {
        const { data: userData } = await supabase.from('usuarios').select('usu_grupo').eq('usu_id', user?.id).single();
        if (!userData?.usu_grupo) return;

        const { data, error } = await supabase
          .from('contas')
          .select('con_id, con_nome, con_tipo, con_limite, con_data_fechamento, con_data_vencimento')
          .eq('con_grupo', userData.usu_grupo)
          .eq('con_tipo', 'cartao');

        if (error) throw error;

        setCardAccounts(data || []);
        if (data && data.length > 0 && !selectedCardId) {
          setSelectedCardId(data[0].con_id);
        }
      } catch (error) {
        console.error('Error fetching card accounts:', error);
        showError('Erro ao carregar cartões de crédito.');
      }
    };

    if (user) fetchCardAccounts();
  }, [user, selectedCardId]);

  useEffect(() => {
    const generatePeriods = () => {
      const selected = cardAccounts.find((acc) => acc.con_id === selectedCardId);
      if (!selected || !selected.con_data_fechamento || !selected.con_data_vencimento) {
        setInvoicePeriods([]);
        setSelectedPeriod('');
        return;
      }

      const periods: InvoicePeriod[] = [];
      const today = new Date();

      for (let i = -12; i <= 1; i++) {
        const targetDate = addMonths(today, i);
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();

        const fechamentoDay = selected.con_data_fechamento;
        const vencimentoDay = selected.con_data_vencimento;

        let cycleStartDate: Date;
        let cycleEndDate: Date;
        let invoiceDueDate: Date;

        const currentCycleClosingDate = new Date(targetYear, targetMonth, fechamentoDay);

        if (fechamentoDay >= vencimentoDay) {
          cycleEndDate = currentCycleClosingDate;
          cycleStartDate = addMonths(new Date(targetYear, targetMonth - 1, fechamentoDay + 1), 0);
          invoiceDueDate = addMonths(new Date(targetYear, targetMonth + 1, vencimentoDay), 0);
        } else {
          cycleEndDate = currentCycleClosingDate;
          cycleStartDate = new Date(targetYear, targetMonth, fechamentoDay + 1);
          invoiceDueDate = addMonths(new Date(targetYear, targetMonth, vencimentoDay), 0);
        }

        if (
          cycleStartDate.getMonth() === cycleEndDate.getMonth() &&
          cycleStartDate.getFullYear() === cycleEndDate.getFullYear() &&
          fechamentoDay < 15
        ) {
          cycleStartDate = subMonths(cycleStartDate, 1);
        }

        const competencia = new Date(invoiceDueDate.getFullYear(), invoiceDueDate.getMonth(), 1);

        periods.push({
          label: `${format(competencia, 'MMM/yyyy', { locale: ptBR })} (Venc: ${format(invoiceDueDate, 'dd/MM')})`,
          value: format(competencia, 'yyyy-MM-dd'),
          startDate: format(competencia, 'yyyy-MM-dd'),
          endDate: format(competencia, 'yyyy-MM-dd'),
          dueDate: format(invoiceDueDate, 'yyyy-MM-dd'),
        });
      }

      const unique = new Map<string, InvoicePeriod>();
      for (const p of periods) unique.set(p.value, p);

      const uniquePeriods = Array.from(unique.values());
      uniquePeriods.sort((a, b) => parseISO(b.value).getTime() - parseISO(a.value).getTime());

      setInvoicePeriods(uniquePeriods);
      if (uniquePeriods.length > 0 && !selectedPeriod) setSelectedPeriod(uniquePeriods[0].value);
    };

    if (selectedCardId) generatePeriods();
  }, [selectedCardId, cardAccounts, selectedPeriod]);

  const fetchReconciliationData = useCallback(async () => {
    if (!selectedCardId || !selectedPeriod) return;
    setLoading(true);
    try {
      const currentPeriod = invoicePeriods.find((p) => p.value === selectedPeriod);
      if (!currentPeriod) {
        showError('Período da fatura inválido.');
        setLoading(false);
        return;
      }

      const { data: transactionsData, error: tError } = await supabase
        .from('lancamentos')
        .select('lan_id, lan_data, lan_descricao, lan_valor, lan_periodo, lan_conciliado, categorias:lan_categoria(cat_nome)')
        .eq('lan_conta', selectedCardId)
        .eq('lan_periodo', currentPeriod.startDate)
        .order('lan_data', { ascending: true });

      if (tError) throw tError;

      const processedTransactions: Transaction[] = (transactionsData || []).map((t: any) => ({
        lan_id: t.lan_id,
        lan_data: t.lan_data,
        lan_descricao: t.lan_descricao,
        lan_valor: Number(t.lan_valor),
        lan_periodo: t.lan_periodo,
        categoria_nome: t.categorias?.cat_nome || 'Sem Categoria',
        lan_conciliado: !!t.lan_conciliado,
        is_checked: !!t.lan_conciliado,
      }));

      setTransactions(processedTransactions);

      const total = processedTransactions.reduce((sum, t) => sum + t.lan_valor, 0);
      setSystemInvoiceTotal(total);
    } catch (error) {
      console.error('Error fetching reconciliation data:', error);
      showError('Erro ao carregar dados da fatura.');
    } finally {
      setLoading(false);
    }
  }, [selectedCardId, selectedPeriod, invoicePeriods]);

  useEffect(() => {
    fetchReconciliationData();
  }, [fetchReconciliationData]);

  const handleTransactionCheck = (id: string) => {
    setTransactions((prev) => prev.map((t) => (t.lan_id === id ? { ...t, is_checked: !t.is_checked } : t)));
  };

  const allUnreconciledChecked = useMemo(() => {
    const unreconciled = transactions.filter((t) => !t.lan_conciliado);
    if (unreconciled.length === 0) return false;
    return unreconciled.every((t) => t.is_checked);
  }, [transactions]);

  const handleToggleSelectAll = () => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.lan_conciliado) return t;
        return { ...t, is_checked: !allUnreconciledChecked };
      })
    );
  };

  const handleReconcileSelected = async () => {
    const selectedToReconcile = transactions.filter((t) => t.is_checked && !t.lan_conciliado);

    if (selectedToReconcile.length === 0) {
      showError('Nenhum lançamento selecionado para conciliar ou já estão conciliados.');
      return;
    }

    setIsReconciling(true);
    try {
      const { error } = await supabase
        .from('lancamentos')
        .update({ lan_conciliado: true })
        .in('lan_id', selectedToReconcile.map((t) => t.lan_id));

      if (error) throw error;

      showSuccess(`${selectedToReconcile.length} lançamentos conciliados com sucesso!`);
      fetchReconciliationData();
    } catch (error) {
      console.error('Error reconciling transactions:', error);
      showError('Erro ao conciliar lançamentos.');
    } finally {
      setIsReconciling(false);
    }
  };

  const bankInvoiceValueNum = parseFloat(bankInvoiceValue.replace(',', '.')) || 0;
  const difference = bankInvoiceValueNum - systemInvoiceTotal;
  const isReconciled = Math.abs(difference) < 0.01;

  const filteredTransactions = transactions.filter((t) => {
    const matchesUnchecked = !showUncheckedOnly || !t.lan_conciliado;
    const matchesHighValue = !showHighValueOnly || Math.abs(t.lan_valor) > HIGH_VALUE_THRESHOLD;
    return matchesUnchecked && matchesHighValue;
  });

  const currentCard = cardAccounts.find((acc) => acc.con_id === selectedCardId);
  const currentPeriodDetails = invoicePeriods.find((p) => p.value === selectedPeriod);

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-text-main-light dark:text-text-main-dark tracking-tight">
          Conferência de Fatura de Cartão
        </h1>
        <p className="text-text-secondary-light dark:text-text-secondary-dark text-lg">
          Compare e concilie os lançamentos da sua fatura de cartão de crédito.
        </p>
      </div>

      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light dark:border-[#2d2438]">
        <CardHeader className="px-0 pt-0 pb-6 border-b border-border-light dark:border-[#2d2438]">
          <CardTitle className="text-xl font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary-new" /> Filtros da Fatura
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label
              htmlFor="card-select"
              className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark"
            >
              Cartão de Crédito
            </Label>
            <Select value={selectedCardId} onValueChange={setSelectedCardId}>
              <SelectTrigger
                id="card-select"
                className="w-full rounded-xl border-border-light dark:border-[#3a3045] bg-background-light/50 dark:bg-[#1e1629] h-12 pl-4 pr-10 text-sm"
              >
                <SelectValue placeholder="Selecione um cartão..." />
              </SelectTrigger>
              <SelectContent className="bg-card-light dark:bg-card-dark z-50" position="popper" sideOffset={5}>
                {cardAccounts.length === 0 ? (
                  <SelectItem value="no-cards" disabled>
                    Nenhum cartão disponível
                  </SelectItem>
                ) : (
                  cardAccounts.map((card) => (
                    <SelectItem key={card.con_id} value={card.con_id}>
                      {card.con_nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="period-select"
              className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark"
            >
              Competência da Fatura
            </Label>
            <Select
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
              disabled={!selectedCardId || invoicePeriods.length === 0}
            >
              <SelectTrigger
                id="period-select"
                className="w-full rounded-xl border-border-light dark:border-[#3a3045] bg-background-light/50 dark:bg-[#1e1629] h-12 pl-4 pr-10 text-sm"
              >
                <SelectValue placeholder="Selecione o período..." />
              </SelectTrigger>
              <SelectContent className="bg-card-light dark:bg-card-dark z-50" position="popper" sideOffset={5}>
                {invoicePeriods.length === 0 ? (
                  <SelectItem value="no-periods" disabled>
                    Nenhum período disponível
                  </SelectItem>
                ) : (
                  invoicePeriods.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <div className="flex justify-end pt-6 border-t border-border-light dark:border-[#2d2438]">
          <Button
            onClick={fetchReconciliationData}
            disabled={!selectedCardId || !selectedPeriod || loading}
            className="bg-primary-new hover:bg-primary-new/90 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-primary-new/20 transition-all transform active:scale-95"
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> Conferir Fatura
          </Button>
        </div>
      </Card>

      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light dark:border-[#2d2438]">
        <CardHeader className="px-0 pt-0 pb-6 border-b border-border-light dark:border-[#2d2438]">
          <CardTitle className="text-xl font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary-new" /> Resumo da Fatura
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">Cartão</p>
            <p className="text-xl font-bold text-text-main-light dark:text-text-main-dark">{currentCard?.con_nome || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">Período</p>
            <p className="text-xl font-bold text-text-main-light dark:text-text-main-dark">{currentPeriodDetails?.label.split(' ')[0] || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">Vencimento</p>
            <p className="text-xl font-bold text-text-main-light dark:text-text-main-dark">
              {currentPeriodDetails?.dueDate ? format(parseISO(currentPeriodDetails.dueDate), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">Total Sistema</p>
            <p className="text-xl font-bold text-text-main-light dark:text-text-main-dark">{formatCurrency(systemInvoiceTotal)}</p>
          </div>
          <div className="md:col-span-2 lg:col-span-2 space-y-2">
            <Label htmlFor="bank-invoice-value" className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">
              Valor da Fatura do Banco
            </Label>
            <Input
              id="bank-invoice-value"
              type="number"
              step="0.01"
              value={bankInvoiceValue}
              onChange={(e) => setBankInvoiceValue(e.target.value)}
              placeholder="0,00"
              className="rounded-xl border-border-light dark:border-[#3a3045] bg-background-light/50 dark:bg-[#1e1629] h-12 px-4 text-sm"
            />
          </div>
          <div className="md:col-span-1 lg:col-span-1 space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">Diferença</p>
            <p
              className={cn(
                "text-xl font-bold",
                isReconciled ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {formatCurrency(difference)}
            </p>
          </div>
          <div className="md:col-span-1 lg:col-span-1 flex items-end">
            <Badge
              className={cn(
                "w-full py-3 text-base font-bold flex items-center justify-center gap-2",
                isReconciled ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
              )}
            >
              {isReconciled ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {isReconciled ? 'CONFERE' : 'DIVERGE'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light dark:border-[#2d2438]">
        <CardHeader className="px-0 pt-0 pb-6 border-b border-border-light dark:border-[#2d2438] flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary-new" /> Lançamentos da Fatura
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowUncheckedOnly(!showUncheckedOnly)}
              className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark"
            >
              <Filter className="w-4 h-4 mr-2" /> {showUncheckedOnly ? 'Mostrar Todos' : 'Não Conferidos'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowHighValueOnly(!showHighValueOnly)}
              className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark"
            >
              <Filter className="w-4 h-4 mr-2" /> {showHighValueOnly ? 'Mostrar Todos' : 'Valores Altos'}
            </Button>
            <Button
              onClick={handleReconcileSelected}
              disabled={isReconciling || transactions.filter((t) => t.is_checked && !t.lan_conciliado).length === 0}
              className="bg-primary-new hover:bg-primary-new/90 text-white font-bold py-2 px-4 rounded-xl shadow-lg shadow-primary-new/20 transition-all transform active:scale-95"
            >
              {isReconciling ? 'Conciliando...' : 'Conciliar Selecionados'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-background-light/50 dark:bg-background-dark/30">
                <TableRow className="border-border-light dark:border-[#2d2438]">
                  <TableHead className="w-[50px] text-center text-[10px] font-black uppercase tracking-widest text-text-secondary-light dark:text-text-secondary-dark">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleToggleSelectAll}
                      disabled={transactions.every((t) => t.lan_conciliado) || loading}
                      className="h-8 w-8 rounded-lg mx-auto"
                      title={allUnreconciledChecked ? "Desmarcar todos" : "Selecionar todos"}
                    >
                      {allUnreconciledChecked ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest text-text-secondary-light dark:text-text-secondary-dark">
                    Data
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-text-secondary-light dark:text-text-secondary-dark">
                    Descrição
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-text-secondary-light dark:text-text-secondary-dark">
                    Categoria
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-text-secondary-light dark:text-text-secondary-dark">
                    Valor
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="select-none">
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} className="h-16 animate-pulse">
                          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full"></div>
                        </TableCell>
                      </TableRow>
                    ))
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-text-secondary-light dark:text-text-secondary-dark opacity-60">
                      <AlertCircle className="mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-4" size={48} />
                      Nenhum lançamento {showUncheckedOnly ? 'não conferido' : ''} {showHighValueOnly ? 'de alto valor' : ''} no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((t) => {
                    const isIncome = t.lan_valor > 0;
                    const isHighValue = Math.abs(t.lan_valor) > HIGH_VALUE_THRESHOLD;

                    return (
                      <TableRow
                        key={t.lan_id}
                        className={cn(
                          "group hover:bg-background-light/30 dark:hover:bg-[#2d2438]/30 transition-colors",
                          t.lan_conciliado && "bg-emerald-50/20 dark:bg-emerald-900/10"
                        )}
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={t.is_checked}
                            onChange={() => handleTransactionCheck(t.lan_id)}
                            disabled={t.lan_conciliado}
                            className="form-checkbox h-4 w-4 text-primary-new rounded border-gray-300 focus:ring-primary-new dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-primary-new"
                          />
                        </TableCell>
                        <TableCell className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark">
                          {format(parseISO(t.lan_data), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-sm font-medium text-text-main-light dark:text-text-main-dark",
                            isHighValue && "font-bold text-primary-new dark:text-white"
                          )}
                        >
                          {t.lan_descricao}
                        </TableCell>
                        <TableCell className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                          {t.categoria_nome || 'Sem Categoria'}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-bold text-sm",
                            isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                            isHighValue && "text-lg"
                          )}
                        >
                          {formatCurrency(t.lan_valor)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConferenciaCartao;