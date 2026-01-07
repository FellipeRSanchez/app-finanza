"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, Landmark, PiggyBank, ArrowUp, ArrowDown, Droplet, Plus, CreditCard } from 'lucide-react'; // Ícones corrigidos
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Conta {
  con_id: string;
  con_nome: string;
  con_tipo: string;
  con_limite: number; // Usado como saldo para simplificação no design
}

const Patrimonio = () => {
  const { user } = useAuth();
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchContas();
    }
  }, [user]);

  const fetchContas = async () => {
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;

      const { data, error } = await supabase
        .from('contas')
        .select('*')
        .eq('con_grupo', userData.usu_grupo);

      if (error) throw error;
      setContas(data || []);
    } catch (error) {
      console.error('Error fetching contas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const ativos = contas.filter(c => ['banco', 'investimento', 'ativo'].includes(c.con_tipo));
  const passivos = contas.filter(c => ['cartao', 'passivo'].includes(c.con_tipo));

  const totalAtivos = ativos.reduce((sum, c) => sum + (c.con_limite || 0), 0);
  const totalPassivos = passivos.reduce((sum, c) => sum + (c.con_limite || 0), 0);
  const patrimonioLiquido = totalAtivos - totalPassivos;

  if (loading) {
    return (
      <MainLayout title="Patrimônio">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Patrimônio">
      <div className="mx-auto max-w-[1000px] flex flex-col gap-6 p-4 lg:p-8">
        {/* Hero Section: Total Net Worth */}
        <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 lg:p-8 shadow-soft border border-border-light dark:border-[#2d2438] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-primary-new" />
              <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-semibold uppercase tracking-wider">Patrimônio Líquido Total</p>
            </div>
            <h1 className="text-text-main-light dark:text-text-main-dark text-4xl lg:text-5xl font-bold tracking-tight">{formatCurrency(patrimonioLiquido)}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                +1.2%
              </span>
              <p className="text-sm text-gray-500">em relação ao mês passado</p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button className="flex-1 md:flex-none h-11 px-5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary/20">
              <Plus className="w-4 h-4" />
              Adicionar Ativo
            </Button>
            <Button variant="outline" className="flex-1 md:flex-none h-11 px-5 bg-card-light border border-border-light hover:bg-background-light text-text-main-light text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Relatório
            </Button>
          </div>
        </Card>

        {/* Summary Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Assets */}
          <Card className="bg-card-light dark:bg-[#1e1629] rounded-xl p-5 border border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ArrowUp className="text-green-600 w-12 h-12" />
            </div>
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium">Ativos Totais</p>
            <p className="text-text-main-light dark:text-text-main-dark text-2xl font-bold">{formatCurrency(totalAtivos)}</p>
            <div className="flex items-center gap-1 text-green-600 text-xs font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>0.5% este mês</span>
            </div>
          </Card>
          {/* Liabilities */}
          <Card className="bg-card-light dark:bg-[#1e1629] rounded-xl p-5 border border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ArrowDown className="text-red-600 w-12 h-12" />
            </div>
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium">Passivos Totais</p>
            <p className="text-text-main-light dark:text-text-main-dark text-2xl font-bold">{formatCurrency(totalPassivos)}</p>
            <div className="flex items-center gap-1 text-red-600 text-xs font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>2.1% este mês</span>
            </div>
          </Card>
          {/* Liquidity */}
          <Card className="bg-card-light dark:bg-[#1e1629] rounded-xl p-5 border border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Droplet className="text-blue-600 w-12 h-12" />
            </div>
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium">Liquidez Imediata</p>
            <p className="text-text-main-light dark:text-text-main-dark text-2xl font-bold">{formatCurrency(patrimonioLiquido * 0.1)}</p> {/* Simulação */}
            <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold mt-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Sem alteração</span>
            </div>
          </Card>
        </div>

        {/* Chart Section */}
        <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 shadow-soft border border-border-light dark:border-[#2d2438]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-text-main-light dark:text-text-main-dark text-lg font-bold">Evolução Patrimonial</h3>
            <div className="flex gap-2">
              <select className="bg-background-light dark:bg-[#2d2438] text-xs font-medium px-3 py-1.5 rounded-lg border-none focus:ring-0 cursor-pointer outline-none text-text-main-light dark:text-text-main-dark">
                <option>Últimos 12 meses</option>
                <option>Este ano</option>
                <option>Desde o início</option>
              </select>
            </div>
          </div>
          {/* Chart Placeholder using CSS Gradient to simulate chart area */}
          <div className="w-full h-[240px] relative flex items-end justify-between px-2 gap-2">
            {/* Y-Axis Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
              <div className="w-full h-px bg-gray-100 dark:bg-gray-800"></div>
              <div className="w-full h-px bg-gray-100 dark:bg-gray-800"></div>
              <div className="w-full h-px bg-gray-100 dark:bg-gray-800"></div>
              <div className="w-full h-px bg-gray-100 dark:bg-gray-800"></div>
              <div className="w-full h-px bg-gray-100 dark:bg-gray-800"></div>
            </div>
            {/* Simulated Data Bars/Area */}
            <div className="flex items-end gap-1 sm:gap-4 w-full h-[200px] z-10 px-4">
              {/* Bars representing growth */}
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-full bg-primary/20 hover:bg-primary/30 rounded-t-sm h-[calc(30%_+_var(--random-height))] relative group transition-all" style={{ '--random-height': `${Math.random() * 40}%` } as React.CSSProperties}>
                  <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-text-main-light text-white text-xs px-2 py-1 rounded">
                    {formatCurrency(patrimonioLiquido * (0.9 + i * 0.02))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400 px-4">
            <span>Jan</span>
            <span>Fev</span>
            <span>Mar</span>
            <span>Abr</span>
            <span>Mai</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Ago</span>
            <span>Set</span>
            <span>Out</span>
            <span>Nov</span>
            <span>Dez</span>
          </div>
        </Card>

        {/* Detailed Breakdown Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-text-main-light dark:text-text-main-dark text-lg font-bold">Quebra por Tipo</h3>
            <Button variant="link" className="text-primary-new text-sm font-semibold hover:underline">Ver Detalhes</Button>
          </div>
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
            <div className="col-span-5">Conta / Ativo</div>
            <div className="col-span-3">Tipo</div>
            <div className="col-span-4 text-right">Valor Atual</div>
          </div>
          {/* List Items */}
          <Card className="bg-card-light dark:bg-[#1e1629] rounded-xl shadow-soft border border-border-light dark:border-[#2d2438] overflow-hidden">
            {contas.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhuma conta cadastrada</p>
            ) : (
              contas.map((conta) => (
                <div key={conta.con_id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center border-b border-border-light dark:border-[#2d2438] hover:bg-background-light dark:hover:bg-[#2d2438] transition-colors last:border-b-0">
                  <div className="col-span-12 md:col-span-5 flex items-center gap-3">
                    <div className={cn(
                      "size-10 rounded-full flex items-center justify-center text-white",
                      conta.con_tipo === 'banco' ? 'bg-blue-600' :
                      conta.con_tipo === 'investimento' ? 'bg-yellow-600' :
                      conta.con_tipo === 'cartao' ? 'bg-purple-600' :
                      conta.con_tipo === 'ativo' ? 'bg-green-600' :
                      'bg-gray-600'
                    )}>
                      {conta.con_tipo === 'banco' && <Landmark className="w-5 h-5" />}
                      {conta.con_tipo === 'investimento' && <TrendingUp className="w-5 h-5" />}
                      {conta.con_tipo === 'cartao' && <CreditCard className="w-5 h-5" />}
                      {conta.con_tipo === 'ativo' && <Wallet className="w-5 h-5" />}
                      {conta.con_tipo === 'passivo' && <Landmark className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-text-main-light dark:text-text-main-dark">{conta.con_nome}</p>
                      <p className="text-xs text-gray-500 capitalize">{conta.con_tipo}</p>
                    </div>
                  </div>
                  <div className="col-span-6 md:col-span-3 flex items-center">
                    <span className={cn(
                      "text-xs font-semibold px-2.5 py-1 rounded-md border",
                      ['banco', 'investimento', 'ativo'].includes(conta.con_tipo)
                        ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                        : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                    )}>
                      {conta.con_tipo === 'passivo' || conta.con_tipo === 'cartao' ? 'Passivo' : 'Ativo'}
                    </span>
                  </div>
                  <div className="col-span-6 md:col-span-4 text-right">
                    <p className={cn(
                      "font-bold",
                      ['banco', 'investimento', 'ativo'].includes(conta.con_tipo)
                        ? 'text-text-main-light dark:text-text-main-dark'
                        : 'text-red-600 dark:text-red-400'
                    )}>
                      {['passivo', 'cartao'].includes(conta.con_tipo) ? '- ' : ''}{formatCurrency(conta.con_limite || 0)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Patrimonio;