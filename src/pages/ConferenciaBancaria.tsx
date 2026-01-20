"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, ArrowUp, Calendar, Check, Info, LineChart, Scale, X, ChevronRight } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccess, showError } from '@/utils/toast';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

// Interfaces for data
interface Account {
  con_id: string;
  con_nome: string;
  con_tipo: string;
}

interface Movement {
  lan_id: string;
  lan_data: string;
  lan_descricao: string;
  lan_valor: number;
  lan_categoria: string;
  categorias: {
    cat_nome: string;
  } | null;
}

interface DailyBalance {
  data: string;
  saldo_acumulado: number;
}

const ConferenciaBancaria = ({ hideValues }: { hideValues: boolean }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groupId, setGroupId] = useState('');

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [finalBalanceCalculated, setFinalBalanceCalculated] = useState<number>(0);
  const [dailyEvolution, setDailyEvolution] = useState<DailyBalance[]>([]);
  const [bankReportedBalance, setBankReportedBalance] = useState<string>(''); // String for input
  const [reconciledStatus, setReconciledStatus] = useState<Map<string, boolean>>(new Map());
  const [showUnreconciledOnly, setShowUnreconciledOnly] = useState(false);

  // Helper to format currency
  const formatCurrency = useCallback((value: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }, [hideValues]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('usu_grupo')
          .eq('usu_id', user?.id)
          .single();

        if (!userData?.usu_grupo) {
          showError('Grupo do usuário não encontrado.');
          setLoading(false);
          return;
        }
        setGroupId(userData.usu_grupo);

        const { data: accountsRes, error: accountsError } = await supabase
          .from('contas')
          .select('con_id, con_nome, con_tipo')
          .eq('con_grupo', userData.usu_grupo);

        if (accountsError) throw accountsError;

        setAccounts(accountsRes || []);
        if (accountsRes && accountsRes.length > 0) {
          setSelectedAccountId(accountsRes[0].con_id); // Default to first account
        }

      } catch (error) {
        console.error('Error fetching initial data:', error);
        showError('Erro ao carregar dados iniciais.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchInitialData();
    }
  }, [user]);

  const handleConferirPeriodo = async () => {
    if (!selectedAccountId || !startDate || !endDate) {
      showError('Por favor, selecione uma conta e um período.');
      return;
    }

    setLoading(true);
    try {
      // 1. Saldo inicial do período
      const { data: initialBalanceData, error: ibError } = await supabase
        .from('vw_saldo_diario_conta')
        .select('saldo_acumulado')
        .eq('lan_conta', selectedAccountId)
        .lt('data', startDate)
        .order('data', { ascending: false })
        .limit(1)
        .single();
      if (ibError && ibError.code !== 'PGRST116') throw ibError; // PGRST116 means no rows found
      setInitialBalance(initialBalanceData?.saldo_acumulado || 0);

      // 2. Movimentação do período
      const { data: movementsData, error: mError } = await supabase
        .from('lancamentos')
        .select('lan_id, lan_data, lan_descricao, lan_valor, lan_categoria, categorias(cat_nome)')
        .eq('lan_conta', selectedAccountId)
        .gte('lan_data', startDate)
        .lte('lan_data', endDate)
        .order('lan_data', { ascending: true });
      if (mError) throw mError;
      setMovements(movementsData || []);

      // Initialize reconciled status for new movements
      const newReconciledStatus = new Map(reconciledStatus);
      (movementsData || []).forEach(mov => {
        if (!newReconciledStatus.has(mov.lan_id)) {
          newReconciledStatus.set(mov.lan_id, false);
        }
      });
      setReconciledStatus(newReconciledStatus);

      // 3. Saldo final do período
      const { data: finalBalanceData, error: fbError } = await supabase
        .from('vw_saldo_diario_conta')
        .select('saldo_acumulado')
        .eq('lan_conta', selectedAccountId)
        .lte('data', endDate)
        .order('data', { ascending: false })
        .limit(1)
        .single();
      if (fbError && fbError.code !== 'PGRST116') throw fbError;
      setFinalBalanceCalculated(finalBalanceData?.saldo_acumulado || 0);

      // 4. Evolução diária do saldo (gráfico)
      const { data: dailyEvolutionData, error: deError } = await supabase
        .from('vw_saldo_diario_conta')
        .select('data, saldo_acumulado')
        .eq('lan_conta', selectedAccountId)
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: true });
      if (deError) throw deError;
      setDailyEvolution(dailyEvolutionData || []);

      showSuccess('Dados do período carregados!');

    } catch (error) {
      console.error('Error fetching reconciliation data:', error);
      showError('Erro ao carregar dados da conferência.');
    } finally {
      setLoading(false);
    }
  };

  const totalEntradas = movements.filter(m => m.lan_valor > 0).reduce((sum, m) => sum + m.lan_valor, 0);
  const totalSaidas = movements.filter(m => m.lan_valor < 0).reduce((sum, m) => sum + Math.abs(m.lan_valor), 0);
  const difference = finalBalanceCalculated - (parseFloat(bankReportedBalance.replace(',', '.')) || 0);
  const isReconciled = Math.abs(difference) < 0.01; // Allow for minor floating point differences

  const filteredMovements = showUnreconciledOnly
    ? movements.filter(mov => !reconciledStatus.get(mov.lan_id))
    : movements;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Page Heading */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-text-secondary-light dark:text-text-secondary-dark text-sm mb-1">
          <a className="hover:text-primary-new" href="#">Finanças</a>
          <ChevronRight className="w-4 h-4" />
          <span className="text-text-main-light dark:text-text-main-dark font-medium">Conferência Bancária</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-text-main-light dark:text-text-main-dark">
          Conferência Bancária
        </h1>
        <p className="text-text-secondary-light dark:text-text-secondary-dark text-lg max-w-2xl">
          Compare seus lançamentos com o extrato do banco para garantir a precisão.
        </p>
      </div>

      {/* Card 1: Filtros */}
      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl shadow-soft border border-border-light dark:border-[#2d2438] overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-border-light dark:border-[#2d2438]">
          <CardTitle className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
            Filtros de Período e Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="select-account" className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">Conta Bancária</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger id="select-account" className="w-full rounded-xl border-border-light dark:border-[#3a3045] bg-background-light/50 dark:bg-[#1e1629] h-11 pl-4 pr-10 text-sm">
                <SelectValue placeholder="Selecione uma conta..." />
              </SelectTrigger>
              <SelectContent className="bg-card-light dark:bg-card-dark z-50" position="popper" sideOffset={5}>
                {accounts.map(acc => (
                  <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome} ({acc.con_tipo})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="start-date" className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">Data Inicial</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border-border-light dark:border-[#3a3045] bg-background-light/50 dark:bg-[#1e1629] h-11 px-4 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date" className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">Data Final</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border-border-light dark:border-[#3a3045] bg-background-light/50 dark:bg-[#1e1629] h-11 px-4 text-sm"
            />
          </div>
          <div className="md:col-span-3 flex justify-end pt-4">
            <Button
              onClick={handleConferirPeriodo}
              disabled={!selectedAccountId || !startDate || !endDate}
              className="bg-primary-new hover:bg-primary-new/90 text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary-new/25 transition-all"
            >
              <Scale className="w-5 h-5 mr-2" /> Conferir Período
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Resumo */}
      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl shadow-soft border border-border-light dark:border-[#2d2438] overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-border-light dark:border-[#2d2438]">
          <CardTitle className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
            Resumo da Conferência
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
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
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalSaidas)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">Saldo Final Calculado</p>
            <p className="text-xl font-bold text-text-main-light dark:text-text-main-dark">{formatCurrency(finalBalanceCalculated)}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-balance" className="text-[10px] font-black uppercase text-text-secondary-light dark:text-text-secondary-dark">Saldo Informado pelo Banco</Label>
            <Input
              id="bank-balance"
              type="number"
              step="0.01"
              value={bankReportedBalance}
              onChange={(e) => setBankReportedBalance(e.target.value)}
              placeholder="0,00"
              className="rounded-xl border-border-light dark:border-[#3a3045] bg-background-light/50 dark:bg-[#1e1629] h-11 px-4 text-sm"
            />
            <div className="flex items-center gap-2 mt-2">
              <p className="text-sm font-bold text-text-main-light dark:text-text-main-dark">Diferença:</p>
              <span className={cn(
                "text-sm font-bold",
                isReconciled ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )}>
                {formatCurrency(difference)}
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-bold",
                isReconciled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {isReconciled ? 'BATE' : 'DIVERGE'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Gráfico de Evolução do Saldo */}
      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl shadow-soft border border-border-light dark:border-[#2d2438] overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-border-light dark:border-[#2d2438]">
          <CardTitle className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
            Evolução Diária do Saldo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-64 flex items-center justify-center bg-background-light/50 dark:bg-background-dark/30 rounded-xl border border-dashed border-border-light dark:border-[#3a3045]">
            <div className="text-center">
              <LineChart className="w-10 h-10 text-primary-new/20 mx-auto mb-3" />
              <p className="text-xs font-black uppercase tracking-widest text-text-secondary-light dark:text-text-secondary-dark">
                Gráfico de evolução em breve
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Tabela de Lançamentos */}
      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl shadow-soft border border-border-light dark:border-[#2d2438] overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-border-light dark:border-[#2d2438] flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
            Movimentações do Período
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-unreconciled"
              checked={showUnreconciledOnly}
              onCheckedChange={(checked: boolean) => setShowUnreconciledOnly(checked)}
            />
            <Label htmlFor="show-unreconciled" className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
              Mostrar apenas não conferidos
            </Label>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="bg-background-light dark:bg-[#1e1629] border-b border-border-light dark:border-[#3a3045]">
                  <TableHead className="w-[100px] px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                    Data
                  </TableHead>
                  <TableHead className="flex-1 min-w-[200px] px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                    Descrição
                  </TableHead>
                  <TableHead className="w-[150px] px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                    Categoria
                  </TableHead>
                  <TableHead className="w-[120px] px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider text-right">
                    Valor
                  </TableHead>
                  <TableHead className="w-[80px] px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider text-center">
                    Conferido
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border-light dark:divide-[#3a3045]">
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-text-secondary-light dark:text-text-secondary-dark">
                      Nenhum lançamento encontrado para o período ou filtro.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((movement) => {
                    const isHighValue = Math.abs(movement.lan_valor) > 1000; // Example threshold
                    const isIncome = movement.lan_valor > 0;
                    return (
                      <TableRow key={movement.lan_id} className="hover:bg-background-light dark:hover:bg-[#2d2438] transition-colors">
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-text-main-light dark:text-text-main-dark font-medium">
                          {format(parseISO(movement.lan_data), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className={cn("px-6 py-4 text-sm text-text-main-light dark:text-text-main-dark", isHighValue && "font-bold")}>
                          {movement.lan_descricao}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary-light dark:text-text-secondary-dark">
                          {movement.categorias?.cat_nome || 'N/A'}
                        </TableCell>
                        <TableCell className={cn(
                          "px-6 py-4 whitespace-nowrap text-sm font-bold text-right font-mono",
                          isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                          isHighValue && "text-lg"
                        )}>
                          {formatCurrency(movement.lan_valor)}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                          <Checkbox
                            checked={reconciledStatus.get(movement.lan_id) || false}
                            onCheckedChange={(checked: boolean) => {
                              setReconciledStatus(prev => {
                                const newMap = new Map(prev);
                                newMap.set(movement.lan_id, checked);
                                return newMap;
                              });
                            }}
                          />
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

      <div className="flex justify-center gap-6 text-sm text-text-secondary-light dark:text-text-secondary-dark pt-8">
        <a className="hover:underline" href="#">Ajuda</a>
        <a className="hover:underline" href="#">Privacidade</a>
        <a className="hover:underline" href="#">Termos</a>
      </div>
    </div>
  );
};

export default ConferenciaBancaria;