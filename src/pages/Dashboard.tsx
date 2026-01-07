"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  PiggyBank, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  ChevronRight,
  PlusCircle,
  UploadCloud,
  PlusSquare,
  Search,
  Bell,
  Banknote,
  CreditCard,
  LineChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';

const dataMensal = [
  { name: 'Jan', receitas: 12000, despesas: 8000 },
  { name: 'Fev', receitas: 15000, despesas: 9500 },
  { name: 'Mar', receitas: 11000, despesas: 12000 },
  { name: 'Abr', receitas: 18000, despesas: 10000 },
  { name: 'Mai', receitas: 14000, despesas: 8500 },
  { name: 'Jun', receitas: 16500, despesas: 9000 },
];

const dataAcumulado = [
  { name: 'Jan', receitas: 12000, despesas: 8000 },
  { name: 'Fev', receitas: 27000, despesas: 17500 },
  { name: 'Mar', receitas: 38000, despesas: 29500 },
  { name: 'Abr', receitas: 56000, despesas: 39500 },
  { name: 'Mai', receitas: 70000, despesas: 48000 },
  { name: 'Jun', receitas: 86500, despesas: 57000 },
];

const Dashboard = () => {
  const { user } = useAuth();
  const [chartMode, setChartMode] = useState<'mensal' | 'acumulado'>('mensal');
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <MainLayout title="Visão Geral">
      <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#141118] dark:text-white tracking-tight">
              Bom dia, {user?.email?.split('@')[0]}! 👋
            </h1>
            <p className="text-text-secondary-light dark:text-[#a08cb6] font-medium text-sm mt-1 capitalize">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#756189] w-4 h-4" />
              <Input 
                placeholder="Buscar..." 
                className="w-64 pl-10 rounded-xl bg-white dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] focus-visible:ring-primary h-11"
              />
            </div>
            <Button variant="outline" size="icon" className="rounded-xl h-11 w-11 border-border-light dark:border-[#2d2438] bg-white dark:bg-[#1e1629]">
              <Bell className="w-5 h-5 text-[#756189]" />
            </Button>
          </div>
        </div>

        {/* Key Metrics Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Caixa Atual */}
          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col justify-between h-40">
            <div className="flex items-center gap-2 text-[#756189]">
              <Wallet className="w-5 h-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">Caixa Atual</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#141118] dark:text-white tracking-tight">
                {formatCurrency(124500)}
              </h2>
              <p className="text-xs text-text-secondary-light mt-1">Saldo disponível em contas</p>
            </div>
          </Card>

          {/* Receitas */}
          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col justify-between h-40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#756189]">
                <ArrowDownRight className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-semibold uppercase tracking-wider">Receitas</span>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span className="text-[10px] font-bold text-emerald-600">+12%</span>
              </div>
            </div>
            <h2 className="text-2xl font-black text-[#141118] dark:text-white tracking-tight">
              {formatCurrency(16500)}
            </h2>
          </Card>

          {/* Despesas */}
          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col justify-between h-40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#756189]">
                <ArrowUpRight className="w-5 h-5 text-rose-500" />
                <span className="text-sm font-semibold uppercase tracking-wider">Despesas</span>
              </div>
              <div className="bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-lg flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-rose-600" />
                <span className="text-[10px] font-bold text-rose-600">+5%</span>
              </div>
            </div>
            <h2 className="text-2xl font-black text-[#141118] dark:text-white tracking-tight">
              {formatCurrency(9000)}
            </h2>
          </Card>

          {/* Resultado do Mês - HIGHLIGHT */}
          <Card className="bg-primary dark:bg-primary p-6 rounded-2xl border-none shadow-hover flex flex-col justify-between h-40 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-20 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Resultado</span>
              </div>
              <LineChart className="w-5 h-5 opacity-50" />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl font-black tracking-tight">
                {formatCurrency(7500)}
              </h2>
              <div className="flex items-center gap-1 mt-1 opacity-90">
                <TrendingUp className="w-3 h-3" />
                <span className="text-[10px] font-bold">Saldo Positivo</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-4">
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 px-6 font-bold shadow-lg shadow-primary/25 transition-all">
            <PlusCircle className="w-5 h-5 mr-2" /> Novo Lançamento
          </Button>
          <Button variant="outline" className="rounded-xl h-12 px-6 font-bold border-border-light dark:border-[#2d2438] bg-white dark:bg-[#1e1629] text-[#756189] hover:text-primary transition-all">
            <UploadCloud className="w-5 h-5 mr-2" /> Importar Extrato
          </Button>
          <Button variant="outline" className="rounded-xl h-12 px-6 font-bold border-border-light dark:border-[#2d2438] bg-white dark:bg-[#1e1629] text-[#756189] hover:text-primary transition-all">
            <PlusSquare className="w-5 h-5 mr-2" /> Adicionar Conta
          </Button>
        </div>

        {/* Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Cash Flow Chart */}
          <Card className="lg:col-span-2 bg-white dark:bg-[#1e1629] p-8 rounded-3xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col h-[480px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <h3 className="text-xl font-black text-[#141118] dark:text-white">Fluxo de Caixa</h3>
                <p className="text-sm text-[#756189]">Acompanhamento de receitas e despesas</p>
              </div>
              <Tabs defaultValue="mensal" onValueChange={(v) => setChartMode(v as any)}>
                <TabsList className="bg-background-light dark:bg-[#2d2438] rounded-xl p-1 h-10">
                  <TabsTrigger value="mensal" className="rounded-lg text-xs font-bold px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-primary dark:data-[state=active]:text-white">Mensal</TabsTrigger>
                  <TabsTrigger value="acumulado" className="rounded-lg text-xs font-bold px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-primary dark:data-[state=active]:text-white">Acumulado</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex-1 w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartMode === 'mensal' ? dataMensal : dataAcumulado} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#756189' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#756189' }}
                    tickFormatter={(v) => `R$ ${v / 1000}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8f8f8' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                  <Bar dataKey="receitas" fill="#10B981" radius={[6, 6, 0, 0]} barSize={20} />
                  <Bar dataKey="despesas" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Minhas Contas List */}
          <Card className="bg-white dark:bg-[#1e1629] p-8 rounded-3xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-[#141118] dark:text-white">Minhas Contas</h3>
              <Plus className="w-5 h-5 text-primary cursor-pointer hover:scale-110 transition-transform" />
            </div>
            
            <div className="flex flex-col gap-6 flex-1">
              {[
                { name: 'NuBank Principal', type: 'Conta Corrente', val: 12450.20, color: '#820AD1', icon: Banknote },
                { name: 'Itaú Personalité', type: 'Investimentos', val: 85200.00, color: '#EC7000', icon: TrendingUp },
                { name: 'Mastercard Platinum', type: 'Cartão de Crédito', val: -4500.00, color: '#141118', icon: CreditCard },
                { name: 'Banco Inter', type: 'Conta Global', val: 2350.80, color: '#FF7A00', icon: Banknote },
              ].map((acc, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" 
                      style={{ backgroundColor: acc.color }}
                    >
                      <acc.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#141118] dark:text-white group-hover:text-primary transition-colors">{acc.name}</h4>
                      <p className="text-[10px] text-[#756189] font-bold uppercase tracking-widest">{acc.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-black tracking-tight", acc.val < 0 ? "text-rose-500" : "text-[#141118] dark:text-white")}>
                      {formatCurrency(acc.val)}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-500 font-bold">
                      {acc.val > 0 && <><TrendingUp className="w-2 h-2" /> 1.2%</>}
                    </div>
                  </div>
                </div>
              ))}
              
              <Button variant="ghost" className="mt-auto w-full py-6 rounded-2xl border border-dashed border-border-light dark:border-[#2d2438] text-sm font-bold text-[#756189] hover:bg-background-light dark:hover:bg-[#2d2438] transition-all flex items-center justify-center gap-2 group">
                Ver todas as contas <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;