"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, PieChart, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface CategoryStats {
  category: string;
  amount: number;
  percentage: number;
  type: 'receita' | 'despesa';
}

const Relatorios = ({ hideValues }: { hideValues: boolean }) => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('monthly');
  const [reportType, setReportType] = useState<'income' | 'expenses'>('expenses');
  const [stats, setStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ income: 0, expenses: 0 });

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user, reportType, timeRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();
      if (!userData?.usu_grupo) return;
      const now = new Date();
      const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(now), 'yyyy-MM-dd');
      const { data: lancamentos, error: lError } = await supabase
        .from('lancamentos')
        .select(` lan_valor, categorias (cat_nome) `)
        .eq('lan_grupo', userData.usu_grupo)
        .gte('lan_data', startDate)
        .lte('lan_data', endDate);
      if (lError) throw lError;
      const grouped: Record<string, { amount: number, type: 'receita' | 'despesa' }> = {};
      let totalIncome = 0;
      let totalExpenses = 0;
      lancamentos?.forEach((lan: any) => {
        const valor = Number(lan.lan_valor);
        const type: 'receita' | 'despesa' = valor > 0 ? 'receita' : 'despesa';
        const name = lan.categorias?.cat_nome || 'Sem Categoria';
        if (type === 'receita') totalIncome += valor;
        if (type === 'despesa') totalExpenses += Math.abs(valor);
        if (type === (reportType === 'income' ? 'receita' : 'despesa')) {
          if (!grouped[name]) {
            grouped[name] = { amount: 0, type: type };
          }
          grouped[name].amount += Math.abs(valor);
        }
      });
      const currentTotal = reportType === 'income' ? totalIncome : totalExpenses;
      const statsArray = Object.entries(grouped).map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: currentTotal > 0 ? (data.amount / currentTotal) * 100 : 0,
        type: data.type
      })).sort((a, b) => b.amount - a.amount);
      setStats(statsArray);
      setTotals({ income: totalIncome, expenses: totalExpenses });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
      <div className="space-y-6 p-4 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-main-light dark:text-text-main-dark">Relatórios Financeiros</h1>
            <p className="text-text-secondary-light dark:text-text-secondary-dark mt-2">
              Analise seus gastos e receitas com gráficos detalhados
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-background-light dark:bg-[#2d2438] rounded-lg p-1">
              <Button 
                variant={timeRange === 'monthly' ? 'default' : 'ghost'} 
                size="sm" 
                className={timeRange === 'monthly' ? 'bg-primary-new text-white' : 'text-text-secondary-light dark:text-text-secondary-dark'} 
                onClick={() => setTimeRange('monthly')}
              >
                Mensal
              </Button>
              <Button 
                variant={timeRange === 'yearly' ? 'default' : 'ghost'} 
                size="sm" 
                className={timeRange === 'yearly' ? 'bg-primary-new text-white' : 'text-text-secondary-light dark:text-text-secondary-dark'} 
                onClick={() => setTimeRange('yearly')}
              >
                Anual
              </Button>
            </div>
            <Button variant="outline" size="icon" className="border-border-light dark:border-[#3a3045]">
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438]">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-text-main-light dark:text-text-main-dark">
                  {reportType === 'expenses' ? 'Distribuição de Gastos' : 'Fontes de Receita'}
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant={reportType === 'expenses' ? 'default' : 'outline'} 
                    size="sm" 
                    className={reportType === 'expenses' ? 'bg-red-500 hover:bg-red-600 text-white' : 'border-border-light dark:border-[#3a3045] text-text-secondary-light dark:text-text-secondary-dark'} 
                    onClick={() => setReportType('expenses')}
                  >
                    <TrendingDown className="h-4 w-4 mr-2" /> Despesas
                  </Button>
                  <Button 
                    variant={reportType === 'income' ? 'default' : 'outline'} 
                    size="sm" 
                    className={reportType === 'income' ? 'bg-green-500 hover:bg-green-600 text-white' : 'border-border-light dark:border-[#3a3045] text-text-secondary-light dark:text-text-secondary-dark'} 
                    onClick={() => setReportType('income')}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" /> Receitas
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  {loading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  ) : (
                    <div className="text-center">
                      <PieChart className="h-16 w-16 mx-auto text-text-secondary-light dark:text-text-secondary-dark opacity-50" />
                      <p className="mt-4 text-text-secondary-light dark:text-text-secondary-dark">
                        Visualização de {stats.length} categorias
                      </p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {stats.slice(0, 5).map((s, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs px-2 py-1 bg-background-light dark:bg-background-dark rounded">
                            <span className="w-2 h-2 rounded-full bg-primary-new"></span>
                            {s.category}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438]">
              <CardHeader>
                <CardTitle className="text-text-main-light dark:text-text-main-dark">
                  Evolução Financeira
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart className="h-16 w-16 mx-auto text-text-secondary-light dark:text-text-secondary-dark opacity-50" />
                    <p className="mt-4 text-text-secondary-light dark:text-text-secondary-dark">
                      Comparação histórica em breve
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="bg-card-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438]">
              <CardHeader>
                <CardTitle className="text-text-main-light dark:text-text-main-dark">
                  Resumo do Período
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">Receitas Totais</span>
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-text-main-light dark:text-text-main-dark mt-2">
                    {formatCurrency(totals.income)}
                  </p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">Despesas Totais</span>
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  </div>
                  <p className="text-2xl font-bold text-text-main-light dark:text-text-main-dark mt-2">
                    {formatCurrency(totals.expenses)}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">Resultado</span>
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-text-main-light dark:text-text-main-dark mt-2">
                    {formatCurrency(totals.income - totals.expenses)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438]">
              <CardHeader>
                <CardTitle className="text-text-main-light dark:text-text-main-dark">
                  Maiores {reportType === 'expenses' ? 'Gastos' : 'Fontes'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.length === 0 ? (
                  <p className="text-sm text-text-secondary-light text-center py-4">Nenhum dado encontrado</p>
                ) : (
                  stats.map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                          {item.category}
                        </span>
                        <span className="text-sm font-medium text-text-main-light dark:text-text-main-dark">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                      <div className="w-full bg-background-light dark:bg-[#2d2438] rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${item.type === 'despesa' ? 'bg-red-500' : 'bg-green-500'}`} 
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
};

export default Relatorios;