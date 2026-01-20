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
import { CalendarDays, CheckCircle2, XCircle, Scale, TrendingUp, TrendingDown, Filter, RefreshCcw } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';

interface Account {
  con_id: string;
  con_nome: string;
  con_tipo: string;
  con_limite: number;
  created_at?: string;
}

interface Transaction {
  lan_id: string;
  lan_data: string;
  lan_descricao: string;
  lan_valor: number;
  lan_categoria: string;
  categorias?: { cat_nome: string };
  is_checked: boolean;
}

interface DailyBalance {
  data: string;
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
  const [dailyEvolution, setDailyEvolution] = useState<DailyBalance[]>([]);
  const [bankStatementBalance, setBankStatementBalance] = useState<string>('');
  const [showUncheckedOnly, setShowUncheckedOnly] = useState(false);

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
        .select('con_id, con_nome, con_tipo, con_limite, created_at')
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
      // 1. Saldo inicial do período
      const { data: initialBalanceData } = await supabase
        .from('vw_saldo_diario_conta')
        .select('saldo_acumulado')
        .eq('lan_conta', selectedAccountId)
        .lt('data', startDate)
        .order('data', { ascending: false })
        .limit(1)
        .single();

      let initial = initialBalanceData?.saldo_acumulado || 0;
      
      if (!initialBalanceData) {
        const selectedAccount = accounts.find(acc => acc.con_id === selectedAccountId);
        if (selectedAccount && parseISO(startDate) <= parseISO(selectedAccount.created_at || '')) {
          initial = selectedAccount.con_limite || 0;
        }
      }
      setInitialBalance(initial);

      // 2. Movimentação do período
      const { data: transactionsData, error: tError } = await supabase
        .from('lancamentos')
        .select('lan_id, lan_data, lan_descricao, lan_valor, lan_categoria, categorias(cat_nome)')
        .eq('lan_conta', selectedAccountId)
        .gte('lan_data', startDate)
        .lte('lan_data', endDate)
        .order('lan_data', { ascending: true });

      if (tError) throw tError;
      setTransactions((transactionsData || []).map((t: any) => ({ ...t, is_checked: false })));

