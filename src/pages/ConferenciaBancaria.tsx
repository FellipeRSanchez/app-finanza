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
import { CalendarDays, CheckCircle2, XCircle, Scale, Filter, RefreshCcw, AlertCircle } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';

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
    }
  }, [user, selectedAccountId]);

  const fetchReconciliationData = useCallback(async () => {
    if (!selectedAccountId) return;
    setLoading(true);
    try {
      // 1. Obter a conta selecionada
      const { data: accountData, error: accError } = await supabase
        .from('contas')
        .select('con_limite')
        .eq('con_id', selectedAccountId)
        .single();

      if (accError) throw accError;
      const openingLimit = Number(accountData.con_limite || 0);

      // 2. SALDO INICIAL: Soma apenas do que foi CONCILIADO antes da data inicial
      const { data: previousData, error: pError } = await supabase
        .from('lancamentos')
        .select('lan_valor')
        .eq('lan_conta', selectedAccountId)
        .lt('lan_data', startDate)
        .eq('lan_conciliado', true); // CRUCIAL: Apenas o que já passou pelo banco

      if (pError) throw pError;

      const previousSum = (previousData || []).reduce((sum, t) => sum + Number(t.lan_valor), 0);
      const calculatedInitialBalance = openingLimit + previousSum;
      setInitialBalance(calculatedInitialBalance);

      // 3. Buscar TODAS as transações do período (para que o usuário possa marcar o que conferiu)
      const { data: transactionsData, error: tError } = await supabase
        .from('lancamentos')
        .select('lan_id, lan_data, lan_descricao, lan_valor, lan_categoria, categorias(cat_nome), lan_conciliado')
        .eq('lan_conta', selectedAccountId)
        .gte('lan_data', startDate)
        .lte('lan_data', endDate)
        .order('lan_data', { ascending: true })
        .order('lan_id', { ascending: true });

      if (tError) throw tError;
      
      const processedTransactions = (transactionsData || []).map((t: any) => ({
        ...t,
        is_checked: t.lan_conciliado, // Começa marcado se já estiver conciliado
      }));
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

  // Cálculos dinâmicos baseados no que está MARCADO (checked)
  const checkedSummary = useMemo(() => {
    const checked = transactions.filter(t => t.is_checked);
    const entradas = checked.filter(t => t.lan_valor > 0).reduce((sum, t) => sum + Number(t.lan_valor), 0);
    const saidas = checked.filter(t => t.lan_valor < 0).reduce((sum, t) => sum + Math.abs(Number(t.lan_valor)), 0);
    return {
      entradas,
      saidas,
      saldoFinal: initialBalance + entradas - saidas
    };
  }, [transactions, initialBalance]);

  const bankStatementBalanceNum = parseFloat(bankStatementBalance.replace(',', '.')) || 0;
  const difference = bankStatementBalanceNum - checkedSummary.saldoFinal;
  const isReconciled = Math.abs(difference) < 0.01;

  const handleTransactionCheck = (id: string) => {
    setTransactions(prev =>
      prev.map(t => (t.lan_id === id ? { ...t, is_checked: !t.is_checked } : t))
    );
  };

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
      default:
        break;
    }
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const handleReconcileSelected = async () => {
    const toConciliar = transactions.filter(t => t.is_checked && !t.lan_conciliado).map(t => t.lan_id);
    const toDesconciliar = transactions.filter(t => !t.is_checked && t.lan_conciliado).map(t => t.lan_id);

    if (toConciliar.length === 0 && toDesconciliar.length === 0) {
      showError('Nenhuma alteração pendente para salvar.');
      return;
    }

    setIsReconciling(true);
    try {
      if (toConciliar.length > 0) {
        await supabase.from('lancamentos').update({ lan_conciliado: true }).in('lan_id', toConciliar);
      }
      if (toDesconciliar.length > 0) {
        await supabase.from('lancamentos').update({ lan_conciliado: false }).in('lan_id', toDesconciliar);
      }
      showSuccess('Conferência salva com sucesso!');
      fetchReconciliationData();
    } catch (error) {
      showError('Erro ao salvar conferência.');
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
          Concilie seu extrato bancário com o sistema.
        </p>
      </div>

      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light dark:border-[#2d2438]">
        <CardHeader className="px-0 pt-0 pb-6 border-b border-border-light dark:border-[#2d2438]">
          <CardTitle className="text-xl font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary-new" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-text-secondary-light">Conta</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="rounded-xl border-border-light bg-background-light/50 h-12 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="bg-white border shadow-lg rounded-xl">
                {accounts.map(acc => (
                  <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-text-secondary-light">Início</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-xl border-border-light bg-background-light/50 h-12 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-text-secondary-light">Fim</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-xl border-border-light bg-background-light/50 h-12 text-sm" />
          </div>
          <div className="md:col-span-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleDateRangeChange('thisMonth')} className="rounded-full text-xs">Este Mês</Button>
            <Button variant="outline" size="sm" onClick={() => handleDateRangeChange('lastMonth')} className="rounded-full text-xs">Mês Anterior</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light dark:border-[#2d2438]">
        <CardHeader className="px-0 pt-0 pb-6 border-b border-border-light dark:border-[#2d2438]">
          <CardTitle className="text-xl font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary-new" /> Resumo da Conferência
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light">Saldo Inicial (Conciliado)</p>
            <p className="text-xl font-bold text-text-main-light dark:text-text-main-dark">{formatCurrency(initialBalance)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light">Entradas (Marcadas)</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(checkedSummary.entradas)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light">Saídas (Marcadas)</p>
            <p className="text-xl font-bold text-rose-600">{formatCurrency(checkedSummary.saidas)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light">Saldo Final Sistema</p>
            <p className="text-xl font-bold text-text-main-light dark:text-text-main-dark">{formatCurrency(checkedSummary.saldoFinal)}</p>
          </div>
          <div className="md:col-span-2 lg:col-span-2 space-y-2">
            <Label className="text-[10px] font-black uppercase text-text-secondary-light">Saldo do Extrato Bancário</Label>
            <Input type="number" step="0.01" value={bankStatementBalance} onChange={e => setBankStatementBalance(e.target.value)} placeholder="0,00" className="rounded-xl border-border-light bg-background-light/50 h-12 px-4 text-sm font-bold" />
          </div>
          <div className="md:col-span-1 lg:col-span-1 space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light">Diferença</p>
            <p className={cn("text-xl font-bold", isReconciled ? 'text-emerald-600' : 'text-rose-600')}>{formatCurrency(difference)}</p>
          </div>
          <div className="md:col-span-1 lg:col-span-1 flex items-end">
            <Badge className={cn("w-full py-3 text-base font-bold flex items-center justify-center gap-2", isReconciled ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600')}>
              {isReconciled ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {isReconciled ? 'CONFERE' : 'DIVERGE'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light dark:border-[#2d2438]">
        <CardHeader className="px-0 pt-0 pb-6 border-b border-border-light dark:border-[#2d2438] flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary-new" /> Lançamentos no Período
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowUncheckedOnly(!showUncheckedOnly)} className="text-xs font-bold uppercase tracking-wider">
              {showUncheckedOnly ? 'Mostrar Todos' : 'Ver Pendentes'}
            </Button>
            <Button onClick={handleReconcileSelected} disabled={isReconciling} className="bg-primary-new hover:bg-primary-new/90 text-white font-bold py-2 px-4 rounded-xl shadow-lg">
              {isReconciling ? 'Salvando...' : 'Salvar Conferência'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-background-light/50">
                <TableRow className="border-border-light">
                  <TableHead className="w-[50px] text-center"><CheckCircle2 className="w-4 h-4 mx-auto" /></TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-text-secondary-light">Data</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-text-secondary-light">Descrição</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-text-secondary-light">Categoria</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-text-secondary-light">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? Array(3).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={5} className="h-16 animate-pulse" /></TableRow>) :
                transactions.filter(t => !showUncheckedOnly || !t.is_checked).length === 0 ? <TableRow><TableCell colSpan={5} className="h-32 text-center opacity-60">Nenhum lançamento no período.</TableCell></TableRow> :
                transactions.filter(t => !showUncheckedOnly || !t.is_checked).map((t) => (
                  <TableRow key={t.lan_id} className={cn("group transition-colors", t.is_checked && "bg-emerald-50/20 dark:bg-emerald-900/10")}>
                    <TableCell className="text-center">
                      <input type="checkbox" checked={t.is_checked} onChange={() => handleTransactionCheck(t.lan_id)} className="h-4 w-4 rounded border-gray-300 text-primary-new focus:ring-primary-new" />
                    </TableCell>
                    <TableCell className="text-xs font-bold text-text-secondary-light">{format(parseISO(t.lan_data), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-sm font-medium">{t.lan_descricao}</TableCell>
                    <TableCell className="text-xs text-text-secondary-light">{t.categorias?.cat_nome || 'Sem Categoria'}</TableCell>
                    <TableCell className={cn("text-right font-bold text-sm", t.lan_valor > 0 ? 'text-emerald-600' : 'text-rose-600')}>{formatCurrency(t.lan_valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConferenciaBancaria;