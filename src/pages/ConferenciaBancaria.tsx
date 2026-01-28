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
  lan_conciliado: boolean; // Adicionado para refletir o status do DB
  is_checked: boolean; // Estado local do checkbox
  saldo_acumulado: number; // Novo campo para o saldo acumulado
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
  const [isReconciling, setIsReconciling] = useState(false); // Novo estado para o botão de conciliar

  const formatCurrency = useCallback((value: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }, [hideValues]);

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAccountId && startDate && endDate) {
      fetchReconciliationData();
    }
  }, [selectedAccountId, startDate, endDate]);

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
        .select('lan_id, lan_data, lan_descricao, lan_valor, lan_categoria, categorias(cat_nome), lan_conciliado') // Incluir lan_conciliado
        .eq('lan_conta', selectedAccountId)
        .gte('lan_data', startDate)
        .lte('lan_data', endDate)
        .order('lan_data', { ascending: true });

      if (tError) throw tError;
      
      let currentAccumulatedBalance = initial;
      const processedTransactions = (transactionsData || []).map((t: any) => {
        currentAccumulatedBalance += t.lan_valor;
        return { ...t, is_checked: t.lan_conciliado, saldo_acumulado: currentAccumulatedBalance };
      });
      setTransactions(processedTransactions);

      // --- DIAGNOSTIC LOGS ---
      console.log("[ConferenciaBancaria] Saldo Inicial (initial):", initial);
      console.log("[ConferenciaBancaria] Saldo Acumulado da última transação:", processedTransactions[processedTransactions.length - 1]?.saldo_acumulado);
      // --- END DIAGNOSTIC LOGS ---

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

  // --- DIAGNOSTIC LOGS ---
  console.log("[ConferenciaBancaria] Total Entradas (do estado de transações):", totalEntradas);
  console.log("[ConferenciaBancaria] Total Saídas (do estado de transações):", totalSaidas);
  console.log("[ConferenciaBancaria] Saldo Final Calculado (initialBalance + totalEntradas - totalSaidas):", saldoCalculado);
  // --- END DIAGNOSTIC LOGS ---

  const bankStatementBalanceNum = parseFloat(bankStatementBalance.replace(',', '.')) || 0;
  const difference = bankStatementBalanceNum - saldoCalculado;
  const isReconciled = Math.abs(difference) < 0.01;

  const handleTransactionCheck = (id: string) => {
    setTransactions(prev =>
      prev.map(t => (t.lan_id === id ? { ...t, is_checked: !t.is_checked } : t))
    );
  };

  const filteredTransactions = showUncheckedOnly
    ? transactions.filter(t => !t.lan_conciliado) // Filtrar por lan_conciliado do DB
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
      showError('Nenhum lançamento selecionado para conciliar ou já estão conciliados.');
      return;
    }

    setIsReconciling(true);
    try {
      const { error } = await supabase
        .from('lancamentos')
        .update({ lan_conciliado: true })
        .in('lan_id', selectedToReconcile.map(t => t.lan_id));

      if (error) throw error;

      showSuccess(`${selectedToReconcile.length} lançamentos conciliados com sucesso!`);
      fetchReconciliationData(); // Re-fetch data to update UI
    } catch (error) {
      console.error('Error reconciling transactions:', error);
      showError('Erro ao conciliar lançamentos.');
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
              <SelectContent className="bg-card-light dark:bg-card-dark z-50" position="popper" sideOffset={5}>
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

      {/* Card 3: Chart */}
      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light dark:border-[#2d2438]">
        <CardHeader className="px-0 pt-0 pb-6 border-b border-border-light dark:border-[#2d2438]">
          <CardTitle className="text-xl font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-new" /> Evolução do Saldo
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-6 h-80">
          {dailyEvolution.length === 0 ? (
            <div className="flex items-center justify-center h-full text-text-secondary-light dark:text-text-secondary-dark">
              Nenhum dado para o gráfico no período selecionado.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dailyEvolution.map(d => ({ ...d, data: format(parseISO(d.data), 'dd/MM', { locale: ptBR }) }))}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0dbe6" className="dark:stroke-[#2d2438]" />
                <XAxis dataKey="data" stroke="#756189" className="text-xs" />
                <YAxis stroke="#756189" className="text-xs" tickFormatter={formatCurrency} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label: string) => `Data: ${label}`}
                  contentStyle={{ backgroundColor: 'var(--card-light)', borderColor: 'var(--border-light)', borderRadius: '0.5rem' }}
                  labelStyle={{ color: 'var(--text-main-light)' }}
                  itemStyle={{ color: 'var(--text-main-light)' }}
                />
                <Line type="monotone" dataKey="saldo_acumulado" stroke="var(--primary-new)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Card 4: Transactions Table */}
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
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-text-secondary-light dark:text-text-secondary-dark opacity-60">
                      Nenhum lançamento {showUncheckedOnly ? 'não conferido' : ''} no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((t) => {
                    const isIncome = t.lan_valor > 0;
                    const isHighValue = Math.abs(t.lan_valor) > 1000; // Example threshold for highlighting
                    return (
                      <TableRow key={t.lan_id} className={cn(
                        "group hover:bg-background-light/30 dark:hover:bg-[#2d2438]/30 transition-colors",
                        t.lan_conciliado && "bg-emerald-50/20 dark:bg-emerald-900/10" // Destaque se já conciliado
                      )}>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={t.is_checked}
                            onChange={() => handleTransactionCheck(t.lan_id)}
                            disabled={t.lan_conciliado} // Desabilitar checkbox se já conciliado
                            className="form-checkbox h-4 w-4 text-primary-new rounded border-gray-300 focus:ring-primary-new dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-primary-new"
                          />
                        </TableCell>
                        <TableCell className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark">
                          {format(parseISO(t.lan_data), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className={cn("text-sm font-medium text-text-main-light dark:text-text-main-dark", isHighValue && "font-bold text-primary-new dark:text-white")}>
                          {t.lan_descricao}
                        </TableCell>
                        <TableCell className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                          {t.categorias?.cat_nome || 'Sem Categoria'}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-bold text-sm",
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                          isHighValue && "text-lg"
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