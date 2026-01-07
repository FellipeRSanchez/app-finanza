"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Lock, Unlock, CheckCircle, CalendarDays, Edit, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';

interface Fechamento {
  fem_id: string;
  fem_mes: number;
  fem_ano: number;
  fem_observacoes: string;
  fem_fechado: boolean;
}

interface CategoryTotal {
  nome: string;
  valor: number;
  tipo: string;
}

const Fechamento = () => {
  const { user } = useAuth();
  const [fechamento, setFechamento] = useState<Fechamento | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;

      const grupoId = userData.usu_grupo;

      // 1. Fetch Fechamento Status
      const { data: fechamentoData } = await supabase
        .from('fechamentos_mensais')
        .select('*')
        .eq('fem_grupo', grupoId)
        .eq('fem_mes', selectedMonth)
        .eq('fem_ano', selectedYear)
        .single();

      if (fechamentoData) {
        setFechamento(fechamentoData);
        setObservacoes(fechamentoData.fem_observacoes || '');
      } else {
        setFechamento(null);
        setObservacoes('');
      }

      // 2. Fetch Category Breakdown for the month
      const startDate = format(new Date(selectedYear, selectedMonth - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), 'yyyy-MM-dd');

      const { data: lancamentos, error: lError } = await supabase
        .from('lancamentos')
        .select(`
          lan_valor,
          categorias (cat_nome, cat_tipo)
        `)
        .eq('lan_grupo', grupoId)
        .gte('lan_data', startDate)
        .lte('lan_data', endDate);

      if (lError) throw lError;

      const totals: Record<string, { valor: number, tipo: string }> = {};
      lancamentos?.forEach((lan: any) => {
        const cat = lan.categorias;
        const nome = cat?.cat_nome || 'Sem Categoria';
        if (!totals[nome]) {
          totals[nome] = { valor: 0, tipo: cat?.cat_tipo || 'despesa' };
        }
        totals[nome].valor += Number(lan.lan_valor);
      });

      const formattedTotals = Object.entries(totals).map(([nome, data]) => ({
        nome,
        valor: data.valor,
        tipo: data.tipo
      })).sort((a, b) => b.valor - a.valor);

      setCategoryTotals(formattedTotals);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveObservacoes = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;

      if (fechamento) {
        const { error } = await supabase
          .from('fechamentos_mensais')
          .update({ fem_observacoes: observacoes })
          .eq('fem_id', fechamento.fem_id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('fechamentos_mensais')
          .insert({
            fem_grupo: userData.usu_grupo,
            fem_mes: selectedMonth,
            fem_ano: selectedYear,
            fem_observacoes: observacoes,
            fem_fechado: false,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setFechamento(data);
      }
      showSuccess('Observações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving observacoes:', error);
      showError('Erro ao salvar observações.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFecharMes = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;

      const newFechadoStatus = !fechamento?.fem_fechado;

      if (fechamento) {
        const { error } = await supabase
          .from('fechamentos_mensais')
          .update({ fem_fechado: newFechadoStatus })
          .eq('fem_id', fechamento.fem_id);
        if (error) throw error;
        setFechamento({ ...fechamento, fem_fechado: newFechadoStatus });
      } else {
        const { data, error } = await supabase
          .from('fechamentos_mensais')
          .insert({
            fem_grupo: userData.usu_grupo,
            fem_mes: selectedMonth,
            fem_ano: selectedYear,
            fem_observacoes: observacoes,
            fem_fechado: newFechadoStatus,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setFechamento(data);
      }
      showSuccess(newFechadoStatus ? 'Mês fechado com sucesso!' : 'Mês reaberto com sucesso!');
    } catch (error) {
      console.error('Error toggling month status:', error);
      showError('Erro ao alterar status do mês.');
    } finally {
      setSaving(false);
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    let newMonth = selectedMonth;
    let newYear = selectedYear;

    if (direction === 'prev') {
      newMonth--;
      if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
    } else {
      newMonth++;
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      }
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const totalReceitas = categoryTotals.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + t.valor, 0);
  const totalDespesas = categoryTotals.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + t.valor, 0);
  const resultado = totalReceitas - totalDespesas;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <MainLayout title="Fechamento Mensal">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Fechamento Mensal">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-8">
        {/* Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-text-main-light dark:text-text-main-dark text-3xl font-black leading-tight tracking-tight">Resumo de {monthNames[selectedMonth - 1]} {selectedYear}</h1>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                fechamento?.fem_fechado
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
              )}>
                {fechamento?.fem_fechado ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {fechamento?.fem_fechado ? 'Mês Fechado' : 'Mês Aberto'}
              </span>
            </div>
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-base font-normal">
              Confira os lançamentos e consolide o resultado antes de fechar.
            </p>
          </div>
          <div className="flex items-center bg-background-light dark:bg-white/5 rounded-full p-1 border border-transparent dark:border-white/10">
            <Button variant="ghost" size="icon" onClick={() => handleMonthChange('prev')} className="size-8 rounded-full">
              <CalendarDays className="w-5 h-5 rotate-90" />
            </Button>
            <div className="px-4 text-sm font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleMonthChange('next')} className="size-8 rounded-full">
              <CalendarDays className="w-5 h-5 -rotate-90" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-card-light dark:bg-[#1e1429] border-border-light dark:border-white/10 shadow-soft relative overflow-hidden group">
            <div className="flex items-center justify-between z-10 relative">
              <p className="text-text-secondary-light dark:text-gray-400 text-sm font-medium">Receitas Totais</p>
              <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-lg text-green-700 dark:text-green-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-text-main-light dark:text-white text-3xl font-bold tracking-tight mt-4 z-10 relative">{formatCurrency(totalReceitas)}</p>
          </Card>
          <Card className="p-6 bg-card-light dark:bg-[#1e1429] border-border-light dark:border-white/10 shadow-soft relative overflow-hidden group">
            <div className="flex items-center justify-between z-10 relative">
              <p className="text-text-secondary-light dark:text-gray-400 text-sm font-medium">Despesas Totais</p>
              <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-lg text-red-700 dark:text-red-400">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <p className="text-text-main-light dark:text-white text-3xl font-bold tracking-tight mt-4 z-10 relative">{formatCurrency(totalDespesas)}</p>
          </Card>
          <Card className="p-6 bg-card-light dark:bg-[#1e1429] border-border-light dark:border-white/10 shadow-soft relative overflow-hidden group">
            <div className="flex items-center justify-between z-10 relative">
              <p className="text-text-secondary-light dark:text-gray-400 text-sm font-medium">Resultado</p>
              <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-lg text-primary-new">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <p className={cn("text-3xl font-bold tracking-tight mt-4 z-10 relative", resultado >= 0 ? "text-emerald-600" : "text-red-600")}>
              {formatCurrency(resultado)}
            </p>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <Card className="lg:col-span-2 flex flex-col bg-card-light dark:bg-[#1e1429] rounded-xl border border-border-light dark:border-white/10 shadow-soft overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-white/10">
              <h3 className="text-text-main-light dark:text-text-main-dark text-lg font-bold">Detalhamento por Categoria</h3>
            </div>
            <div className="flex flex-col">
              {categoryTotals.length === 0 ? (
                <div className="p-12 text-center text-text-secondary-light">Nenhum lançamento neste mês.</div>
              ) : (
                categoryTotals.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 px-6 py-4 hover:bg-background-light dark:hover:bg-white/5 transition-colors border-b border-border-light dark:border-white/5 last:border-0">
                    <div className={cn(
                      "size-10 rounded-full flex items-center justify-center shrink-0",
                      item.tipo === 'receita' ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"
                    )}>
                      {item.tipo === 'receita' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col flex-1 gap-1">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-bold text-text-main-light dark:text-white">{item.nome}</p>
                        <p className="text-sm font-bold text-text-main-light dark:text-white">{formatCurrency(item.valor)}</p>
                      </div>
                      <div className="w-full bg-background-light dark:bg-white/10 rounded-full h-1.5 mt-1">
                        <div 
                          className={cn("h-1.5 rounded-full", item.tipo === 'receita' ? "bg-emerald-500" : "bg-orange-500")} 
                          style={{ width: `${Math.min((item.valor / (item.tipo === 'receita' ? totalReceitas : totalDespesas)) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="flex flex-col bg-card-light dark:bg-[#1e1429] rounded-xl border border-border-light dark:border-white/10 shadow-soft overflow-hidden h-full">
              <CardHeader className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-white/10">
                <CardTitle className="text-text-main-light dark:text-text-main-dark text-lg font-bold">Observações</CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex-1">
                <Textarea
                  placeholder="Notas sobre o mês..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  disabled={fechamento?.fem_fechado || saving}
                  rows={6}
                  className="w-full min-h-[160px] p-4 bg-background-light dark:bg-white/5 border-none focus-visible:ring-1 focus-visible:ring-primary-new"
                />
                <Button 
                  onClick={handleSaveObservacoes} 
                  disabled={fechamento?.fem_fechado || saving}
                  className="mt-4 w-full bg-primary-new hover:bg-primary-new/90 text-white"
                >
                  Salvar Observações
                </Button>
              </CardContent>
            </Card>

            <Card className="p-6 bg-card-light dark:bg-[#1e1429] border border-border-light dark:border-white/10 shadow-soft gap-4 flex flex-col">
              <div>
                <CardTitle className="text-text-main-light dark:text-text-main-dark text-lg font-bold mb-1">
                  {fechamento?.fem_fechado ? 'Reabrir Mês' : 'Fechar Mês'}
                </CardTitle>
                <p className="text-sm text-text-secondary-light dark:text-gray-400">
                  {fechamento?.fem_fechado ? 'Clique para permitir novas edições.' : 'Ao fechar, o mês se torna imutável.'}
                </p>
              </div>
              <Button
                onClick={handleToggleFecharMes}
                disabled={saving}
                className={cn(
                  "w-full flex items-center justify-center gap-3 rounded-xl h-12 text-base font-bold transition-all shadow-lg",
                  fechamento?.fem_fechado ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                )}
              >
                {fechamento?.fem_fechado ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                {fechamento?.fem_fechado ? 'Reabrir Mês' : 'Concluir e Fechar'}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Fechamento;