      // 3. Evolução diária do saldo
      const { data: dailyEvolutionData } = await supabase
        .from('vw_saldo_diario_conta')
        .select('data, saldo_acumulado')
        .eq('lan_conta', selectedAccountId)
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: true });

      setDailyEvolution(dailyEvolutionData || []);

    } catch (error) {
      console.error('Error fetching reconciliation data:', error);
      showError('Erro ao carregar dados da conferência.');
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, startDate, endDate, accounts]);

  useEffect(() => {
    if (user) fetchAccounts();
  }, [user, fetchAccounts]);

  const totalEntradas = transactions.filter(t => t.lan_valor > 0).reduce((sum, t) => sum + t.lan_valor, 0);
  const totalSaidas = transactions.filter(t => t.lan_valor < 0).reduce((sum, t) => sum + Math.abs(t.lan_valor), 0);
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
    ? transactions.filter(t => !t.is_checked)
    : transactions;

  const handleDateRangeChange = (period: string) => {
    const today = new Date();
    if (period === 'thisMonth') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
    } else if (period === 'lastMonth') {
      const lastMonth = subMonths(today, 1);
      setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
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
              <SelectTrigger className="w-full rounded-xl h-12 bg-background-light/50">
                <SelectValue placeholder="Selecione uma conta..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(acc => (
                  <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-text-secondary-light">Início</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl h-12" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-text-secondary-light">Fim</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl h-12" />
          </div>
          <div className="md:col-span-3 flex flex-wrap gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => handleDateRangeChange('thisMonth')} className="rounded-full text-xs">Este Mês</Button>
            <Button variant="outline" size="sm" onClick={() => handleDateRangeChange('lastMonth')} className="rounded-full text-xs">Mês Anterior</Button>
          </div>
        </CardContent>
        <div className="flex justify-end pt-6 border-t border-border-light">
          <Button onClick={fetchReconciliationData} className="bg-primary-new text-white font-bold py-3 px-8 rounded-xl shadow-lg">
            <RefreshCcw className="w-4 h-4 mr-2" /> Conferir Período
          </Button>
        </div>
      </Card>

      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light">
        <CardHeader className="px-0 pt-0 pb-6 border-b border-border-light">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary-new" /> Resumo
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light">Saldo Inicial</p>
            <p className="text-xl font-bold">{formatCurrency(initialBalance)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light">Entradas (+)</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalEntradas)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light">Saídas (-)</p>
            <p className="text-xl font-bold text-rose-600">{formatCurrency(totalSaidas)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light">Saldo Final Sistema</p>
            <p className="text-xl font-bold">{formatCurrency(saldoCalculado)}</p>
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label className="text-[10px] font-black uppercase text-text-secondary-light">Saldo no Extrato Bancário</Label>
            <Input
              type="number"
              step="0.01"
              value={bankStatementBalance}
              onChange={(e) => setBankStatementBalance(e.target.value)}
              placeholder="0,00"
              className="rounded-xl h-12"
            />
          </div>
          <div className="md:col-span-1 space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light">Diferença</p>
            <p className={cn("text-xl font-bold", isReconciled ? 'text-emerald-600' : 'text-rose-600')}>
              {formatCurrency(difference)}
            </p>
          </div>
          <div className="md:col-span-1 flex items-end">
            <Badge className={cn("w-full py-3 text-sm font-bold flex justify-center gap-2", isReconciled ? 'bg-emerald-500' : 'bg-rose-500')}>
              {isReconciled ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {isReconciled ? 'CONFERE' : 'DIVERGE'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light">
        <CardHeader className="px-0 pt-0 pb-6 border-b border-border-light">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-new" /> Evolução do Saldo
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-6 h-80">
          {dailyEvolution.length === 0 ? (
            <div className="flex items-center justify-center h-full text-text-secondary-light">Sem dados para o gráfico.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyEvolution.map(d => ({ ...d, data: format(parseISO(d.data), 'dd/MM', { locale: ptBR }) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0dbe6" />
                <XAxis dataKey="data" stroke="#756189" className="text-[10px]" />
                <YAxis stroke="#756189" className="text-[10px]" tickFormatter={(v) => hideValues ? '***' : `R$ ${v}`} />
                <Tooltip />
                <Line type="monotone" dataKey="saldo_acumulado" stroke="var(--primary-new)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light">
        <CardHeader className="px-0 pt-0 pb-6 border-b border-border-light flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary-new" /> Movimentações
          </CardTitle>
          <Button variant="outline" onClick={() => setShowUncheckedOnly(!showUncheckedOnly)} className="text-xs font-bold uppercase">
            <Filter className="w-3 h-3 mr-2" /> {showUncheckedOnly ? 'Mostrar Todos' : 'Não Conferidos'}
          </Button>
        </CardHeader>
        <CardContent className="px-0 py-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">
                    <CheckCircle2 className="w-4 h-4 mx-auto" />
                  </TableHead>
                  <TableHead className="w-[100px] text-[10px] font-black uppercase">Data</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Descrição</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Categoria</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center opacity-60">Nenhum lançamento encontrado.</TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((t) => (
                    <TableRow key={t.lan_id} className={cn(t.is_checked && "bg-emerald-50/20")}>
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={t.is_checked}
                          onChange={() => handleTransactionCheck(t.lan_id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-new"
                        />
                      </TableCell>
                      <TableCell className="text-xs font-bold text-text-secondary-light">
                        {format(parseISO(t.lan_data), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{t.lan_descricao}</TableCell>
                      <TableCell className="text-xs text-text-secondary-light">
                        {t.categorias?.cat_nome || 'Sem Categoria'}
                      </TableCell>
                      <TableCell className={cn("text-right font-bold", t.lan_valor > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        {formatCurrency(t.lan_valor)}
                      </TableCell>
                    </TableRow>
                  ))
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