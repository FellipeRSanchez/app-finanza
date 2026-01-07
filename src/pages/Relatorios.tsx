"use client";
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, PieChart, TrendingUp, TrendingDown, Calendar, Filter } from 'lucide-react';
import { useState } from 'react';

const Relatorios = () => {
  const [timeRange, setTimeRange] = useState('monthly');
  const [reportType, setReportType] = useState('expenses');

  // Sample data for charts
  const expenseData = [
    { category: 'Alimentação', amount: 2450, percentage: 35 },
    { category: 'Moradia', amount: 3100, percentage: 44 },
    { category: 'Transporte', amount: 850, percentage: 12 },
    { category: 'Saúde', amount: 420, percentage: 6 },
    { category: 'Lazer', amount: 280, percentage: 4 },
  ];

  const incomeData = [
    { source: 'Salário', amount: 8500, percentage: 75 },
    { source: 'Freelance', amount: 1500, percentage: 13 },
    { source: 'Investimentos', amount: 900, percentage: 8 },
    { source: 'Outros', amount: 400, percentage: 4 },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <MainLayout title="Relatórios">
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
                variant={timeRange === 'quarterly' ? 'default' : 'ghost'}
                size="sm"
                className={timeRange === 'quarterly' ? 'bg-primary-new text-white' : 'text-text-secondary-light dark:text-text-secondary-dark'}
                onClick={() => setTimeRange('quarterly')}
              >
                Trimestral
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
                    <TrendingDown className="h-4 w-4 mr-2" />
                    Despesas
                  </Button>
                  <Button
                    variant={reportType === 'income' ? 'default' : 'outline'}
                    size="sm"
                    className={reportType === 'income' ? 'bg-green-500 hover:bg-green-600 text-white' : 'border-border-light dark:border-[#3a3045] text-text-secondary-light dark:text-text-secondary-dark'}
                    onClick={() => setReportType('income')}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Receitas
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <PieChart className="h-16 w-16 mx-auto text-text-secondary-light dark:text-text-secondary-dark" />
                    <p className="mt-4 text-text-secondary-light dark:text-text-secondary-dark">
                      Gráfico de pizza será exibido aqui
                    </p>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2">
                      Visualização detalhada da distribuição {reportType === 'expenses' ? 'de gastos' : 'de receitas'}
                    </p>
                  </div>
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
                    <BarChart className="h-16 w-16 mx-auto text-text-secondary-light dark:text-text-secondary-dark" />
                    <p className="mt-4 text-text-secondary-light dark:text-text-secondary-dark">
                      Gráfico de barras será exibido aqui
                    </p>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2">
                      Comparação de receitas e despesas ao longo do tempo
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
                    {formatCurrency(12500)}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    +12% em relação ao período anterior
                  </p>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">Despesas Totais</span>
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  </div>
                  <p className="text-2xl font-bold text-text-main-light dark:text-text-main-dark mt-2">
                    {formatCurrency(8200)}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    +5% em relação ao período anterior
                  </p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">Resultado</span>
                    <BarChart className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-text-main-light dark:text-text-main-dark mt-2">
                    {formatCurrency(4300)}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    +8% em relação ao período anterior
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438]">
              <CardHeader>
                <CardTitle className="text-text-main-light dark:text-text-main-dark">
                  Categorias Principais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(reportType === 'expenses' ? expenseData : incomeData).map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        {item.category || item.source}
                      </span>
                      <span className="text-sm font-medium text-text-main-light dark:text-text-main-dark">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                    <div className="w-full bg-background-light dark:bg-[#2d2438] rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          reportType === 'expenses' ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-right mt-1">
                      <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Relatorios;