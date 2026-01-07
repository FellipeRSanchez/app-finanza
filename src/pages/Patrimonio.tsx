"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, Landmark, PiggyBank, ArrowUp, ArrowDown, Droplet, Plus, CreditCard, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Conta {
  con_id: string;
  con_nome: string;
  con_tipo: string;
  con_limite: number;
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
        .maybeSingle();

      if (!userData?.usu_grupo) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('contas')
        .select('*')
        .eq('con_grupo', userData.usu_grupo);

      if (error) throw error;
      setContas(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
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

  const ativos = contas.filter(c => ['banco', 'investimento', 'ativo', 'poupanca'].includes(c.con_tipo));
  const passivos = contas.filter(c => ['cartao', 'passivo'].includes(c.con_tipo));

  const totalAtivos = ativos.reduce((sum, c) => sum + (c.con_limite || 0), 0);
  const totalPassivos = passivos.reduce((sum, c) => sum + (c.con_limite || 0), 0);
  const patrimonioLiquido = totalAtivos - totalPassivos;

  if (loading) {
    return (
      <MainLayout title="Patrimônio">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-new"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Patrimônio">
      <div className="mx-auto max-w-7xl flex flex-col gap-6 p-4 lg:p-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
          <span>Finanças</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-primary-new">Patrimônio</span>
        </div>

        {/* Hero Section */}
        <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 lg:p-10 shadow-soft border border-border-light dark:border-[#2d2438] flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-48 bg-primary-new/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
          <div className="flex flex-col gap-3 relative z-10">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-primary-new" />
              <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-semibold uppercase tracking-wider">Patrimônio Líquido Total</p>
            </div>
            <h1 className="text-text-main-light dark:text-white text-4xl lg:text-5xl font-black tracking-tight">{formatCurrency(patrimonioLiquido)}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> +1.2%
              </span>
              <p className="text-sm text-text-secondary-light">em relação ao mês passado</p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto relative z-10">
            <Button className="flex-1 md:flex-none h-12 px-6 bg-primary-new hover:bg-primary-new/90 text-white font-bold rounded-xl shadow-lg shadow-primary-new/20 transition-all transform active:scale-95">
              <Plus className="w-5 h-5 mr-2" /> Adicionar Ativo
            </Button>
            <Button variant="outline" className="flex-1 md:flex-none h-12 px-6 border-border-light dark:border-[#3a3045] hover:bg-background-light dark:hover:bg-[#2d2438] text-text-main-light dark:text-white font-bold rounded-xl shadow-sm">
              Relatório
            </Button>
          </div>
        </Card>

        {/* Summary Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 border border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-2 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ArrowUp className="text-green-600 w-12 h-12" />
            </div>
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium">Ativos Totais</p>
            <p className="text-text-main-light dark:text-white text-2xl font-bold">{formatCurrency(totalAtivos)}</p>
            <div className="flex items-center gap-1 text-green-600 text-xs font-semibold mt-1">
              <TrendingUp className="w-4 h-4" /> <span>0.5% este mês</span>
            </div>
          </Card>
          
          <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 border border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-2 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ArrowDown className="text-red-600 w-12 h-12" />
            </div>
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium">Passivos Totais</p>
            <p className="text-text-main-light dark:text-white text-2xl font-bold">{formatCurrency(totalPassivos)}</p>
            <div className="flex items-center gap-1 text-red-600 text-xs font-semibold mt-1">
              <TrendingDown className="w-4 h-4" /> <span>2.1% este mês</span>
            </div>
          </Card>

          <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 border border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-2 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Droplet className="text-blue-600 w-12 h-12" />
            </div>
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium">Liquidez Imediata</p>
            <p className="text-text-main-light dark:text-white text-2xl font-bold">{formatCurrency(totalAtivos * 0.15)}</p>
            <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold mt-1">
              <span>Sem alteração significativa</span>
            </div>
          </Card>
        </div>

        {/* Detailed Breakdown Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-text-main-light dark:text-white text-xl font-bold">Detalhamento de Ativos e Passivos</h3>
            <Button variant="link" className="text-primary-new font-bold hover:no-underline">Ver Todos</Button>
          </div>
          
          <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl shadow-soft border border-border-light dark:border-[#2d2438] overflow-hidden">
            {contas.length === 0 ? (
              <div className="p-12 text-center text-text-secondary-light dark:text-text-secondary-dark">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Nenhuma conta ou ativo cadastrado ainda.</p>
                <Button variant="outline" className="mt-4 rounded-xl">Começar a cadastrar</Button>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border-light dark:divide-[#2d2438]">
                {contas.map((conta) => (
                  <div key={conta.con_id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-5 items-center hover:bg-background-light dark:hover:bg-[#2d2438]/50 transition-colors">
                    <div className="col-span-12 md:col-span-5 flex items-center gap-4">
                      <div className={cn(
                        "size-10 rounded-xl flex items-center justify-center text-white shadow-sm",
                        conta.con_tipo === 'banco' ? 'bg-blue-500' :
                        conta.con_tipo === 'investimento' ? 'bg-yellow-500' :
                        conta.con_tipo === 'cartao' ? 'bg-purple-500' :
                        conta.con_tipo === 'ativo' ? 'bg-emerald-500' :
                        'bg-gray-500'
                      )}>
                        {conta.con_tipo === 'banco' && <Landmark className="w-5 h-5" />}
                        {conta.con_tipo === 'investimento' && <TrendingUp className="w-5 h-5" />}
                        {conta.con_tipo === 'cartao' && <CreditCard className="w-5 h-5" />}
                        {conta.con_tipo === 'ativo' && <Wallet className="w-5 h-5" />}
                        {conta.con_tipo === 'passivo' && <ArrowDown className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <p className="font-bold text-text-main-light dark:text-white truncate">{conta.con_nome}</p>
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase font-semibold">{conta.con_tipo}</p>
                      </div>
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border",
                        ['banco', 'investimento', 'ativo', 'poupanca'].includes(conta.con_tipo)
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                          : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                      )}>
                        {['cartao', 'passivo'].includes(conta.con_tipo) ? 'Passivo' : 'Ativo'}
                      </span>
                    </div>
                    <div className="col-span-6 md:col-span-4 text-right">
                      <p className={cn(
                        "text-lg font-bold",
                        ['banco', 'investimento', 'ativo', 'poupanca'].includes(conta.con_tipo)
                          ? 'text-text-main-light dark:text-white'
                          : 'text-red-600 dark:text-red-400'
                      )}>
                        {['cartao', 'passivo'].includes(conta.con_tipo) ? '- ' : ''}{formatCurrency(conta.con_limite || 0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Patrimonio;