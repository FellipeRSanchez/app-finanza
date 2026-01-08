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
  AlertCircle,
  Eye,
  EyeOff,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ContaModal from '../components/contas/ContaModal';
import { useNavigate } from 'react-router-dom';

const Patrimonio = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState<any[]>([]);
  const [groupId, setGroupId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<any>(null);
  const [hideValues, setHideValues] = useState(false);

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

      const { data: accounts, error: accountsError } = await supabase
        .from('contas')
        .select('*')
        .eq('con_grupo', userData.usu_grupo);

      if (accountsError) throw accountsError;

      const { data: lancamentos, error: lancamentosError } = await supabase
        .from('lancamentos')
        .select('lan_valor, lan_conta')
        .eq('lan_grupo', userData.usu_grupo)
        .eq('lan_conciliado', true); // Considerar apenas lançamentos conciliados para o saldo real

      if (lancamentosError) throw lancamentosError;

      const processedContas = (accounts || []).map(acc => {
        const transacoesConta = lancamentos?.filter(t => t.lan_conta === acc.con_id) || [];
        const somaTransacoes = transacoesConta.reduce((sum, t) => sum + Number(t.lan_valor), 0);
        
        let saldoAtual = 0;
        if (acc.con_tipo === 'cartao') {
          // Para cartões, o saldo atual é a soma dos lançamentos (dívida)
          saldoAtual = somaTransacoes;
        } else {
          // Para outras contas, é o limite/saldo inicial + soma dos lançamentos
          saldoAtual = Number(acc.con_limite || 0) + somaTransacoes;
        }
        
        return {
          ...acc,
          saldoAtual: saldoAtual
        };
      });

      setContas(processedContas);
    } catch (error) {
      console.error("Erro ao buscar contas:", error);
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
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const totalSaldoContas = contas
    .filter(acc => acc.con_tipo !== 'cartao')
    .reduce((sum, acc) => sum + acc.saldoAtual, 0);

  const dividaCartoes = contas
    .filter(acc => acc.con_tipo === 'cartao')
    .reduce((sum, acc) => sum + acc.saldoAtual, 0); // Saldo de cartão já é negativo para dívida

  const handleViewLancamentos = (accountId: string) => {
    navigate(`/lancamentos?account=${accountId}`);
  };

  return (
    <MainLayout title="Minhas Contas">
      <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-10">
        
        {/* Header com botão de ocultar valores */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-[#141118] dark:text-white tracking-tight">Minhas Contas</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setHideValues(!hideValues)}
            className="size-11 rounded-xl bg-background-light dark:bg-[#2c2435] text-text-main-light dark:text-white hover:bg-gray-200 dark:hover:bg-[#3a3045] transition-colors"
            title={hideValues ? "Mostrar valores" : "Ocultar valores"}
          >
            {hideValues ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Saldo Total */}
          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 overflow-hidden group">
            <p className="text-[#756189] text-[10px] font-black uppercase tracking-widest">Saldo Total</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{formatCurrency(totalSaldoContas)}</p>
              <ArrowUpRight className="text-emerald-500/30 group-hover:text-emerald-500 transition-colors" size={32} />
            </div>
          </Card>
          
          {/* Disponível em Contas (mesmo valor do Saldo Total, com destaque) */}
          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 overflow-hidden group">
            <p className="text-[#756189] text-[10px] font-black uppercase tracking-widest">Disponível em Contas</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-black text-[#141118] dark:text-white tracking-tight">{formatCurrency(totalSaldoContas)}</p>
              <Droplet className="text-blue-500/30 group-hover:text-blue-500 transition-colors" size={32} />
            </div>
          </Card>

          {/* Dívida em Cartões */}
          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 overflow-hidden group">
            <p className="text-[#756189] text-[10px] font-black uppercase tracking-widest">Dívida em Cartões</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{formatCurrency(dividaCartoes)}</p>
              <ArrowDownRight className="text-rose-500/30 group-hover:text-rose-500 transition-colors" size={32} />
            </div>
          </Card>
        </div>

        {/* Accounts Grid */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-[#141118] dark:text-white">Detalhes das Contas</h3>
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
                const isNegative = conta.saldoAtual < 0;
                return (
                  <Card 
                    key={conta.con_id}
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
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleViewLancamentos(conta.con_id); }}>
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingConta(conta); setModalOpen(true); }}>
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#756189] mb-1">Saldo Atual</p>
                      <p className={cn(
                        "text-2xl font-black tracking-tight",
                        isNegative ? "text-rose-600" : "text-emerald-600"
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