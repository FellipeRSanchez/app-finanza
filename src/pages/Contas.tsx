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
  FileText,
  Home,
  Car,
  Factory,
  PiggyBank,
  DollarSign,
  Banknote,
  Scale,
  CalendarDays,
  CalendarOff,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ContaModal from '../components/contas/ContaModal';
import AtivoPatrimonialModal from '@/components/patrimonio/AtivoPatrimonialModal';
import PecuariaModal from '@/components/patrimonio/PecuariaModal';
import EmprestimoModal from '@/components/patrimonio/EmprestimoModal';
import AddInvestmentForm from '@/components/investments/AddInvestmentForm';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Contas = ({ hideValues }: { hideValues: boolean }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState<any[]>([]);
  const [investimentos, setInvestimentos] = useState<any[]>([]);
  const [ativosPatrimoniais, setAtivosPatrimoniais] = useState<any[]>([]);
  const [pecuaria, setPecuaria] = useState<any[]>([]);
  const [emprestimos, setEmprestimos] = useState<any[]>([]);
  const [groupId, setGroupId] = useState('');

  // Modals states
  const [contaModalOpen, setContaModalOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<any>(null);

  const [ativoPatrimonialModalOpen, setAtivoPatrimonialModalOpen] = useState(false);
  const [editingAtivoPatrimonial, setEditingAtivoPatrimonial] = useState<any>(null);

  const [pecuariaModalOpen, setPecuariaModalOpen] = useState(false);
  const [editingPecuaria, setEditingPecuaria] = useState<any>(null);

  const [emprestimoModalOpen, setEmprestimoModalOpen] = useState(false);
  const [editingEmprestimo, setEditingEmprestimo] = useState<any>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; table: string; name: string } | null>(null);


  useEffect(() => {
    if (user) {
      fetchContasData();
    }
  }, [user]);

  const fetchContasData = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) {
        setLoading(false);
        return;
      }
      setGroupId(userData.usu_grupo);

      // Fetch Contas
      const { data: accounts, error: accountsError } = await supabase
        .from('contas')
        .select('*')
        .eq('con_grupo', userData.usu_grupo);
      if (accountsError) throw accountsError;

      // Fetch latest accumulated balances from vw_saldo_diario_conta
      const { data: dailyBalances, error: dbError } = await supabase
        .from('vw_saldo_diario_conta')
        .select('lan_conta, saldo_acumulado')
        .eq('group_id', userData.usu_grupo)
        .order('data', { ascending: false }); // Order by date descending to get the latest for each account

      if (dbError) throw dbError;

      const latestBalancesMap = new Map<string, number>();
      // Process dailyBalances to get the latest for each account
      dailyBalances?.forEach(balance => {
        if (!latestBalancesMap.has(balance.lan_conta)) { // Only add the first (latest) entry for each account
          latestBalancesMap.set(balance.lan_conta, Number(balance.saldo_acumulado));
        }
      });

      const processedContas = (accounts || []).map(acc => {
        let saldoAtual = Number(acc.con_limite || 0); // Start with initial limit/balance

        if (latestBalancesMap.has(acc.con_id)) {
          saldoAtual = latestBalancesMap.get(acc.con_id)!;
        }
        
        return { ...acc, saldoAtual: saldoAtual };
      });
      setContas(processedContas);

      // Fetch Investimentos
      const { data: investments, error: investmentsError } = await supabase
        .from('investimentos')
        .select('*')
        .eq('user_id', user.id);
      if (investmentsError) throw investmentsError;
      setInvestimentos(investments || []);

      // Fetch Ativos Patrimoniais
      const { data: patrimonialAssets, error: patrimonialAssetsError } = await supabase
        .from('ativos_patrimoniais')
        .select('*')
        .eq('user_id', user.id);
      if (patrimonialAssetsError) throw patrimonialAssetsError;
      setAtivosPatrimoniais(patrimonialAssets || []);

      // Fetch Pecuaria
      const { data: livestock, error: livestockError } = await supabase
        .from('pecuaria')
        .select('*')
        .eq('user_id', user.id);
      if (livestockError) throw livestockError;
      setPecuaria(livestock || []);

      // Fetch Emprestimos
      const { data: loans, error: loansError } = await supabase
        .from('emprestimos')
        .select('*')
        .eq('user_id', user.id);
      if (loansError) throw loansError;
      setEmprestimos(loans || []);

    } catch (error) {
      console.error("Erro ao buscar dados das contas:", error);
      showError("Erro ao carregar dados das contas.");
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
      case 'consorcio': return Scale;
      default: return Landmark;
    }
  };

  const getPatrimonialAssetIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'imovel': return Home;
      case 'veiculo': return Car;
      case 'maquina': return Factory;
      default: return Scale;
    }
  };

  const getPecuariaIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bovino': return PiggyBank;
      case 'suino': return PiggyBank;
      case 'ovino': return PiggyBank;
      default: return PiggyBank;
    }
  };

  const formatCurrency = (value: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Cálculos para os Cards de Resumo
  const saldoDisponivel = contas
    .filter(acc => acc.con_tipo === 'banco' || acc.con_tipo === 'dinheiro' || acc.con_tipo === 'consorcio')
    .reduce((sum, acc) => sum + acc.saldoAtual, 0);

  const totalInvestimentos = investimentos.reduce((sum, inv) => sum + Number(inv.inv_current_value || 0), 0);
  const totalAtivosPatrimoniais = ativosPatrimoniais.reduce((sum, apa) => sum + Number(apa.apa_valor_estimado || 0), 0);
  const totalPecuaria = pecuaria.reduce((sum, pec) => sum + Number(pec.pec_valor_total || 0), 0);
  const totalOutrasContasInvestimento = contas
    .filter(acc => acc.con_tipo === 'investimento')
    .reduce((sum, acc) => sum + acc.saldoAtual, 0);

  const totalAtivos = saldoDisponivel + totalInvestimentos + totalAtivosPatrimoniais + totalPecuaria + totalOutrasContasInvestimento;

  const dividaCartoes = contas
    .filter(acc => acc.con_tipo === 'cartao')
    .reduce((sum, acc) => sum + acc.saldoAtual, 0); // Saldo de cartão já é negativo para dívida
  const totalEmprestimos = emprestimos.reduce((sum, emp) => sum + Number(emp.emp_saldo_devedor || 0), 0);
  const totalPassivos = dividaCartoes + totalEmprestimos;

  const handleViewLancamentos = (accountId: string) => {
    navigate(`/lancamentos?account=${accountId}`);
  };

  const handleOpenDeleteConfirm = (id: string, table: string, name: string) => {
    setDeleteTarget({ id, table, name });
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from(deleteTarget.table)
        .delete()
        .eq(deleteTarget.table.slice(0, 3) + '_id', deleteTarget.id); // Dynamic ID column name

      if (error) throw error;
      showSuccess(`${deleteTarget.name} excluído com sucesso!`);
      fetchContasData(); // Refresh data
    } catch (error) {
      console.error("Erro ao excluir item:", error);
      showError(`Erro ao excluir ${deleteTarget.name}.`);
    } finally {
      setDeleteConfirmOpen(false);
      setLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-10">
        
        {/* Header com botão de ocultar valores */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-[#141118] dark:text-white tracking-tight">Minhas Contas</h1>
          {/* The Eye/EyeOff button is now in Topbar, so it's removed from here */}
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Saldo Disponível */}
          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 overflow-hidden group">
            <p className="text-[#756189] text-[10px] font-black uppercase tracking-widest">Saldo Disponível</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{formatCurrency(saldoDisponivel)}</p>
              <ArrowUpRight className="text-emerald-500/30 group-hover:text-emerald-500 transition-colors" size={32} />
            </div>
          </Card>
          
          {/* Ativos */}
          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 overflow-hidden group">
            <p className="text-[#756189] text-[10px] font-black uppercase tracking-widest">Ativos</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-black text-[#141118] dark:text-white tracking-tight">{formatCurrency(totalAtivos)}</p>
              <Droplet className="text-blue-500/30 group-hover:text-blue-500 transition-colors" size={32} />
            </div>
          </Card>

          {/* Passivos */}
          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border-border-light dark:border-[#2d2438] shadow-soft flex flex-col gap-1 overflow-hidden group">
            <p className="text-[#756189] text-[10px] font-black uppercase tracking-widest">Passivos</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{formatCurrency(totalPassivos)}</p>
              <ArrowDownRight className="text-rose-500/30 group-hover:text-rose-500 transition-colors" size={32} />
            </div>
          </Card>
        </div>

        {/* Seção: Contas Financeiras */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-[#141118] dark:text-white">Contas Financeiras</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setEditingConta(null); setContaModalOpen(true); }}
              className="size-10 rounded-xl bg-background-light dark:bg-[#2c2435] text-text-main-light dark:text-white hover:bg-gray-200 dark:hover:bg-[#3a3045] transition-colors"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={`loading-conta-${i}`} className="h-32 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))
            ) : contas.filter(acc => acc.con_tipo === 'banco' || acc.con_tipo === 'dinheiro' || acc.con_tipo === 'consorcio').length === 0 ? (
              <div className="col-span-full py-10 text-center bg-background-light/50 rounded-3xl border-2 border-dashed border-border-light dark:border-[#2d2438]">
                <AlertCircle className="mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-4" size={48} />
                <p className="text-sm font-bold text-[#756189] uppercase tracking-widest">Nenhuma conta financeira cadastrada.</p>
              </div>
            ) : (
              contas.filter(acc => acc.con_tipo === 'banco' || acc.con_tipo === 'dinheiro' || acc.con_tipo === 'consorcio').map((conta) => {
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingConta(conta); setContaModalOpen(true); }}>
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); handleOpenDeleteConfirm(conta.con_id, 'contas', conta.con_nome); }}>
                          <Trash2 className="w-4 h-4" />
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
          </div>
        </div>

        {/* Seção: Investimentos */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-[#141118] dark:text-white">Investimentos</h3>
            <AddInvestmentForm onInvestmentAdded={fetchContasData} hideValues={hideValues} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={`loading-invest-${i}`} className="h-32 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))
            ) : (
              <>
                {contas.filter(acc => acc.con_tipo === 'investimento').map((conta) => {
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
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#756189]">Conta de Investimento</p>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleViewLancamentos(conta.con_id); }}>
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingConta(conta); setContaModalOpen(true); }}>
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); handleOpenDeleteConfirm(conta.con_id, 'contas', conta.con_nome); }}>
                            <Trash2 className="w-4 h-4" />
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
                })}
                {investimentos.length === 0 && contas.filter(acc => acc.con_tipo === 'investimento').length === 0 ? (
                  <div className="col-span-full py-10 text-center bg-background-light/50 rounded-3xl border-2 border-dashed border-border-light dark:border-[#2d2438]">
                    <AlertCircle className="mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-4" size={48} />
                    <p className="text-sm font-bold text-[#756189] uppercase tracking-widest">Nenhum investimento cadastrado.</p>
                  </div>
                ) : (
                  investimentos.map((inv) => {
                    const isNegative = Number(inv.inv_current_value || 0) < 0;
                    return (
                      <Card 
                        key={inv.inv_id}
                        className="group bg-white dark:bg-[#1e1629] rounded-3xl p-6 shadow-soft border-border-light dark:border-[#2d2438] hover:shadow-hover hover:border-primary/20 transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-background-light dark:bg-[#2c2435] flex items-center justify-center text-[#756189] group-hover:text-primary transition-colors">
                              <TrendingUp size={24} />
                            </div>
                            <div>
                              <h4 className="font-bold text-[#141118] dark:text-white group-hover:text-primary transition-colors">{inv.inv_name}</h4>
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#756189]">{inv.inv_type}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/investimentos?id=${inv.inv_id}`); }}>
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); /* setEditingInvestment(inv); setInvestmentModalOpen(true); */ }}>
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); handleOpenDeleteConfirm(inv.inv_id, 'investimentos', inv.inv_name); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-6">
                          <p className="text-[9px] font-black uppercase tracking-widest text-[#756189] mb-1">Saldo Atual</p>
                          <p className={cn(
                            "text-2xl font-black tracking-tight",
                            isNegative ? "text-rose-600" : "text-emerald-600"
                          )}>
                            {formatCurrency(Number(inv.inv_current_value || 0))}
                          </p>
                        </div>
                      </Card>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>

        {/* Seção: Ativos Patrimoniais */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-[#141118] dark:text-white">Ativos Patrimoniais</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setEditingAtivoPatrimonial(null); setAtivoPatrimonialModalOpen(true); }}
              className="size-10 rounded-xl bg-background-light dark:bg-[#2c2435] text-text-main-light dark:text-white hover:bg-gray-200 dark:hover:bg-[#3a3045] transition-colors"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={`loading-ativo-${i}`} className="h-32 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))
            ) : ativosPatrimoniais.length === 0 ? (
              <div className="col-span-full py-10 text-center bg-background-light/50 rounded-3xl border-2 border-dashed border-border-light dark:border-[#2d2438]">
                <AlertCircle className="mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-4" size={48} />
                <p className="text-sm font-bold text-[#756189] uppercase tracking-widest">Nenhum ativo patrimonial cadastrado.</p>
              </div>
            ) : (
              ativosPatrimoniais.map((ativo) => {
                const Icon = getPatrimonialAssetIcon(ativo.apa_tipo);
                return (
                  <Card 
                    key={ativo.apa_id}
                    className="group bg-white dark:bg-[#1e1629] rounded-3xl p-6 shadow-soft border-border-light dark:border-[#2d2438] hover:shadow-hover hover:border-primary/20 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-background-light dark:bg-[#2c2435] flex items-center justify-center text-[#756189] group-hover:text-primary transition-colors">
                          <Icon size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-[#141118] dark:text-white group-hover:text-primary transition-colors">{ativo.apa_nome}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#756189]">{ativo.apa_tipo}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingAtivoPatrimonial(ativo); setAtivoPatrimonialModalOpen(true); }}>
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); handleOpenDeleteConfirm(ativo.apa_id, 'ativos_patrimoniais', ativo.apa_nome); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#756189] mb-1">Valor Estimado</p>
                      <p className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(Number(ativo.apa_valor_estimado || 0))}
                      </p>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Seção: Pecuária */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-[#141118] dark:text-white">Pecuária</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setEditingPecuaria(null); setPecuariaModalOpen(true); }}
              className="size-10 rounded-xl bg-background-light dark:bg-[#2c2435] text-text-main-light dark:text-white hover:bg-gray-200 dark:hover:bg-[#3a3045] transition-colors"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={`loading-pecuaria-${i}`} className="h-32 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))
            ) : pecuaria.length === 0 ? (
              <div className="col-span-full py-10 text-center bg-background-light/50 rounded-3xl border-2 border-dashed border-border-light dark:border-[#2d2438]">
                <AlertCircle className="mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-4" size={48} />
                <p className="text-sm font-bold text-[#756189] uppercase tracking-widest">Nenhum registro de pecuária cadastrado.</p>
              </div>
            ) : (
              pecuaria.map((item) => {
                const Icon = getPecuariaIcon(item.pec_tipo);
                return (
                  <Card 
                    key={item.pec_id}
                    className="group bg-white dark:bg-[#1e1629] rounded-3xl p-6 shadow-soft border-border-light dark:border-[#2d2438] hover:shadow-hover hover:border-primary/20 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-background-light dark:bg-[#2c2435] flex items-center justify-center text-[#756189] group-hover:text-primary transition-colors">
                          <Icon size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-[#141118] dark:text-white group-hover:text-primary transition-colors">{item.pec_nome}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#756189]">{item.pec_tipo} ({item.pec_quantidade} unid.)</p>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingPecuaria(item); setPecuariaModalOpen(true); }}>
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); handleOpenDeleteConfirm(item.pec_id, 'pecuaria', item.pec_nome); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#756189] mb-1">Valor Total</p>
                      <p className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(Number(item.pec_valor_total || 0))}
                      </p>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Seção: Cartões de Crédito (Passivos) */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-[#141118] dark:text-white">Cartões de Crédito</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/cartoes')}
              className="size-10 rounded-xl bg-background-light dark:bg-[#2c2435] text-text-main-light dark:text-white hover:bg-gray-200 dark:hover:bg-[#3a3045] transition-colors"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={`loading-cartao-${i}`} className="h-32 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))
            ) : contas.filter(acc => acc.con_tipo === 'cartao').length === 0 ? (
              <div className="col-span-full py-10 text-center bg-background-light/50 rounded-3xl border-2 border-dashed border-border-light dark:border-[#2d2438]">
                <AlertCircle className="mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-4" size={48} />
                <p className="text-sm font-bold text-[#756189] uppercase tracking-widest">Nenhum cartão de crédito cadastrado.</p>
              </div>
            ) : (
              contas.filter(acc => acc.con_tipo === 'cartao').map((cartao) => {
                const isNegative = cartao.saldoAtual < 0;
                return (
                  <Card 
                    key={cartao.con_id}
                    className="group bg-white dark:bg-[#1e1629] rounded-3xl p-6 shadow-soft border-border-light dark:border-[#2d2438] hover:shadow-hover hover:border-primary/20 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-background-light dark:bg-[#2c2435] flex items-center justify-center text-[#756189] group-hover:text-primary transition-colors">
                          <CreditCard size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-[#141118] dark:text-white group-hover:text-primary transition-colors">{cartao.con_nome}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#756189]">Limite: {formatCurrency(Number(cartao.con_limite || 0))}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/cartoes?id=${cartao.con_id}`); }}>
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingConta(cartao); setContaModalOpen(true); }}>
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); handleOpenDeleteConfirm(cartao.con_id, 'contas', cartao.con_nome); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#756189] mb-1">Fatura Atual</p>
                      <p className={cn(
                        "text-2xl font-black tracking-tight",
                        isNegative ? "text-rose-600" : "text-emerald-600"
                      )}>
                        {formatCurrency(cartao.saldoAtual)}
                      </p>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Seção: Empréstimos (Passivos) */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-[#141118] dark:text-white">Empréstimos</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setEditingEmprestimo(null); setEmprestimoModalOpen(true); }}
              className="size-10 rounded-xl bg-background-light dark:bg-[#2c2435] text-text-main-light dark:text-white hover:bg-gray-200 dark:hover:bg-[#3a3045] transition-colors"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={`loading-emprestimo-${i}`} className="h-32 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))
            ) : emprestimos.length === 0 ? (
              <div className="col-span-full py-10 text-center bg-background-light/50 rounded-3xl border-2 border-dashed border-border-light dark:border-[#2d2438]">
                <AlertCircle className="mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-4" size={48} />
                <p className="text-sm font-bold text-[#756189] uppercase tracking-widest">Nenhum empréstimo cadastrado.</p>
              </div>
            ) : (
              emprestimos.map((emp) => {
                const isNegative = Number(emp.emp_saldo_devedor || 0) > 0; // Empréstimo é sempre um passivo
                return (
                  <Card 
                    key={emp.emp_id}
                    className="group bg-white dark:bg-[#1e1629] rounded-3xl p-6 shadow-soft border-border-light dark:border-[#2d2438] hover:shadow-hover hover:border-primary/20 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-background-light dark:bg-[#2c2435] flex items-center justify-center text-[#756189] group-hover:text-primary transition-colors">
                          <DollarSign size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-[#141118] dark:text-white group-hover:text-primary transition-colors">{emp.emp_nome}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#756189]">{emp.emp_instituicao || 'Empréstimo'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); /* Ver parcelas */ }}>
                          <CalendarDays className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingEmprestimo(emp); setEmprestimoModalOpen(true); }}>
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); handleOpenDeleteConfirm(emp.emp_id, 'emprestimos', emp.emp_nome); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#756189] mb-1">Saldo Devedor</p>
                      <p className={cn(
                        "text-2xl font-black tracking-tight",
                        isNegative ? "text-rose-600" : "text-emerald-600"
                      )}>
                        {formatCurrency(Number(emp.emp_saldo_devedor || 0))}
                      </p>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ContaModal 
        open={contaModalOpen}
        onOpenChange={setContaModalOpen}
        onSuccess={fetchContasData}
        conta={editingConta}
        grupoId={groupId}
        hideValues={hideValues}
      />
      <AtivoPatrimonialModal
        open={ativoPatrimonialModalOpen}
        onOpenChange={setAtivoPatrimonialModalOpen}
        onSuccess={fetchContasData}
        ativo={editingAtivoPatrimonial}
        hideValues={hideValues}
      />
      <PecuariaModal
        open={pecuariaModalOpen}
        onOpenChange={setPecuariaModalOpen}
        onSuccess={fetchContasData}
        pecuariaItem={editingPecuaria}
        hideValues={hideValues}
      />
      <EmprestimoModal
        open={emprestimoModalOpen}
        onOpenChange={setEmprestimoModalOpen}
        onSuccess={fetchContasData}
        emprestimo={editingEmprestimo}
        hideValues={hideValues}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-white rounded-3xl border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-[#141118]">Excluir {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente "{deleteTarget?.name}" do seu patrimônio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 text-white rounded-xl">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Contas;