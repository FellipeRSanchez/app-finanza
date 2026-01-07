"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { 
  Landmark, 
  CreditCard, 
  Wallet as WalletIcon, 
  TrendingUp, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingDown,
  Droplet,
  Settings,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ContaModal from '../components/contas/ContaModal';

const Patrimonio = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState<any[]>([]);
  const [groupId, setGroupId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchContas();
    }
  }, [user]);

  const fetchContas = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;
      setGroupId(userData.usu_grupo);

      // 1. Buscar todas as contas
      const { data: accounts } = await supabase
        .from('contas')
        .select('*')
        .eq('con_grupo', userData.usu_grupo);

      // 2. Buscar soma de lançamentos confirmados por conta
      const { data: transactions } = await supabase
        .from('lancamentos')
        .select('lan_valor, lan_conta')
        .eq('lan_grupo', userData.usu_grupo)
        .eq('lan_conciliado', true);

      // 3. Calcular saldos dinâmicos
      const processedContas = (accounts || []).map(acc => {
        const transacoesConta = transactions?.filter(t => t.lan_conta === acc.con_id) || [];
        const somaTransacoes = transacoesConta.reduce((sum, t) => sum + Number(t.lan_valor), 0);
        return {
          ...acc,
          saldoAtual: Number(acc.con_limite || 0) + somaTransacoes
        };
      });

      setContas(processedContas);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'banco': return Landmark;
      case 'cartao': return CreditCard;
      case 'dinheiro': return WalletIcon;
      case 'investimento': return TrendingUp;
      default: return Landmark;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const totalPatrimonio = contas.reduce((sum, acc) => sum + acc.saldoAtual, 0);
  const ativosTotais = contas.filter(acc => acc.saldoAtual > 0).reduce((sum, acc) => sum + acc.saldoAtual, 0);
  const passivosTotais = contas.filter(acc => acc.saldoAtual < 0).reduce((sum, acc) => sum + Math.abs(acc.saldoAtual), 0);

  return (
    <MainLayout title="Minhas Contas">
      <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-10">
        
        {/* Hero Section: Patrimônio Líquido */}
        <Card className="bg-white dark:bg-[#1e1629] rounded-3xl p-8 shadow-soft border-border-light dark:border-[#2d2438] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="flex flex-col gap-2 relative z-10">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <TrendingUp size={18} />
              </div>
              <p className="text-[#756189] text-[10px] font-black uppercase tracking-[0.15em]">Patrimônio Líquido Total</p>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-[#141118] dark:text-white tracking-tight">
              {formatCurrency(totalPatrimonio)}
            </h1>
          </div>
          <Button 
            onClick={() => { setEditingConta(null); setModalOpen(true); }}
            className="relative z-10 bg-primary hover:bg-primary/90 text-white rounded-2xl h-14 px-8 font-bold shadow-lg shadow-primary/25 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" /> Adicionar Conta
          </Button>
        </Card>

        {/* Summary Mini Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 overflow-hidden group">
            <p className="text-[#756189] text-[10px] font-black uppercase tracking-widest">Ativos</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{formatCurrency(ativosTotais)}</p>
              <ArrowUpRight className="text-emerald-500/30 group-hover:text-emerald-500 transition-colors" size={32} />
            </div>
          </Card>
          
          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 overflow-hidden group">
            <p className="text-[#756189] text-[10px] font-black uppercase tracking-widest">Passivos (Dívidas)</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{formatCurrency(passivosTotais)}</p>
              <ArrowDownRight className="text-rose-500/30 group-hover:text-rose-500 transition-colors" size={32} />
            </div>
          </Card>

          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 overflow-hidden group">
            <p className="text-[#756189] text-[10px] font-black uppercase tracking-widest">Liquidez Imediata</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-black text-[#141118] dark:text-white tracking-tight">{formatCurrency(contas.filter(c => c.con_tipo !== 'investimento').reduce((sum, c) => sum + c.saldoAtual, 0))}</p>
              <Droplet className="text-blue-500/30 group-hover:text-blue-500 transition-colors" size={32} />
            </div>
          </Card>
        </div>

        {/* Accounts Grid */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-[#141118] dark:text-white">Suas Contas</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-32 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))
            ) : contas.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-background-light/50 rounded-3xl border-2 border-dashed border-border-light">
                <AlertCircle className="mx-auto text-text-secondary-light mb-4" size={48} />
                <p className="text-sm font-bold text-[#756189] uppercase tracking-widest">Nenhuma conta cadastrada.</p>
              </div>
            ) : (
              contas.map((conta) => {
                const Icon = getAccountIcon(conta.con_tipo);
                return (
                  <Card 
                    key={conta.con_id}
                    onClick={() => { setEditingConta(conta); setModalOpen(true); }}
                    className="group bg-white dark:bg-[#1e1629] rounded-3xl p-6 shadow-soft border-border-light dark:border-[#2d2438] hover:shadow-hover hover:border-primary/20 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-background-light dark:bg-[#2c2435] flex items-center justify-center text-[#756189] group-hover:text-primary transition-colors">
                          <Icon size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-[#141118] dark:text-white group-hover:text-primary transition-colors">{conta.con_nome}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#756189]">{conta.con_tipo}</p>
                        </div>
                      </div>
                      <Settings size={16} className="text-gray-300 group-hover:text-primary transition-colors" />
                    </div>
                    
                    <div className="mt-6">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#756189] mb-1">Saldo Atual</p>
                      <p className={cn(
                        "text-2xl font-black tracking-tight",
                        conta.saldoAtual > 0 ? "text-emerald-600" : conta.saldoAtual < 0 ? "text-rose-600" : "text-gray-400"
                      )}>
                        {formatCurrency(conta.saldoAtual)}
                      </p>
                    </div>
                  </Card>
                );
              })
            )}
            
            <button 
              onClick={() => { setEditingConta(null); setModalOpen(true); }}
              className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border-light dark:border-[#2d2438] rounded-3xl hover:bg-background-light dark:hover:bg-[#1e1629] hover:border-primary/40 transition-all group"
            >
              <div className="size-12 rounded-full bg-background-light dark:bg-[#2c2435] flex items-center justify-center text-[#756189] group-hover:text-primary transition-colors">
                <Plus size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#756189]">Adicionar nova conta</span>
            </button>
          </div>
        </div>
      </div>

      <ContaModal 
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={fetchContas}
        conta={editingConta}
        grupoId={groupId}
      />
    </MainLayout>
  );
};

export default Patrimonio;