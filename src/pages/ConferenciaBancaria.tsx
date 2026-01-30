"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, CheckCircle2, XCircle, Scale, Filter, RefreshCcw, AlertCircle } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import { subDays } from 'date-fns';


interface Account {
  con_id: string;
  con_nome: string;
  con_tipo: string;
  con_limite: number;
}

interface Transaction {
  lan_id: string;
  lan_data: string;
  lan_descricao: string;
  lan_valor: number;
  lan_categoria: string;
  categorias?: { cat_nome: string };
  lan_conciliado: boolean;
  is_checked: boolean;
  saldo_acumulado: number;
}

const ConferenciaBancaria = ({ hideValues }: { hideValues: boolean }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankStatementBalance, setBankStatementBalance] = useState<string>('');
  const [showUncheckedOnly, setShowUncheckedOnly] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  const formatCurrency = useCallback((value: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }, [hideValues]);

  const fetchAccounts = useCallback(async () => {
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;

      const { data, error } = await supabase
        .from('contas')
        .select('con_id, con_nome, con_tipo, con_limite')
        .eq('con_grupo', userData.usu_grupo)
        .neq('con_tipo', 'cartao');

      if (error) throw error;
      setAccounts(data || []);
      if (data && data.length > 0 && !selectedAccountId) {
        setSelectedAccountId(data[0].con_id);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      showError('Erro ao carregar contas.');
    }
  }, [user, selectedAccountId]);

  const fetchReconciliationData = useCallback(async () => {
    if (!selectedAccountId) return;
    setLoading(true);
    try {
      // 1. Obter o saldo de abertura base da conta
      const { data: accountData } = await supabase
        .from('contas')
        .select('con_limite')
        .eq('con_id', selectedAccountId)
        .single();
      
      const openingLimit = Number(accountData?.con_limite || 0);

      // 2. Obter o saldo inicial exato do período usando a VIEW corrigida
      // Buscamos o último saldo registrado ANTES da data de início
      const previousDay = format(
        subDays(new Date(startDate), 1),
        'yyyy-MM-dd'
      );

      const { data: startBalanceData, error: bError } = await supabase
        .from('vw_saldo_diario_conta')
        .select('saldo_acumulado')
        .eq('lan_conta', selectedAccountId)
        .eq('data', previousDay)
        .limit(1);


      if (bError) throw bError;

      // Se existir saldo histórico, usamos ele. Se não (conta nova), usamos o limite inicial.
      const calculatedInitial = (startBalanceData && startBalanceData.length > 0) 
        ? Number(startBalanceData[0].saldo_acumulado) 
        : openingLimit;
      
      setInitialBalance(calculatedInitial);

      // 3. Buscar lançamentos do período (todos, para conferência completa)
      const { data: transactionsData, error: tError } = await supabase
        .from('lancamentos')
        .select('lan_id, lan_data, lan_descricao, lan_valor, lan_categoria, categorias(cat_nome), lan_conciliado')
        .eq('lan_conta', selectedAccountId)
        .gte('lan_data', startDate)
        .lte('lan_data', endDate)
        .order('lan_data', { ascending: true })
        .order('lan_id', { ascending: true });

      if (tError) throw tError;
      
      let runningBalance = calculatedInitial;
      const processedTransactions = (transactionsData || []).map((t: any) => {
        runningBalance += Number(t.lan_valor);
        return { 
          ...t, 
          is_checked: t.lan_conciliado, 
          saldo_acumulado: runningBalance 
        };
      });
      setTransactions(processedTransactions);

    } catch (error) {
      console.error('Error fetching reconciliation data:', error);
      showError('Erro ao carregar dados da conferência.');
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, startDate, endDate]);

  useEffect(() => {
    if (user) fetchAccounts();
  }, [user, fetchAccounts]);

  useEffect(() => {
    if (selectedAccountId && startDate && endDate) {
      fetchReconciliationData();
    }
  }, [selectedAccountId, startDate, endDate, fetchReconciliationData]);

  const totalEntradas = transactions.filter(t => t.lan_valor > 0).reduce((sum, t) => sum + Number(t.lan_valor), 0);
  const totalSaidas = transactions.filter(t => t.lan_valor < 0).reduce((sum, t) => sum + Math.abs(Number(t.lan_valor)), 0);
  const saldoCalculado = initialBalance + totalEntradas - totalSaidas;

  const bankStatementBalanceNum = parseFloat(bankStatementBalance.replace(',', '.')) || 0;
  const difference = bankStatementBalanceNum - saldoCalculado;
  const isReconciled = Math.abs(difference) < 0.01;

  const handleTransactionCheck = (id: string) => {
    setTransactions(prev =>
      prev.map(t => (t.lan_id === id ? { ...t, is_checked: !t.is_checked } : t))
    );
  };

  const filteredTransactions = showUncheckedOnly
    ? transactions.filter(t => !t.lan_conciliado)
    : transactions;

  const handleDateRangeChange = (period: string) => {
    const today = new Date();
    let newStartDate = startDate;
    let newEndDate = endDate;

    switch (period) {
      case 'thisMonth':
        newStartDate = format(startOfMonth(today), 'yyyy-MM-dd');
        newEndDate = format(endOfMonth(today), 'yyyy-MM-dd');
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        newStartDate = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        newEndDate = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
        break;
      case 'last7Days':
        newStartDate = format(addDays(today, -6), 'yyyy-MM-dd');
        newEndDate = format(today, 'yyyy-MM-dd');
        break;
      case 'last30Days':
        newStartDate = format(addDays(today, -29), 'yyyy-MM-dd');
        newEndDate = format(today, 'yyyy-MM-dd');
        break;
      default:
        break;
    }
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const handleReconcileSelected = async () => {
    const selectedToReconcile = transactions.filter(t => t.is_checked && !t.lan_conciliado);

    if (selectedToReconcile.length === 0) {
      showError('Nenhum lançamento selecionado para conciliar.');
      return;
    }

    setIsReconciling(true);
    try {
      const { error } = await supabase
        .from('lancamentos')
        .update({ lan_conciliado: true })
        .in('lan_id', selectedToReconcile.map(t => t.lan_id));

      if (error) throw error;

      showSuccess(`${selectedToReconcile.length} lançamentos conciliados!`);
      fetchReconciliationData();
    } catch (error) {
      console.error('Error:', error);
      showError('Erro ao conciliar.');
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-text-main-light dark:text-text-main-dark tracking-tight">
          Conferência Bancária
        </h1>
        <p className="text-text-secondary-light dark:text-text-secondary-dark text-lg">
          Compare o saldo do sistema com o extrato do seu banco.
        </p>
      </div>

      {/* Card 1: Filters */}
      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light dark:border-[#2d2438]">
        <CardHeader className="px-0 pt-0 pb-6 border-b border-border-light dark:border-[#2d2438]">
          <CardTitle className="text-xl font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary-new" /> Filtros de Conferência
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="account-select" className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">
              Conta Bancária
            </Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger id="account-select" className="w-full rounded-xl border-border-light dark:border-[#3a3045] bg-background-light/50 dark:bg-[#1e1629] h-12 pl-4 pr-10 text-sm">
                <SelectValue placeholder="Selecione uma conta..." />
              </SelectTrigger>
              <SelectContent className="bg-card-light dark:bg-card-dark z-50">
                {accounts.map(acc => (
                  <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-date" className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">
              Data Inicial
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border-border-light dark:border-[#3a3045] bg-background-light/50 dark:bg-[#1e1629] h-12 px-4 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date" className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">
              Data Final
            </Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border-border-light dark:border-[#3a3045] bg-background-light/50 dark:bg-[#1e1629] h-12 px-4 text-sm"
            />
          </div>
          <div className="md:col-span-3 flex flex-wrap gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => handleDateRangeChange('thisMonth')} className="rounded-full text-xs">Este Mês</Button>
            <Button variant="outline" size="sm" onClick={() => handleDateRangeChange('lastMonth')} className="rounded-full text-xs">Mês Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => handleDateRangeChange('last7Days')} className="rounded-full text-xs">Últimos 7 Dias</Button>
            <Button variant="outline" size="sm" onClick={() => handleDateRangeChange('last30Days')} className="rounded-full text-xs">Últimos 30 Dias</Button>
          </div>
        </CardContent>
        <div className="flex justify-end pt-6 border-t border-border-light dark:border-[#2d2438]">
          <Button
            onClick={fetchReconciliationData}
            disabled={!selectedAccountId || !startDate || !endDate || loading}
            className="bg-primary-new hover:bg-primary-new/90 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-primary-new/20 transition-all transform active:scale-95"
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> Conferir Período
          </Button>
        </div>
      </Card>

      {/* Card 2: Summary */}
      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light dark:border-[#2d2438]">
        <CardHeader className="px-0 pt-0 pb-6 border-b border-border-light dark:border-[#2d2438]">
          <CardTitle className="text-xl font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary-new" /> Resumo da Conferência
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">Saldo Inicial</p>
            <p className="text-xl font-bold text-text-main-light dark:text-text-main-dark">{formatCurrency(initialBalance)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">Total Entradas</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalEntradas)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">Total Saídas</p>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totalSaidas)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">Saldo Final Sistema</p>
            <p className="text-xl font-bold text-text-main-light dark:text-text-main-dark">{formatCurrency(saldoCalculado)}</p>
          </div>
          <div className="md:col-span-2 lg:col-span-2 space-y-2">
            <Label htmlFor="bank-statement-balance" className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">
              Saldo Informado pelo Banco
            </Label>
            <Input
              id="bank-statement-balance"
              type="number"
              step="0.01"
              value={bankStatementBalance}
              onChange={(e) => setBankStatementBalance(e.target.value)}
              placeholder="0,00"
              className="rounded-xl border-border-light dark:border-[#3a3045] bg-background-light/50 dark:bg-[#1e1629] h-12 px-4 text-sm"
            />
          </div>
          <div className="md:col-span-1 lg:col-span-1 space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">Diferença</p>
            <p className={cn("text-xl font-bold", isReconciled ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
              {formatCurrency(difference)}
            </p>
          </div>
          <div className="md:col-span-1 lg:col-span-1 flex items-end">
            <Badge className={cn("w-full py-3 text-base font-bold flex items-center justify-center gap-2", isReconciled ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600')}>
              {isReconciled ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {isReconciled ? 'CONFERE' : 'DIVERGE'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Transactions Table */}
      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light dark:border-[#2d2438]">
        <CardHeader className="px-0 pt-0 pb-6 border-b border-border-light dark:border-[#2d2438] flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary-new" /> Movimentações do Período
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
              onClick={handleReconcileSelected}
              disabled={isReconciling || transactions.filter(t => t.is_checked && !t.lan_conciliado).length === 0}
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
                    <CheckCircle2 className="w-4 h-4 mx-auto" />
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
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-text-secondary-light dark:text-text-secondary-dark">
                    Saldo Acumulado
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                   Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={6} className="h-16 animate-pulse" /></TableRow>
                  ))
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-text-secondary-light dark:text-text-secondary-dark opacity-60">
                      <AlertCircle className="mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-4" size={48} />
                      Nenhum lançamento {showUncheckedOnly ? 'não conferido' : ''} no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((t) => {
                    const isIncome = t.lan_valor > 0;
                    return (
                      <TableRow key={t.lan_id} className={cn(
                        "group hover:bg-background-light/30 dark:hover:bg-[#2d2438]/30 transition-colors",
                        t.lan_conciliado && "bg-emerald-50/20 dark:bg-emerald-900/10"
                      )}>
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
                        <TableCell className="text-sm font-medium text-text-main-light dark:text-text-main-dark">
                          {t.lan_descricao}
                        </TableCell>
                        <TableCell className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                          {t.categorias?.cat_nome || 'Sem Categoria'}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-bold text-sm",
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        )}>
                          {formatCurrency(t.lan_valor)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold text-text-main-light dark:text-text-main-dark">
                          {formatCurrency(t.saldo_acumulado)}
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

export default ConferenciaBancaria;