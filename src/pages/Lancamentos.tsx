"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
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
import { format, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import CommonLancamentoModal from '../components/lancamentos/CommonLancamentoModal';
import TransferenciaModal from '../components/lancamentos/TransferenciaModal';
import PagamentoFaturaModal from '../components/lancamentos/PagamentoFaturaModal';
import { showSuccess, showError } from '@/utils/toast';

// Import new modular components
import LancamentosHeader from '@/components/lancamentos/LancamentosHeader';
import LancamentosFilters from '@/components/lancamentos/LancamentosFilters';
import LancamentosFilterBar from '@/components/lancamentos/LancamentosFilterBar';
import LancamentosTable from '@/components/lancamentos/LancamentosTable';

const Lancamentos = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [creditCardAccounts, setCreditCardAccounts] = useState<any[]>([]);
  const [groupId, setGroupId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [systemCategories, setSystemCategories] = useState({
    transferenciaId: null as string | null,
    pagamentoFaturaId: null as string | null,
  });

  // States for Modals
  const [commonLancamentoModalOpen, setCommonLancamentoModalOpen] = useState(false);
  const [transferenciaModalOpen, setTransferenciaModalOpen] = useState(false);
  const [pagamentoFaturaModalOpen, setPagamentoFaturaModalOpen] = useState(false);

  const [editingLancamento, setEditingLancamento] = useState<any>(null);
  const [editingTransferencia, setEditingTransferencia] = useState<any>(null);
  const [editingPagamentoFatura, setEditingPagamentoFatura] = useState<any>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'lancamento' | 'transferencia' | 'pagamento' } | null>(null);

  // Filter Values
  const [filterType, setFilterType] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('thisMonth');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  // Helper to get YYYY-MM-DD string from a Date object, ensuring local start of day
  const getLocalYMD = (date: Date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return format(d, 'yyyy-MM-dd');
  };

  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  useEffect(() => {
    if (groupId) {
      fetchAllOperations(groupId);
    }
  }, [groupId, filterType, filterAccount, filterCategory, filterPeriod, customRange]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;
      setGroupId(userData.usu_grupo);

      const [cData, aData] = await Promise.all([
        supabase.from('categorias').select('*').eq('cat_grupo', userData.usu_grupo),
        supabase.from('contas').select('*').eq('con_grupo', userData.usu_grupo)
      ]);

      setCategories(cData.data || []);
      setAccounts(aData.data || []);
      setCreditCardAccounts(aData.data?.filter((acc: any) => acc.con_tipo === 'cartao') || []);

      // Get system category IDs
      const transferenciaCat = cData.data?.find((cat: any) => cat.cat_nome === 'Transferência entre Contas' && cat.cat_tipo === 'sistema');
      const pagamentoFaturaCat = cData.data?.find((cat: any) => cat.cat_nome === 'Pagamento de Fatura' && cat.cat_tipo === 'sistema');
      
      setSystemCategories({
        transferenciaId: transferenciaCat?.cat_id || null,
        pagamentoFaturaId: pagamentoFaturaCat?.cat_id || null,
      });

    } catch (error) {
      console.error("[fetchInitialData] Error fetching initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOperations = async (gId: string) => {
    setLoading(true);
    try {
      let queryLancamentos = supabase
        .from('lancamentos')
        .select('*, categorias(cat_nome, cat_tipo), contas(con_nome, con_tipo)')
        .eq('lan_grupo', gId)
        .order('lan_data', { ascending: false });

      let queryTransferencias = supabase
        .from('transferencias')
        .select('*, conta_origem:contas!transferencias_tra_conta_origem_fkey(con_nome), conta_destino:contas!transferencias_tra_conta_destino_fkey(con_nome)')
        .eq('tra_grupo', gId)
        .order('tra_data', { ascending: false });

      let queryPagamentos = supabase
        .from('pagamentos_fatura')
        .select('*, conta_origem:contas!pagamentos_fatura_pag_conta_origem_fkey(con_nome), conta_destino:contas!pagamentos_fatura_pag_conta_destino_fkey(con_nome)')
        .eq('pag_grupo', gId)
        .order('pag_data', { ascending: false });

      // Apply Period Filter
      const now = new Date();
      let startStr = '';
      let endStr = '';

      if (filterPeriod === 'thisMonth') {
        startStr = getLocalYMD(startOfMonth(now));
        endStr = getLocalYMD(endOfMonth(now));
      } else if (filterPeriod === 'lastMonth') {
        const lastMonth = subMonths(now, 1);
        startStr = getLocalYMD(startOfMonth(lastMonth));
        endStr = getLocalYMD(endOfMonth(lastMonth));
      } else if (filterPeriod === 'last7') {
        startStr = getLocalYMD(subDays(now, 7));
        endStr = getLocalYMD(now);
      } else if (filterPeriod === 'last30') {
        startStr = getLocalYMD(subDays(now, 30));
        endStr = getLocalYMD(now);
      } else if (filterPeriod === 'custom' && customRange.start && customRange.end) {
        startStr = customRange.start;
        endStr = customRange.end;
      }

      if (startStr) {
        queryLancamentos = queryLancamentos.gte('lan_data', startStr);
        queryLancamentos = queryLancamentos.lte('lan_data', endStr);
        queryTransferencias = queryTransferencias.gte('tra_data', startStr);
        queryTransferencias = queryTransferencias.lte('tra_data', endStr);
        queryPagamentos = queryPagamentos.gte('pag_data', startStr);
        queryPagamentos = queryPagamentos.lte('pag_data', endStr);
      }

      // Apply Account Filter
      if (filterAccount !== 'all') {
        queryLancamentos = queryLancamentos.eq('lan_conta', filterAccount);
        queryTransferencias = queryTransferencias.or(`tra_conta_origem.eq.${filterAccount},tra_conta_destino.eq.${filterAccount}`);
        queryPagamentos = queryPagamentos.or(`pag_conta_origem.eq.${filterAccount},pag_conta_destino.eq.${filterAccount}`);
      }

      // Apply Category Filter (only for common lancamentos)
      if (filterCategory !== 'all') {
        queryLancamentos = queryLancamentos.eq('lan_categoria', filterCategory);
      } else {
        // Exclude system categories from common lancamentos by default
        queryLancamentos = queryLancamentos.not('categorias.cat_tipo', 'eq', 'sistema');
      }
      
      // Apply Type Filter (receita/despesa for common, or specific for transfers/payments)
      if (filterType === 'receita') {
        queryLancamentos = queryLancamentos.gt('lan_valor', 0);
        queryTransferencias = queryTransferencias.eq('tra_id', 'null'); // Exclude transfers
        queryPagamentos = queryPagamentos.eq('pag_id', 'null'); // Exclude payments
      } else if (filterType === 'despesa') {
        queryLancamentos = queryLancamentos.lt('lan_valor', 0);
        queryTransferencias = queryTransferencias.eq('tra_id', 'null'); // Exclude transfers
        queryPagamentos = queryPagamentos.eq('pag_id', 'null'); // Exclude payments
      } else if (filterType === 'transferencia') {
        queryLancamentos = queryLancamentos.eq('lan_id', 'null'); // Exclude common
        queryPagamentos = queryPagamentos.eq('pag_id', 'null'); // Exclude payments
      } else if (filterType === 'pagamento') {
        queryLancamentos = queryLancamentos.eq('lan_id', 'null'); // Exclude common
        queryTransferencias = queryTransferencias.eq('tra_id', 'null'); // Exclude transfers
      }

      const [lancamentosData, transferenciasData, pagamentosData] = await Promise.all([
        queryLancamentos,
        queryTransferencias,
        queryPagamentos
      ]);

      if (lancamentosData.error) throw lancamentosData.error;
      if (transferenciasData.error) throw transferenciasData.error;
      if (pagamentosData.error) throw pagamentosData.error;

      const allOperations: any[] = [];

      lancamentosData.data?.forEach((item: any) => {
        allOperations.push({ ...item, operationType: 'lancamento' });
      });

      transferenciasData.data?.forEach((item: any) => {
        allOperations.push({ ...item, operationType: 'transferencia' });
      });

      pagamentosData.data?.forEach((item: any) => {
        allOperations.push({ ...item, operationType: 'pagamento' });
      });

      // Sort all operations by date
      allOperations.sort((a, b) => {
        const dateA = new Date(a.lan_data || a.tra_data || a.pag_data);
        const dateB = new Date(b.lan_data || b.tra_data || b.pag_data);
        return dateB.getTime() - dateA.getTime();
      });

      setLancamentos(allOperations || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => fetchAllOperations(groupId);

  const handleClearFilters = () => {
    setFilterType('all');
    setFilterAccount('all');
    setFilterCategory('all');
    setFilterPeriod('thisMonth');
    setCustomRange({ start: '', end: '' });
    setSearchTerm('');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      if (deleteTarget.type === 'lancamento') {
        const { error } = await supabase.from('lancamentos').delete().eq('lan_id', deleteTarget.id);
        if (error) throw error;
      } else if (deleteTarget.type === 'transferencia') {
        // Delete transfer and its associated lancamentos
        const { data: transferData, error: fetchError } = await supabase
          .from('transferencias')
          .select('tra_lancamento_origem, tra_lancamento_destino')
          .eq('tra_id', deleteTarget.id)
          .single();
        if (fetchError) throw fetchError;

        if (transferData) {
          await supabase.from('lancamentos').delete().eq('lan_id', transferData.tra_lancamento_origem);
          await supabase.from('lancamentos').delete().eq('lan_id', transferData.tra_lancamento_destino);
        }
        const { error } = await supabase.from('transferencias').delete().eq('tra_id', deleteTarget.id);
        if (error) throw error;
      } else if (deleteTarget.type === 'pagamento') {
        // Delete payment and its associated lancamentos
        const { data: paymentData, error: fetchError } = await supabase
          .from('pagamentos_fatura')
          .select('pag_lancamento_origem, pag_lancamento_destino')
          .eq('pag_id', deleteTarget.id)
          .single();
        if (fetchError) throw fetchError;

        if (paymentData) {
          await supabase.from('lancamentos').delete().eq('lan_id', paymentData.pag_lancamento_origem);
          await supabase.from('lancamentos').delete().eq('lan_id', paymentData.pag_lancamento_destino);
        }
        const { error } = await supabase.from('pagamentos_fatura').delete().eq('pag_id', deleteTarget.id);
        if (error) throw error;
      }
      showSuccess('Operação excluída.');
      setDeleteTarget(null);
      setDeleteConfirmOpen(false);
      fetchAllOperations(groupId);
    } catch (error) {
      showError('Erro ao excluir operação.');
      setLoading(false);
    }
  };

  const handleNewLancamentoClick = () => {
    setEditingLancamento(null);
    setCommonLancamentoModalOpen(true);
  };

  const handleNewTransferenciaClick = () => {
    setEditingTransferencia(null);
    setTransferenciaModalOpen(true);
  };

  const handleEditOperation = (item: any) => {
    if (item.operationType === 'lancamento') {
      setEditingLancamento(item);
      setCommonLancamentoModalOpen(true);
    } else if (item.operationType === 'transferencia') {
      setEditingTransferencia(item);
      setTransferenciaModalOpen(true);
    } else if (item.operationType === 'pagamento') {
      setEditingPagamentoFatura(item);
      setPagamentoFaturaModalOpen(true);
    }
  };

  const handleDeleteOperation = (id: string, type: 'lancamento' | 'transferencia' | 'pagamento') => {
    setDeleteTarget({ id, type });
    setDeleteConfirmOpen(true);
  };

  const filteredList = lancamentos.filter(op => {
    const description = op.lan_descricao || op.tra_descricao || `Pagamento de Fatura ${op.pag_valor}`;
    const accountName = op.contas?.con_nome || op.conta_origem?.con_nome || op.conta_destino?.con_nome;
    return (
      description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      accountName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <MainLayout title="Lançamentos" hideGlobalSearch>
      <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-10">
        
        <LancamentosHeader 
          onNewLancamentoClick={handleNewLancamentoClick} 
          onNewTransferenciaClick={handleNewTransferenciaClick}
        />

        <LancamentosFilters
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />

        {showFilters && (
          <LancamentosFilterBar
            filterType={filterType}
            setFilterType={(value) => { setFilterType(value); }}
            filterAccount={filterAccount}
            setFilterAccount={(value) => { setFilterAccount(value); }}
            filterCategory={filterCategory}
            setFilterCategory={(value) => { setFilterCategory(value); }}
            filterPeriod={filterPeriod}
            setFilterPeriod={(value) => { setFilterPeriod(value); }}
            customRange={customRange}
            setCustomRange={(range) => { setCustomRange(range); }}
            accounts={accounts}
            categories={categories.filter(c => c.cat_tipo !== 'sistema')} // Only show common categories in filter
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
          />
        )}

        <LancamentosTable
          lancamentos={filteredList}
          loading={loading}
          onEditOperation={handleEditOperation}
          onDeleteOperation={handleDeleteOperation}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Common Lancamento Modal */}
      <CommonLancamentoModal 
        open={commonLancamentoModalOpen}
        onOpenChange={setCommonLancamentoModalOpen}
        onSuccess={() => fetchAllOperations(groupId)}
        lancamento={editingLancamento}
        categories={categories.filter(c => c.cat_tipo !== 'sistema')} // Only pass common categories
        accounts={accounts}
        userId={user?.id || ''}
        grupoId={groupId}
      />

      {/* Transferencia Modal */}
      <TransferenciaModal
        open={transferenciaModalOpen}
        onOpenChange={setTransferenciaModalOpen}
        onSuccess={() => fetchAllOperations(groupId)}
        transferencia={editingTransferencia}
        accounts={accounts}
        grupoId={groupId}
        systemCategories={systemCategories}
      />

      {/* Pagamento Fatura Modal */}
      <PagamentoFaturaModal
        open={pagamentoFaturaModalOpen}
        onOpenChange={setPagamentoFaturaModalOpen}
        onSuccess={() => fetchAllOperations(groupId)}
        pagamento={editingPagamentoFatura}
        accounts={accounts}
        creditCardAccounts={creditCardAccounts}
        grupoId={groupId}
        systemCategories={systemCategories}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-white rounded-3xl border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-[#141118]">Excluir {deleteTarget?.type === 'lancamento' ? 'Lançamento' : deleteTarget?.type === 'transferencia' ? 'Transferência' : 'Pagamento'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A operação será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-border-light font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Lancamentos;