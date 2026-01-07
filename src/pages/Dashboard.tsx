"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Calendar, Eye, TrendingUp, TrendingDown, PiggyBank, Plus, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardStats {
  saldoConsolidado: number;
  receitasMes: number;
  despesasMes: number;
  resultadoMes: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    saldoConsolidado: 0,
    receitasMes: 0,
    despesasMes: 0,
    resultadoMes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hideBalances, setHideBalances] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Get user's group
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;

      const grupoId = userData.usu_grupo;
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Fetch categories to distinguish between receita and despesa
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categorias')
        .select('cat_id, cat_tipo')
        .eq('cat_grupo', grupoId);

      if (categoriesError) throw categoriesError;

      const receitaCategoryIds = categoriesData?.filter(cat => cat.cat_tipo === 'receita').map(cat => cat.cat_id) || [];
      const despesaCategoryIds = categoriesData?.filter(cat => cat.cat_tipo === 'despesa').map(cat => cat.cat_id) || [];

      // Get all lancamentos for the current month
      const { data: lancamentosData, error: lancamentosError } = await supabase
        .from('lancamentos')
        .select('lan_valor, lan_categoria, lan_data')
        .eq('lan_grupo', grupoId)
        .gte('lan_data', format(new Date(currentYear, currentMonth - 1, 1), 'yyyy-MM-dd'))
        .lt('lan_data', format(new Date(currentYear, currentMonth, 1), 'yyyy-MM-dd'));

      if (lancamentosError) throw lancamentosError;

      let totalReceitasMes = 0;
      let totalDespesasMes = 0;

      lancamentosData?.forEach(lancamento => {
        if (receitaCategoryIds.includes(lancamento.lan_categoria)) {
          totalReceitasMes += Number(lancamento.lan_valor);
        } else if (despesaCategoryIds.includes(lancamento.lan_categoria)) {
          totalDespesasMes += Number(lancamento.lan_valor);
        }
      });

      // For consolidated balance, we need to sum all account balances
      const { data: contasData, error: contasError } = await supabase
        .from('contas')
        .select('con_id, con_nome, con_tipo, con_limite')
        .eq('con_grupo', grupoId);

      if (contasError) throw contasError;

      let saldoConsolidado = 0;
      // This is a simplified calculation. A real consolidated balance would involve
      // summing current balances from all accounts, which might not be directly
      // available as 'con_limite' is often a credit limit or initial balance.
      // For now, we'll use a simplified approach based on monthly result.
      saldoConsolidado = totalReceitasMes - totalDespesasMes; // Simplified for demo

      setStats({
        saldoConsolidado,
        receitasMes: totalReceitasMes,
        despesasMes: totalDespesasMes,
        resultadoMes: totalReceitasMes - totalDespesasMes,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (hideBalances) return '*****';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  if (loading) {
    return (
      <MainLayout title="Painel Principal">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Painel Principal">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Welcome/Date */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-text-secondary-light dark:text-text-secondary-dark font-medium text-sm mb-1 capitalize">{today}</p>
            <h1 className="text-3xl font-bold text-text-main-light dark:text-text-main-dark tracking-tight">Bom dia, {user?.email?.split('@')[0] || 'Usuário'}! 👋</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark hover:text-primary-new dark:hover:text-primary-new transition-colors flex items-center gap-1">
              <span>Filtro: Este Mês</span>
              <Calendar className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Hero Balance Card */}
          <Card className="bg-gradient-to-br from-text-main-light to-[#2d2438] rounded-2xl p-6 text-white shadow-xl shadow-gray-200 dark:shadow-none flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="flex justify-between items-start z-10">
              <div className="flex items-center gap-2 text-gray-300">
                <Wallet className="w-5 h-5" />
                <span className="text-sm font-medium">Saldo Total</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setHideBalances(!hideBalances)} className="text-gray-400 hover:text-white transition-colors">
                <Eye className="w-5 h-5" />
              </Button>
            </div>
            <div className="z-10 mt-4">
              <h2 className="text-3xl font-bold tracking-tight mb-1">{formatCurrency(stats.saldoConsolidado)}</h2>
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +2.5%
                </span>
                <span className="text-xs text-gray-400">vs. mês anterior</span>
              </div>
            </div>
          </Card>

          {/* Income Card */}
          <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 border border-border-light dark:border-[#2d2438] shadow-soft flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <span className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium">Receitas</span>
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark tracking-tight">{formatCurrency(stats.receitasMes)}</h2>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs font-medium mt-1">+10% este mês</p>
            </div>
          </Card>

          {/* Expenses Card */}
          <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 border border-border-light dark:border-[#2d2438] shadow-soft flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <span className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium">Despesas</span>
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark tracking-tight">{formatCurrency(stats.despesasMes)}</h2>
              <p className="text-red-600 dark:text-red-400 text-xs font-medium mt-1">+5% este mês</p>
            </div>
          </Card>

          {/* Net Result Card */}
          <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 border border-border-light dark:border-[#2d2438] shadow-soft flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <span className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium">Resultado</span>
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark tracking-tight">{formatCurrency(stats.resultadoMes)}</h2>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs font-medium mt-1">+15% de margem</p>
            </div>
          </Card>
        </div>

        {/* Main Section: Charts & Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Chart (Takes 2/3) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Chart Card */}
            <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 border border-border-light dark:border-[#2d2438] shadow-soft flex flex-col h-full min-h-[380px]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">Fluxo de Caixa</h3>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Entradas vs Saídas (6 Meses)</p>
                </div>
                <div className="flex gap-2 bg-background-light dark:bg-[#2d2438] p-1 rounded-lg">
                  <Button variant="ghost" className="px-3 py-1 bg-card-light dark:bg-[#362b45] text-text-main-light dark:text-text-main-dark text-xs font-medium rounded shadow-sm">Mensal</Button>
                  <Button variant="ghost" className="px-3 py-1 text-text-secondary-light dark:text-text-secondary-dark text-xs font-medium hover:text-text-main-light dark:hover:text-text-main-dark">Anual</Button>
                </div>
              </div>
              {/* Custom CSS Chart Implementation (Simplified static representation) */}
              <div className="flex-1 flex items-end justify-between gap-4 px-2 pt-8 pb-2">
                {/* Example Bars Group */}
                {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'].map((month, index) => (
                  <div key={month} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group cursor-pointer">
                    <div className="flex gap-1 h-[85%] items-end w-full justify-center max-w-[40px]">
                      <div className="w-full bg-emerald-400/80 rounded-t-sm h-full group-hover:bg-emerald-500 transition-colors relative">
                        <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-text-main-light text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10">R$ {Math.floor(Math.random() * 10 + 5)}k</div>
                      </div>
                      <div className="w-full bg-red-400/80 rounded-t-sm h-[40%] group-hover:bg-red-500 transition-colors"></div>
                    </div>
                    <span className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">{month}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Credit Cards Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">Cartões de Crédito</h3>
                <Link to="/cartoes" className="text-sm font-medium text-primary-new hover:text-primary-new/80">Ver todos</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1 (Example) */}
                <Card className="bg-card-light dark:bg-[#1e1629] p-5 rounded-2xl border border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-6 bg-text-main-light rounded bg-center bg-cover">
                        <div className="w-full h-full flex items-center justify-center gap-0.5">
                          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-500/80 -ml-1.5 mix-blend-screen"></div>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-main-light dark:text-text-main-dark">Mastercard Black</p>
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">**** 8842</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-text-secondary-light dark:text-text-secondary-dark">Fatura atual</span>
                      <span className="font-bold text-text-main-light dark:text-text-main-dark">{formatCurrency(2400)}</span>
                    </div>
                    <div className="w-full bg-background-light dark:bg-[#362b45] rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] mt-1.5 text-text-secondary-light dark:text-text-secondary-dark">
                      <span>Limite: {formatCurrency(50000)}</span>
                      <span>Disponível: {formatCurrency(47600)}</span>
                    </div>
                  </div>
                </Card>
                {/* Card 2 (Example) */}
                <Card className="bg-card-light dark:bg-[#1e1629] p-5 rounded-2xl border border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-6 bg-[#0052cc] rounded relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-500"></div>
                        <div className="absolute right-1 bottom-1 text-[8px] font-bold text-white italic">VISA</div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-main-light dark:text-text-main-dark">Visa Platinum</p>
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">**** 1290</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-text-secondary-light dark:text-text-secondary-dark">Fatura atual</span>
                      <span className="font-bold text-text-main-light dark:text-text-main-dark">{formatCurrency(8950)}</span>
                    </div>
                    <div className="w-full bg-background-light dark:bg-[#362b45] rounded-full h-2 overflow-hidden">
                      <div className="bg-orange-400 h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] mt-1.5 text-text-secondary-light dark:text-text-secondary-dark">
                      <span>Limite: {formatCurrency(12000)}</span>
                      <span>Disponível: {formatCurrency(3050)}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* Right Column: Accounts List (Takes 1/3) */}
          <div className="flex flex-col h-full">
            <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 border border-border-light dark:border-[#2d2438] shadow-soft flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">Minhas Contas</h3>
                <Link to="/patrimonio">
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full bg-background-light dark:bg-[#362b45] flex items-center justify-center text-text-main-light dark:text-text-main-dark hover:bg-gray-200 dark:hover:bg-[#362b45] transition-colors">
                    <Plus className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
              <div className="flex flex-col gap-4 flex-1">
                {/* Account Item (Example) */}
                <Link to="/patrimonio" className="flex items-center justify-between p-3 rounded-xl hover:bg-background-light dark:hover:bg-[#2d2438] transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#820AD1] flex items-center justify-center text-white font-bold text-xs">Nu</div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-text-main-light dark:text-text-main-dark">Nubank</span>
                      <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Conta Corrente</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-text-main-light dark:text-text-main-dark">{formatCurrency(5200)}</p>
                  </div>
                </Link>
                {/* Account Item (Example) */}
                <Link to="/patrimonio" className="flex items-center justify-between p-3 rounded-xl hover:bg-background-light dark:hover:bg-[#2d2438] transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#EC7000] flex items-center justify-center text-white font-bold text-xs">It</div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-text-main-light dark:text-text-main-dark">Itaú</span>
                      <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Investimentos</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-text-main-light dark:text-text-main-dark">{formatCurrency(110000)}</p>
                  </div>
                </Link>
                {/* Account Item (Example) */}
                <Link to="/patrimonio" className="flex items-center justify-between p-3 rounded-xl hover:bg-background-light dark:hover:bg-[#2d2438] transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#dc2626] flex items-center justify-center text-white font-bold text-xs">Br</div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-text-main-light dark:text-text-main-dark">Bradesco</span>
                      <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Poupança</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-text-main-light dark:text-text-main-dark">{formatCurrency(8500)}</p>
                  </div>
                </Link>
                {/* Account Item (Example) */}
                <Link to="/patrimonio" className="flex items-center justify-between p-3 rounded-xl hover:bg-background-light dark:hover:bg-[#2d2438] transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-text-main-light flex items-center justify-center text-white font-bold text-xs">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-text-main-light dark:text-text-main-dark">Carteira</span>
                      <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Dinheiro</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-text-main-light dark:text-text-main-dark">{formatCurrency(800)}</p>
                  </div>
                </Link>
                {/* See More Button */}
                <Link to="/patrimonio" className="mt-auto w-full py-3 rounded-xl border border-border-light dark:border-[#362b45] text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark hover:bg-background-light dark:hover:bg-[#2d2438] transition-colors text-center">
                  Gerenciar Contas
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;