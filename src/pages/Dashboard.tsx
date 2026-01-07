"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Calendar, Eye, TrendingUp, TrendingDown, PiggyBank, Plus, Wallet, Lock } from 'lucide-react';
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

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;
      const grupoId = userData.usu_grupo;

      // 1. Fetch current month stats
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

      // 2. Fetch last 6 months for chart
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

      // 3. Consolidated balance (Simple sum of accounts)
      const { data: contas } = await supabase.from('contas').select('con_limite, con_tipo').eq('con_grupo', grupoId);
      let saldo = 0;
      contas?.forEach(c => {
        if (c.con_tipo !== 'cartao' && c.con_tipo !== 'passivo') saldo += Number(c.con_limite || 0);
        else saldo -= Number(c.con_limite || 0);
      });

      setStats({
        saldoConsolidado: saldo,
        receitasMes,
        despesasMes,
        resultadoMes: receitasMes - despesasMes,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (hideBalances) return '*****';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return (
      <MainLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Painel Principal">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-text-secondary-light dark:text-text-secondary-dark font-medium text-sm mb-1 capitalize">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
            <h1 className="text-3xl font-bold text-text-main-light dark:text-text-main-dark tracking-tight">Olá, {user?.email?.split('@')[0]}! 👋</h1>
          </div>
          <Button variant="ghost" className="text-text-secondary-light flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Este Mês
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-text-main-light to-[#2d2438] p-6 text-white rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-2 opacity-80"><Wallet className="w-5 h-5" /> <span>Saldo Total</span></div>
              <Button variant="ghost" size="icon" onClick={() => setHideBalances(!hideBalances)} className="text-white/50 hover:text-white"><Eye className="w-5 h-5" /></Button>
            </div>
            <h2 className="text-3xl font-bold mt-4 relative z-10">{formatCurrency(stats.saldoConsolidado)}</h2>
          </Card>
          <Card className="p-6 bg-card-light dark:bg-[#1e1629] border-border-light shadow-soft rounded-2xl">
            <div className="flex items-center gap-2 text-text-secondary-light"><ArrowDownRight className="text-emerald-500" /> <span>Receitas</span></div>
            <h2 className="text-2xl font-bold mt-2 text-text-main-light dark:text-white">{formatCurrency(stats.receitasMes)}</h2>
          </Card>
          <Card className="p-6 bg-card-light dark:bg-[#1e1629] border-border-light shadow-soft rounded-2xl">
            <div className="flex items-center gap-2 text-text-secondary-light"><ArrowUpRight className="text-red-500" /> <span>Despesas</span></div>
            <h2 className="text-2xl font-bold mt-2 text-text-main-light dark:text-white">{formatCurrency(stats.despesasMes)}</h2>
          </Card>
          <Card className="p-6 bg-card-light dark:bg-[#1e1629] border-border-light shadow-soft rounded-2xl">
            <div className="flex items-center gap-2 text-text-secondary-light"><PiggyBank className="text-blue-500" /> <span>Resultado</span></div>
            <h2 className={cn("text-2xl font-bold mt-2", stats.resultadoMes >= 0 ? "text-emerald-600" : "text-red-600")}>{formatCurrency(stats.resultadoMes)}</h2>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 bg-card-light dark:bg-[#1e1629] border-border-light shadow-soft rounded-2xl h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-bold text-lg text-text-main-light dark:text-white">Fluxo de Caixa</h3>
              <p className="text-sm text-text-secondary-light">Últimos 6 meses</p>
            </div>
            <div className="flex-1 flex items-end justify-between gap-4 px-2">
              {chartData.map((data, idx) => {
                const max = Math.max(...chartData.map(d => Math.max(d.receitas, d.despesas)), 1);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full flex justify-center items-end gap-1 h-full max-w-[50px]">
                      <div className="w-1/2 bg-emerald-400/80 rounded-t-sm transition-all group-hover:bg-emerald-500" style={{ height: `${(data.receitas / max) * 100}%` }}></div>
                      <div className="w-1/2 bg-red-400/80 rounded-t-sm transition-all group-hover:bg-red-500" style={{ height: `${(data.despesas / max) * 100}%` }}></div>
                    </div>
                    <span className="text-xs font-medium text-text-secondary-light uppercase">{data.month}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6 bg-card-light dark:bg-[#1e1629] border-border-light shadow-soft rounded-2xl flex flex-col">
            <h3 className="font-bold text-lg mb-6 text-text-main-light dark:text-white">Ações Rápidas</h3>
            <div className="flex flex-col gap-3">
              <Link to="/lancamentos"><Button className="w-full justify-start gap-2" variant="outline"><Plus className="w-4 h-4" /> Novo Lançamento</Button></Link>
              <Link to="/importacao-extratos"><Button className="w-full justify-start gap-2" variant="outline"><ArrowDownRight className="w-4 h-4 rotate-180" /> Importar Extrato</Button></Link>
              <Link to="/fechamento"><Button className="w-full justify-start gap-2" variant="outline"><Lock className="w-4 h-4" /> Fechamento Mensal</Button></Link>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;