"use client";

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  PiggyBank, 
  PlusCircle, 
  UploadCloud, 
  PlusSquare,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  LineChart,
  Building2,
  CreditCard,
  BarChart4
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Dashboard = ({ hideValues }: { hideValues: boolean }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    caixaAtual: 0,
    receitasMes: 0,
    despesasMes: 0,
    resultadoMes: 0
  });
  const [contas, setContas] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;

      const grupoId = userData.usu_grupo;

      // 1. Caixa Atual (Total absoluto das contas)
      const { data: accountsData } = await supabase
        .from('contas')
        .select('*')
        .eq('con_grupo', grupoId);

      // 2. Fluxo do Período (Mês atual)
      const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const { data: transactions } = await supabase
        .from('lancamentos')
        .select('lan_valor, categorias(cat_tipo)')
        .eq('lan_grupo', grupoId)
        .gte('lan_data', start)
        .lte('lan_data', end);

      let income = 0;
      let expense = 0;

      transactions?.forEach((t: any) => {
        const val = Number(t.lan_valor);
        if (t.categorias?.cat_tipo === 'receita') income += val;
        else expense += val;
      });

      setContas(accountsData || []);
      setMetrics({
        caixaAtual: accountsData?.filter(acc => acc.con_tipo !== 'cartao').reduce((acc, curr) => acc + (Number(curr.con_limite) || 0), 0) || 0, // Only non-credit card accounts
        receitasMes: income,
        despesasMes: expense,
        resultadoMes: income - expense
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getAccountIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'cartao': return <CreditCard className="w-5 h-5" />;
      case 'investimento': return <BarChart4 className="w-5 h-5" />;
      case 'dinheiro': return <Wallet className="w-5 h-5" />;
      default: return <Building2 className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-10">
      
      {/* Simple Greeting */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-[#141118] dark:text-white tracking-tight">
          {loading ? "Carregando..." : `Bom dia, ${user?.email?.split('@')[0]}! 👋`}
        </h1>
        <p className="text-text-secondary-light dark:text-[#a08cb6] font-medium text-sm capitalize">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* Key Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col justify-between h-40">
          <div className="flex items-center gap-2 text-[#756189]">
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.1em]">Caixa Atual</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#141118] dark:text-white tracking-tight">
              {formatCurrency(metrics.caixaAtual)}
            </h2>
            <p className="text-[10px] text-text-secondary-light mt-1 font-bold">Total em contas conectadas</p>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#756189]">
              <ArrowDownRight className="w-5 h-5 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.1em]">Receitas</span>
            </div>
            <span className="text-[9px] font-black text-text-secondary-light uppercase">Período atual</span>
          </div>
          <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(metrics.receitasMes)}
          </h2>
        </Card>

        <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#756189]">
              <ArrowUpRight className="w-5 h-5 text-rose-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.1em]">Despesas</span>
            </div>
            <span className="text-[9px] font-black text-text-secondary-light uppercase">Período atual</span>
          </div>
          <h2 className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
            {formatCurrency(metrics.despesasMes)}
          </h2>
        </Card>

        {/* Resultado do Mês - VISUAL HIGHLIGHT */}
        <Card className={cn(
          "p-6 rounded-2xl border-none shadow-hover flex flex-col justify-between h-40 text-white relative overflow-hidden transition-all duration-500",
          metrics.resultadoMes >= 0 ? "bg-primary" : "bg-rose-600"
        )}>
          <div className="absolute top-0 right-0 p-20 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-[0.1em]">Resultado</span>
            </div>
            {metrics.resultadoMes >= 0 ? <TrendingUp className="w-4 h-4 opacity-50" /> : <TrendingDown className="w-4 h-4 opacity-50" />}
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black tracking-tight">
              {formatCurrency(metrics.resultadoMes)}
            </h2>
            <div className="flex items-center gap-1 mt-1 opacity-80">
              <span className="text-[10px] font-bold uppercase tracking-wider">Período atual</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-4">
        <Button 
          onClick={() => navigate('/lancamentos')}
          className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 px-6 font-bold shadow-lg shadow-primary/25 transition-all group"
        >
          <PlusCircle className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" /> Novo Lançamento
        </Button>
        <Button 
          variant="outline" 
          onClick={() => navigate('/importacao-extratos')}
          className="rounded-xl h-12 px-6 font-bold border-border-light dark:border-[#2d2438] bg-white dark:bg-[#1e1629] text-[#756189] hover:text-primary transition-all"
        >
          <UploadCloud className="w-5 h-5 mr-2" /> Importar Extrato
        </Button>
        <Button 
          variant="outline" 
          onClick={() => navigate('/patrimonio')} // Updated to navigate to Patrimonio
          className="rounded-xl h-12 px-6 font-bold border-border-light dark:border-[#2d2438] bg-white dark:bg-[#1e1629] text-[#756189] hover:text-primary transition-all"
        >
          <PlusSquare className="w-5 h-5 mr-2" /> Adicionar Ativo
        </Button>
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Chart Placeholder */}
        <Card className="lg:col-span-2 bg-white dark:bg-[#1e1629] p-8 rounded-3xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col h-[480px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h3 className="text-xl font-black text-[#141118] dark:text-white">Fluxo de Caixa</h3>
              <p className="text-[10px] text-[#756189] font-bold uppercase tracking-widest mt-1">Análise de Receitas vs Despesas</p>
            </div>
            <Tabs defaultValue="mensal">
              <TabsList className="bg-background-light dark:bg-[#2d2438] rounded-xl p-1 h-10">
                <TabsTrigger value="mensal" className="rounded-lg text-[10px] font-black uppercase px-4">Mensal</TabsTrigger>
                <TabsTrigger value="acumulado" className="rounded-lg text-[10px] font-black uppercase px-4">Acumulado</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex-1 w-full bg-background-light/50 dark:bg-background-dark/30 rounded-2xl flex items-center justify-center border border-dashed border-border-light dark:border-[#3a3045]">
            <div className="text-center">
              <LineChart className="w-10 h-10 text-primary/20 mx-auto mb-3" />
              <p className="text-xs font-black uppercase tracking-widest text-text-secondary-light">Carregando visualização...</p>
            </div>
          </div>
        </Card>

        {/* Minhas Contas functional list */}
        <Card className="bg-white dark:bg-[#1e1629] p-8 rounded-3xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-[#141118] dark:text-white">Minhas Contas</h3>
            <PlusSquare 
              className="w-5 h-5 text-primary cursor-pointer hover:scale-110 transition-transform" 
              onClick={() => navigate('/patrimonio')}
            />
          </div>
          
          <div className="flex flex-col gap-6 flex-1">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={`loading-conta-${i}`} className="flex items-center gap-4 animate-pulse">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-[#2d2438]"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-100 dark:bg-[#2d2438] rounded w-1/2 mb-2"></div>
                    <div className="h-2 bg-gray-100 dark:bg-[#2d2438] rounded w-1/3"></div>
                  </div>
                </div>
              ))
            ) : contas.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-xs font-bold uppercase tracking-wider text-text-secondary-light">Nenhuma conta conectada.</p>
              </div>
            ) : (
              contas.slice(0, 5).map((acc, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer" onClick={() => navigate('/patrimonio')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-background-light dark:bg-[#2d2438] text-text-secondary-light shadow-sm transition-transform group-hover:scale-110">
                      {getAccountIcon(acc.con_tipo || '')}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#141118] dark:text-white group-hover:text-primary transition-colors">{acc.con_nome}</h4>
                      <p className="text-[9px] text-[#756189] font-black uppercase tracking-widest">{acc.con_tipo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-black tracking-tight", 
                      (Number(acc.con_limite) || 0) < 0 ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {formatCurrency(Number(acc.con_limite) || 0)}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            <Button 
              variant="ghost" 
              onClick={() => navigate('/patrimonio')}
              className="mt-auto w-full py-6 rounded-2xl border border-dashed border-border-light dark:border-[#2d2438] text-[10px] font-black uppercase tracking-[0.2em] text-[#756189] hover:bg-background-light dark:hover:bg-[#2d2438] transition-all flex items-center justify-center gap-2 group"
            >
              Gerenciar ativos <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;