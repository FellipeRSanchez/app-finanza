"use client";

import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard, TrendingUp, TrendingDown, ReceiptText, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Conta {
  con_id: string;
  con_nome: string;
  con_tipo: string;
  con_limite: number;
  con_data_fechamento: number;
  con_data_vencimento: number;
}

const Cartoes = () => {
  const { user } = useAuth();
  const [cartoes, setCartoes] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCartoes();
    }
  }, [user]);

  const fetchCartoes = async () => {
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
        .eq('con_grupo', userData.usu_grupo)
        .eq('con_tipo', 'cartao'); // Filtrar apenas cartões

      if (error) throw error;
      setCartoes(data || []);
    } catch (error) {
      console.error('Error fetching cartões:', error);
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

  const totalLimiteAtivo = cartoes.reduce((sum, c) => sum + (c.con_limite || 0), 0);
  // Simulação de faturas abertas e disponível para uso
  const faturasAbertas = cartoes.length > 0 ? 18250 : 0; // Exemplo
  const disponivelParaUso = totalLimiteAtivo - faturasAbertas;

  if (loading) {
    return (
      <MainLayout title="Cartões de Crédito">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Meus Cartões">
      <div className="mx-auto max-w-[1200px] p-4 lg:p-8 flex flex-col gap-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium">Gerenciamento</p>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-text-main-light dark:text-text-main-dark">Visão Geral de Crédito</h1>
          </div>
          <Button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 w-full sm:w-auto justify-center">
            <Plus className="w-5 h-5" />
            <span>Adicionar Cartão</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <Card className="p-6 rounded-2xl border border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary-new">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-text-secondary-light dark:text-text-secondary-dark font-medium text-sm">Limite Total Ativo</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-text-main-light dark:text-text-main-dark">{formatCurrency(totalLimiteAtivo)}</span>
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded-md w-fit flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> +5% esse mês
              </span>
              <span className="text-gray-400 text-[10px] italic">Considera apenas cartões ativos</span>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
                <ReceiptText className="w-5 h-5" />
              </div>
              <span className="text-text-secondary-light dark:text-text-secondary-dark font-medium text-sm">Faturas Abertas</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-text-main-light dark:text-text-main-dark">{formatCurrency(faturasAbertas)}</span>
            <span className="text-orange-600 text-xs font-bold bg-orange-50 px-2 py-1 rounded-md w-fit">Vencem em 5 dias</span>
          </Card>

          <Card className="p-6 rounded-2xl border border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-green-100 rounded-lg text-green-600">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-text-secondary-light dark:text-text-secondary-dark font-medium text-sm">Disponível para uso</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-text-main-light dark:text-text-main-dark">{formatCurrency(disponivelParaUso)}</span>
            <span className="text-text-secondary-light dark:text-text-secondary-dark text-xs">{(disponivelParaUso / totalLimiteAtivo * 100).toFixed(0)}% do limite livre</span>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">Seus Cartões</h3>
            <Button variant="link" className="text-sm font-semibold text-primary-new hover:text-primary-new/80">Gerenciar ordem</Button>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {cartoes.length === 0 ? (
              <p className="text-gray-500 text-center py-4 col-span-full">Nenhum cartão cadastrado</p>
            ) : (
              cartoes.map((card) => (
                <Card key={card.con_id} className="rounded-2xl p-6 shadow-soft border border-border-light dark:border-[#2d2438] hover:shadow-hover transition-all group flex flex-col justify-between h-full relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <div>
                    <div className="flex items-start justify-between mb-6 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-8 rounded bg-gray-900 flex items-center justify-center shadow-sm text-white font-bold italic text-[10px] tracking-tight">
                          {card.con_nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-text-main-light dark:text-text-main-dark">{card.con_nome}</h4>
                          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium tracking-wider">•••• {card.con_id.slice(-4)}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2.5 py-1 rounded-lg bg-background-light dark:bg-[#2d2438] text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark">Física</span>
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">Fatura aberta</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mb-6">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">Utilizado</span>
                        <span className="text-text-main-light dark:text-text-main-dark">{formatCurrency(card.con_limite ? card.con_limite * 0.45 : 0)}</span> {/* Simulação */}
                      </div>
                      <div className="h-3 w-full bg-background-light dark:bg-[#2d2438] rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${card.con_limite ? (card.con_limite * 0.45 / card.con_limite) * 100 : 0}%` }}></div> {/* Simulação */}
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">Limite Total: {formatCurrency(card.con_limite || 0)}</span>
                        <span className="text-green-600 font-bold">Disponível: {formatCurrency(card.con_limite ? card.con_limite * 0.55 : 0)}</span> {/* Simulação */}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border-light dark:border-[#2d2438] relative z-10">
                    <div className="flex gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-text-secondary-light dark:text-text-secondary-dark">Fechamento</span>
                        <span className="text-sm font-medium text-text-main-light dark:text-text-main-dark">{card.con_data_fechamento ? `${card.con_data_fechamento} do mês` : 'N/A'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-text-secondary-light dark:text-text-secondary-dark">Vencimento</span>
                        <span className="text-sm font-bold text-text-main-light dark:text-text-main-dark">{card.con_data_vencimento ? `${card.con_data_vencimento} do mês` : 'N/A'}</span>
                      </div>
                    </div>
                    <Button variant="ghost" className="flex items-center gap-2 text-sm font-bold text-text-main-light dark:text-text-main-dark bg-background-light dark:bg-[#2d2438] hover:bg-gray-200 dark:hover:bg-[#3a3045] px-4 py-2 rounded-xl transition-colors">
                      Ver Fatura
                      <CreditCard className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        <Card className="rounded-2xl border-2 border-dashed border-border-light dark:border-[#3a3045] bg-background-light/50 dark:bg-[#2d2438]/50 p-8 flex flex-col items-center justify-center text-center gap-3 hover:bg-background-light dark:hover:bg-[#2d2438] transition-colors cursor-pointer group">
          <div className="size-12 rounded-full bg-card-light dark:bg-[#2d2438] group-hover:bg-primary/10 flex items-center justify-center transition-all">
            <CreditCard className="w-6 h-6 text-text-secondary-light dark:text-text-secondary-dark group-hover:text-primary-new transition-colors" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-text-main-light dark:text-text-main-dark group-hover:text-primary-new transition-colors">Solicitar novo cartão</h4>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1 max-w-md">Compare os melhores cartões com cashback, milhas e benefícios exclusivos para seu perfil.</p>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Cartoes;