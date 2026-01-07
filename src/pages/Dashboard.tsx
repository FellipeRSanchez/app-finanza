"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Calendar, Eye, EyeOff, TrendingUp, PiggyBank, Plus, Wallet, Lock, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardStats {
  saldoConsolidado: number;
  receitasMes: number;
  despesasMes: number;
  resultadoMes: number;
}

interface ChartData {
  month: string;
  receitas: number;
  despesas: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    saldoConsolidado: 0,
    receitasMes: 0,
    despesasMes: 0,
    resultadoMes: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideBalances, setHideBalances] = useState(false);
  const [hasNoData, setHasNoData] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Tentar buscar o registro do usuário e seu grupo
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .maybeSingle();

      if (!userData?.usu_grupo) {
        setHasNoData(true);
        setLoading(false);
        return;
      }
      
      const grupoId = userData.usu_grupo;

      // 1. Estatísticas do mês atual
      const now = new Date();
      const currentStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const currentEnd = format(endOfMonth(now), 'yyyy-MM-dd');

      const { data: currentLancamentos } = await supabase
        .from('lancamentos')
        .select(`lan_valor, categorias (cat_tipo)`)
        .eq('lan_grupo', grupoId)
        .gte('lan_data', currentStart)
        .lte('lan_data', currentEnd);

      let receitasMes = 0;
      let despesasMes = 0;
      currentLancamentos?.forEach((lan: any) => {
        const val = Number(lan.lan_valor);
        if (lan.categorias?.cat_tipo === 'receita') receitasMes += val;
        else despesasMes += val;
      });

      // 2. Dados dos últimos 6 meses para o gráfico
      const last6MonthsData: ChartData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const start = format(startOfMonth(date), 'yyyy-MM-dd');
        const end = format(endOfMonth(date), 'yyyy-MM-dd');

        const { data: l } = await supabase
          .from('lancamentos')
          .select(`lan_valor, categorias (cat_tipo)`)
          .eq('lan_grupo', grupoId)
          .gte('lan_data', start)
          .lte('lan_data', end);

        let r = 0; let d = 0;
        l?.forEach((item: any) => {
          if (item.categorias?.cat_tipo === 'receita') r += Number(item.lan_valor);
          else d += Number(item.lan_valor);
        });

        last6MonthsData.push({
          month: format(date, 'MMM', { locale: ptBR }),
          receitas: r,
          despesas: d
        });
      }
      setChartData(last6MonthsData);

      // 3. Saldo consolidado baseado nas contas
      const { data: contas } = await supabase
        .from('contas')
        .select('con_limite, con_tipo')
        .eq('con_grupo', grupoId);
        
      let saldo = 0;
      contas?.forEach(c => {
        // Para fins deste dashboard, 'con_limite' é usado como saldo atual se for banco/investimento
        if (c.con_tipo !== 'cartao' && c.con_tipo !== 'passivo') {
          saldo += Number(c.con_limite || 0);
        } else {
          saldo -= Number(c.con_limite || 0);
        }
      });

      setStats({
        saldoConsolidado: saldo,
        receitasMes,
        despesasMes,
        resultadoMes: receitasMes - despesasMes,
      });

      setHasNoData(last6MonthsData.every(d => d.receitas === 0 && d.despesas === 0) && saldo === 0);

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (hideBalances) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return (
      <MainLayout title="Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-new"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Painel Principal">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-text-secondary-light dark:text-text-secondary-dark font-medium text-sm mb-1 capitalize">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
            <h1 className="text-3xl font-bold text-text-main-light dark:text-white tracking-tight">
              Olá, {user?.email?.split('@')[0]}! 👋
            </h1>
          </div>
          <Button variant="ghost" className="text-text-secondary-light flex items-center gap-2 hover:bg-background-light dark:hover:bg-[#2d2438]">
            <Calendar className="w-4 h-4" /> Este Mês
          </Button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-[#141118] to-[#2d2438] p-6 text-white rounded-2xl relative overflow-hidden group shadow-xl">
            <div className="absolute top-0 right-0 p-32 bg-primary-new/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-2 opacity-80">
                <Wallet className="w-5 h-5" /> 
                <span className="text-sm font-medium">Saldo Total</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setHideBalances(!hideBalances)} 
                className="text-white/50 hover:text-white h-8 w-8"
              >
                {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <h2 className="text-3xl font-bold mt-4 relative z-10 transition-all">
              {formatCurrency(stats.saldoConsolidado)}
            </h2>
          </Card>
          
          <Card className="p-6 bg-card-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] shadow-soft rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-2 text-text-secondary-light dark:text-text-secondary-dark">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ArrowDownRight className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">Receitas</span>
            </div>
            <h2 className="text-2xl font-bold mt-4 text-text-main-light dark:text-white">
              {formatCurrency(stats.receitasMes)}
            </h2>
          </Card>

          <Card className="p-6 bg-card-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] shadow-soft rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-2 text-text-secondary-light dark:text-text-secondary-dark">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">Despesas</span>
            </div>
            <h2 className="text-2xl font-bold mt-4 text-text-main-light dark:text-white">
              {formatCurrency(stats.despesasMes)}
            </h2>
          </Card>

          <Card className="p-6 bg-card-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] shadow-soft rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-2 text-text-secondary-light dark:text-text-secondary-dark">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <PiggyBank className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">Resultado</span>
            </div>
            <h2 className={cn("text-2xl font-bold mt-4", stats.resultadoMes >= 0 ? "text-emerald-600" : "text-red-600")}>
              {formatCurrency(stats.resultadoMes)}
            </h2>
          </Card>
        </div>

        {/* Main Section: Charts & Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 bg-card-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] shadow-soft rounded-2xl h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="font-bold text-lg text-text-main-light dark:text-white">Fluxo de Caixa</h3>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Últimos 6 meses</p>
              </div>
              <div className="flex gap-2 bg-background-light dark:bg-[#2d2438] p-1 rounded-lg">
                <Button variant="ghost" size="sm" className="bg-white dark:bg-[#362b45] shadow-sm text-xs h-7">Mensal</Button>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-text-secondary-light">Anual</Button>
              </div>
            </div>
            
            <div className="flex-1 flex items-end justify-between gap-4 px-2 pt-8 pb-2 relative">
              {hasNoData ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary-light dark:text-text-secondary-dark opacity-50">
                  <TrendingUp className="w-12 h-12 mb-2" />
                  <p className="text-sm">Ainda não há dados suficientes para exibir o gráfico.</p>
                </div>
              ) : (
                chartData.map((data, idx) => {
                  const max = Math.max(...chartData.map(d => Math.max(d.receitas, d.despesas)), 1);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full justify-end">
                      <div className="w-full flex justify-center items-end gap-1 h-full max-w-[50px] relative">
                        <div 
                          className="w-full bg-emerald-400/80 rounded-t-sm transition-all group-hover:bg-emerald-500" 
                          style={{ height: `${(data.receitas / max) * 100}%` }}
                        >
                          <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10">R: {formatCurrency(data.receitas)}</div>
                        </div>
                        <div 
                          className="w-full bg-red-400/80 rounded-t-sm transition-all group-hover:bg-red-500" 
                          style={{ height: `${(data.despesas / max) * 100}%` }}
                        >
                          <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10 translate-y-4">D: {formatCurrency(data.despesas)}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">{data.month}</span>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="p-6 bg-card-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] shadow-soft rounded-2xl flex flex-col h-full">
            <h3 className="font-bold text-lg mb-6 text-text-main-light dark:text-white">Ações Rápidas</h3>
            <div className="flex flex-col gap-3">
              <Link to="/lancamentos">
                <Button className="w-full justify-start gap-3 h-12 rounded-xl text-text-main-light dark:text-white border-border-light dark:border-[#3a3045] hover:bg-background-light dark:hover:bg-[#2d2438]" variant="outline">
                  <Plus className="w-5 h-5 text-primary-new" /> Novo Lançamento
                </Button>
              </Link>
              <Link to="/importacao-extratos">
                <Button className="w-full justify-start gap-3 h-12 rounded-xl text-text-main-light dark:text-white border-border-light dark:border-[#3a3045] hover:bg-background-light dark:hover:bg-[#2d2438]" variant="outline">
                  <Upload className="w-5 h-5 text-blue-500" /> Importar Extrato
                </Button>
              </Link>
              <Link to="/fechamento">
                <Button className="w-full justify-start gap-3 h-12 rounded-xl text-text-main-light dark:text-white border-border-light dark:border-[#3a3045] hover:bg-background-light dark:hover:bg-[#2d2438]" variant="outline">
                  <Lock className="w-5 h-5 text-orange-500" /> Fechamento Mensal
                </Button>
              </Link>
            </div>
            
            <div className="mt-auto pt-6">
              <div className="bg-primary-new/5 rounded-2xl p-4 border border-primary-new/10">
                <p className="text-xs font-bold text-primary-new uppercase mb-1">Dica do dia</p>
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
                  Mantenha suas contas em dia realizando o fechamento mensal até o dia 5 do mês seguinte.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;