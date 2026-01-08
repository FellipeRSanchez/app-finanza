"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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

// Import new modular sections
import PatrimonioSummaryCards from '@/components/patrimonio/PatrimonioSummaryCards';
import FinancialAccountsSection from '@/components/patrimonio/FinancialAccountsSection';
import InvestmentsSection from '@/components/patrimonio/InvestmentsSection';
import PatrimonialAssetsSection from '@/components/patrimonio/PatrimonialAssetsSection';
import PecuariaSection from '@/components/patrimonio/PecuariaSection';
import CreditCardsSection from '@/components/patrimonio/CreditCardsSection';
import EmprestimosSection from '@/components/patrimonio/EmprestimosSection';

// Import Modals (still managed by parent for now)
import ContaModal from '../components/contas/ContaModal';
import AtivoPatrimonialModal from '@/components/patrimonio/AtivoPatrimonialModal';
import PecuariaModal from '@/components/patrimonio/PecuariaModal';
import EmprestimoModal from '@/components/patrimonio/EmprestimoModal';

import { showSuccess, showError } from '@/utils/toast';

const Patrimonio = ({ hideValues }: { hideValues: boolean }) => {
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
      fetchPatrimonioData();
    }
  }, [user]);

  const fetchPatrimonioData = async () => {
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

      // Fetch Lancamentos for account balances
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
          saldoAtual = somaTransacoes; // Será negativo
        } else {
          // Para outras contas, é o limite/saldo inicial + soma dos lançamentos
          saldoAtual = Number(acc.con_limite || 0) + somaTransacoes;
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
      console.error("Erro ao buscar dados do patrimônio:", error);
      showError("Erro ao carregar dados do patrimônio.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Cálculos para os Cards de Resumo
  const saldoDisponivel = contas
    .filter(acc => acc.con_tipo === 'banco' || acc.con_tipo === 'dinheiro')
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
      fetchPatrimonioData(); // Refresh data
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
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-[#141118] dark:text-white tracking-tight">Patrimônio</h1>
        </div>

        {/* Summary Cards */}
        <PatrimonioSummaryCards
          saldoDisponivel={saldoDisponivel}
          totalAtivos={totalAtivos}
          totalPassivos={totalPassivos}
          formatCurrency={formatCurrency}
        />

        {/* Financial Accounts Section */}
        <FinancialAccountsSection
          loading={loading}
          contas={contas}
          formatCurrency={formatCurrency}
          setEditingConta={setEditingConta}
          setContaModalOpen={setContaModalOpen}
          handleViewLancamentos={handleViewLancamentos}
          handleOpenDeleteConfirm={handleOpenDeleteConfirm}
        />

        {/* Investments Section */}
        <InvestmentsSection
          loading={loading}
          investimentos={investimentos}
          contas={contas}
          formatCurrency={formatCurrency}
          fetchPatrimonioData={fetchPatrimonioData}
          handleOpenDeleteConfirm={handleOpenDeleteConfirm}
          setEditingConta={setEditingConta}
          setContaModalOpen={setContaModalOpen}
        />

        {/* Patrimonial Assets Section */}
        <PatrimonialAssetsSection
          loading={loading}
          ativosPatrimoniais={ativosPatrimoniais}
          formatCurrency={formatCurrency}
          setEditingAtivoPatrimonial={setEditingAtivoPatrimonial}
          setAtivoPatrimonialModalOpen={setAtivoPatrimonialModalOpen}
          handleOpenDeleteConfirm={handleOpenDeleteConfirm}
          ativoPatrimonialModalOpen={ativoPatrimonialModalOpen}
          editingAtivoPatrimonial={editingAtivoPatrimonial}
          fetchPatrimonioData={fetchPatrimonioData}
        />

        {/* Pecuaria Section */}
        <PecuariaSection
          loading={loading}
          pecuaria={pecuaria}
          formatCurrency={formatCurrency}
          setEditingPecuaria={setEditingPecuaria}
          setPecuariaModalOpen={setPecuariaModalOpen}
          handleOpenDeleteConfirm={handleOpenDeleteConfirm}
          pecuariaModalOpen={pecuariaModalOpen}
          editingPecuaria={editingPecuaria}
          fetchPatrimonioData={fetchPatrimonioData}
        />

        {/* Credit Cards Section */}
        <CreditCardsSection
          loading={loading}
          contas={contas}
          formatCurrency={formatCurrency}
          handleOpenDeleteConfirm={handleOpenDeleteConfirm}
          setEditingConta={setEditingConta}
          setContaModalOpen={setContaModalOpen}
          contaModalOpen={contaModalOpen}
          editingConta={editingConta}
          fetchPatrimonioData={fetchPatrimonioData}
          groupId={groupId}
        />

        {/* Emprestimos Section */}
        <EmprestimosSection
          loading={loading}
          emprestimos={emprestimos}
          formatCurrency={formatCurrency}
          setEditingEmprestimo={setEditingEmprestimo}
          setEmprestimoModalOpen={setEmprestimoModalOpen}
          handleOpenDeleteConfirm={handleOpenDeleteConfirm}
          emprestimoModalOpen={emprestimoModalOpen}
          editingEmprestimo={editingEmprestimo}
          fetchPatrimonioData={fetchPatrimonioData}
        />
      </div>

      {/* Modals (still managed by parent for now) */}
      <ContaModal 
        open={contaModalOpen}
        onOpenChange={setContaModalOpen}
        onSuccess={fetchPatrimonioData}
        conta={editingConta}
        grupoId={groupId}
        hideValues={hideValues}
      />
      {/* AtivoPatrimonialModal, PecuariaModal, EmprestimoModal are now managed within their sections */}

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

export default Patrimonio;