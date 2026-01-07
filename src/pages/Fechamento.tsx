"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Lock, Unlock, CheckCircle, CalendarDays, Edit } from 'lucide-react'; // Adicionado Edit
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Fechamento {
  fem_id: string;
  fem_mes: number;
  fem_ano: number;
  fem_observacoes: string;
  fem_fechado: boolean;
}

const Fechamento = () => {
  const { user } = useAuth();
  const [fechamento, setFechamento] = useState<Fechamento | null>(null);
  const [observacoes, setObservacoes] = useState('');
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
      fetchFechamento();
    }
  }, [user, selectedMonth, selectedYear]);

  const fetchFechamento = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;

      const { data, error } = await supabase
        .from('fechamentos_mensais')
        .select('*')
        .eq('fem_grupo', userData.usu_grupo)
        .eq('fem_mes', selectedMonth)
        .eq('fem_ano', selectedYear)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }

      if (data) {
        setFechamento(data);
        setObservacoes(data.fem_observacoes || '');
      } else {
        setFechamento(null);
        setObservacoes('');
      }
    } catch (error) {
      console.error('Error fetching fechamento:', error);
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
        if (data) {
          setFechamento(data);
        }
      }
    } catch (error) {
      console.error('Error saving observacoes:', error);
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
        // If no record exists, create one and set it to closed
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
        if (data) {
          setFechamento(data);
        }
      }
    } catch (error) {
      console.error('Error toggling month status:', error);
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

  if (loading) {
    return (
      <MainLayout title="Fechamento Mensal">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  const isCurrentMonth = selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear();

  return (
    <MainLayout title="Fechamento Mensal">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-8 p-4 md:p-8">
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
                {fechamento?.fem_fechado ? (
                  <>
                    <Lock className="w-3 h-3" />
                    Mês Fechado
                  </>
                ) : (
                  <>
                    <Unlock className="w-3 h-3" />
                    Mês Aberto
                  </>
                )}
              </span>
            </div>
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-base font-normal">
              Confira os lançamentos e consolide o resultado antes de fechar.
            </p>
          </div>
          {/* Month Selector */}
          <div className="flex items-center bg-background-light dark:bg-white/5 rounded-full p-1 border border-transparent dark:border-white/10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleMonthChange('prev')}
              className="size-8 flex items-center justify-center rounded-full hover:bg-card-light dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <CalendarDays className="w-5 h-5 rotate-90" />
            </Button>
            <div className="px-4 text-sm font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary-new" />
              {monthNames[selectedMonth - 1]} {selectedYear}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleMonthChange('next')}
              className="size-8 flex items-center justify-center rounded-full hover:bg-card-light dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <CalendarDays className="w-5 h-5 -rotate-90" />
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Details Table (Placeholder for now, as per original design) */}
          <div className="lg:col-span-2 flex flex-col bg-card-light dark:bg-[#1e1429] rounded-xl border border-border-light dark:border-white/10 shadow-soft overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-white/10">
              <h3 className="text-text-main-light dark:text-text-main-dark text-lg font-bold">Detalhamento por Categoria</h3>
              <Button variant="link" className="text-primary-new text-sm font-bold hover:underline">Ver tudo</Button>
            </div>
            <div className="p-6 text-text-secondary-light dark:text-text-secondary-dark text-center">
              <p>Dados de detalhamento por categoria virão aqui.</p>
              <p className="text-sm mt-2">Este módulo está em desenvolvimento.</p>
            </div>
          </div>

          {/* Notes & Close Action */}
          <div className="flex flex-col gap-6">
            {/* Notes Card */}
            <Card className="flex flex-col bg-card-light dark:bg-[#1e1429] rounded-xl border border-border-light dark:border-white/10 shadow-soft overflow-hidden h-full">
              <CardHeader className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-white/10">
                <CardTitle className="text-text-main-light dark:text-text-main-dark text-lg font-bold">Observações</CardTitle>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:bg-background-light dark:hover:bg-[#2d2438]">
                  <Edit className="w-5 h-5" />
                </Button>
              </CardHeader>
              <CardContent className="p-4 flex-1">
                <Textarea
                  placeholder="Adicione notas sobre o mês (ex: Recebi 13º salário, Gasto extra com manutenção do carro)..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  disabled={fechamento?.fem_fechado || saving}
                  rows={6}
                  className="w-full h-full min-h-[160px] p-4 rounded-lg bg-background-light dark:bg-white/5 border border-transparent focus-visible:border-primary-new focus-visible:ring-1 focus-visible:ring-primary-new text-sm text-text-main-light dark:text-text-main-dark resize-none placeholder-text-secondary-light dark:placeholder-text-secondary-dark transition-all"
                />
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleSaveObservacoes}
                    disabled={fechamento?.fem_fechado || saving}
                    className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                  >
                    Salvar Observações
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Close Action Card */}
            <Card className="flex flex-col bg-card-light dark:bg-[#1e1429] rounded-xl border border-border-light dark:border-white/10 shadow-soft p-6 gap-4">
              <div>
                <CardTitle className="text-text-main-light dark:text-text-main-dark text-lg font-bold mb-1">
                  {fechamento?.fem_fechado ? 'Reabrir Mês' : 'Fechar Mês'}
                </CardTitle>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                  Ao {fechamento?.fem_fechado ? 'reabrir' : 'fechar'}, os lançamentos {fechamento?.fem_fechado ? 'poderão' : 'não poderão'} ser mais editados.
                </p>
              </div>
              <Button
                onClick={handleToggleFecharMes}
                disabled={saving}
                className={cn(
                  "group w-full flex items-center justify-center gap-3 rounded-xl h-12 text-base font-bold transition-all shadow-lg",
                  fechamento?.fem_fechado
                    ? 'bg-green-600 hover:bg-green-700 shadow-green-600/30 text-white'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/30 text-white'
                )}
              >
                {fechamento?.fem_fechado ? (
                  <>
                    <Unlock className="w-5 h-5" />
                    Reabrir Mês
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Concluir e Fechar
                  </>
                )}
              </Button>
            </Card>
          </div>
        </div>

        {/* Info */}
        {fechamento?.fem_fechado && (
          <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-900">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900 dark:text-yellow-200">
                    Mês Fechado
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Este mês está fechado. Você não pode criar, editar ou excluir lançamentos deste período.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Fechamento;