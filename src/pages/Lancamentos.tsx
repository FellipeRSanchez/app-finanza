"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { format, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import CommonLancamentoModal from '../components/lancamentos/CommonLancamentoModal';
import TransferenciaModal from '../components/lancamentos/TransferenciaModal';
import PagamentoFaturaModal from '../components/lancamentos/PagamentoFaturaModal';
import { showSuccess, showError } from '@/utils/toast';
import LancamentosHeader from '@/components/lancamentos/LancamentosHeader';
import LancamentosFilters from '@/components/lancamentos/LancamentosFilters';
import LancamentosFilterBar from '@/components/lancamentos/LancamentosFilterBar';
import LancamentosTable from '@/components/lancamentos/LancamentosTable';
import { useLocation, useNavigate } from 'react-router-dom'; // Importar useNavigate

const Lancamentos = ({ hideValues }: { hideValues: boolean }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate(); // Inicializar useNavigate
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [creditCardAccounts, setCreditCardAccounts] = useState<any[]>([]);
  const [groupId, setGroupId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [systemCategories, setSystemCategories] = useState({ transferenciaId: null as string | null, pagamentoFaturaId: null as string | null, });
  const [commonLancamentoModalOpen, setCommonLancamentoModalOpen] = useState(false);
  const [transferenciaModalOpen, setTransferenciaModalOpen] = useState(false);
  const [pagamentoFaturaModalOpen, setPagamentoFaturaModalOpen] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState<any>(null);
  const [editingTransferencia, setEditingTransferencia] = useState<any>(null);
  const [editingPagamentoFatura, setEditingPagamentoFatura] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'lancamento' | 'transferencia' | 'pagamento' } | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('thisMonth');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  useEffect(() => {
    if (user) fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (groupId) fetchLancamentos(groupId);
  }, [groupId, filterType, filterAccount, filterCategory, filterPeriod, customRange]);

  // New useEffect to handle refresh signal from navigation
  useEffect(() => {
    if (location.state?.refresh && groupId) {
      fetchLancamentos(groupId);
      // Clear the state so it doesn't trigger refresh on subsequent visits
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, groupId, navigate, location.pathname]);


  // Handle URL parameters for initial filters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const accountParam = params.get('account');
    if (accountParam) {
      setFilterAccount(accountParam);
      setShowFilters(true); // Open filters if an account is pre-selected
    }
  }, [location.search]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.from('usuarios').select('usu_grupo').eq('usu_id', user?.id).single();
      if (!userData?.usu_grupo) return;
      setGroupId(userData.usu_grupo);
      const [cData, aData] = await Promise.all([
        supabase.from('categorias').select('*').eq('cat_grupo', userData.usu_grupo),
        supabase.from('contas').select('*').eq('con_grupo', userData.usu_grupo)
      ]);
      setCategories(cData.data || []);
      setAccounts(aData.data || []);
      setCreditCardAccounts(aData.data?.filter((acc: any) => acc.con_tipo === 'cartao') || []);
      setSystemCategories({
        transferenciaId: cData.data?.find((cat: any) => cat.cat_nome === 'Transferência entre Contas' && cat.cat_tipo === 'sistema')?.cat_id || null,
        pagamentoFaturaId: cData.data?.find((cat: any) => cat.cat_nome === 'Pagamento de Fatura' && cat.cat_tipo === 'sistema')?.cat_id || null,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLancamentos = async (gId: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('lancamentos')
        .select('*, categorias(cat_nome, cat_tipo), contas(con_nome, con_tipo)')
        .eq('lan_grupo', gId)
        .order('lan_data', { ascending: false });
      const now = new Date();
      let startDate: string | null = null;
      let endDate: string | null = null;
      switch (filterPeriod) {
        case 'thisMonth':
          startDate = format(startOfMonth(now), 'yyyy-MM-dd');
          endDate = format(endOfMonth(now), 'yyyy-MM-dd');
          break;
        case 'lastMonth':
          startDate = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
          endDate = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
          break;
        case 'last7':
          startDate = format(subDays(now, 6), 'yyyy-MM-dd');
          endDate = format(now, 'yyyy-MM-dd');
          break;
        case 'last30':
          startDate = format(subDays(now, 29), 'yyyy-MM-dd');
          endDate = format(now, 'yyyy-MM-dd');
          break;
        case 'custom':
          if (customRange.start) startDate = customRange.start;
          if (customRange.end) endDate = customRange.end;
          break;
      }
      if (startDate) query = query.gte('lan_data', startDate);
      if (endDate) query = query.lte('lan_data', endDate);
      if (filterAccount !== 'all') query = query.eq('lan_conta', filterAccount);
      if (filterCategory !== 'all') query = query.eq('lan_categoria', filterCategory);
      if (filterType === 'receita') query = query.gt('lan_valor', 0);
      else if (filterType === 'despesa') query = query.lt('lan_valor', 0);
      const { data, error } = await query;
      if (error) throw error;
      setLancamentos(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditOperation = async (item: any) => {
    if (item.lan_transferencia) {
      const { data, error } = await supabase.from('transferencias').select('*').eq('tra_id', item.lan_transferencia).single();
      if (data) {
        setEditingTransferencia(data);
        setTransferenciaModalOpen(true);
      } else {
        showError('Não foi possível carregar a transferência.');
      }
    } else if (item.lan_pagamento) {
      const { data, error } = await supabase.from('pagamentos_fatura').select('*').eq('pag_id', item.lan_pagamento).single();
      if (data) {
        setEditingPagamentoFatura(data);
        setPagamentoFaturaModalOpen(true);
      } else {
        showError('Não foi possível carregar o pagamento.');
      }
    } else {
      setEditingLancamento(item);
      setCommonLancamentoModalOpen(true);
    }
  };

  const handleDeleteOperation = (id: string, type: 'lancamento' | 'transferencia' | 'pagamento') => {
    const itemToDelete = lancamentos.find(l => l.lan_id === id);
    if (!itemToDelete) {
      showError('Lançamento não encontrado para exclusão.');
      return;
    }
    let targetId = id;
    let targetType = type;
    if (itemToDelete.lan_transferencia) {
      targetId = itemToDelete.lan_transferencia; // Use the transfer ID
      targetType = 'transferencia';
    } else if (itemToDelete.lan_pagamento) {
      targetId = itemToDelete.lan_pagamento; // Use the payment ID
      targetType = 'pagamento';
    }
    setDeleteTarget({ id: targetId, type: targetType });
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      if (deleteTarget.type === 'transferencia') {
        const { data } = await supabase.from('transferencias').select('tra_lancamento_origem, tra_lancamento_destino').eq('tra_id', deleteTarget.id).single();
        if (data) {
          await supabase.from('lancamentos').delete().in('lan_id', [data.tra_lancamento_origem, data.tra_lancamento_destino]);
          await supabase.from('transferencias').delete().eq('tra_id', deleteTarget.id);
        }
      } else if (deleteTarget.type === 'pagamento') {
        const { data } = await supabase.from('pagamentos_fatura').select('pag_lancamento_origem, pag_lancamento_destino').eq('pag_id', deleteTarget.id).single();
        if (data) {
          await supabase.from('lancamentos').delete().in('lan_id', [data.pag_lancamento_origem, data.pag_lancamento_destino]);
          await supabase.from('pagamentos_fatura').delete().eq('pag_id', deleteTarget.id);
        }
      } else {
        await supabase.from('lancamentos').delete().eq('lan_id', deleteTarget.id);
      }
      showSuccess('Excluído!');
      fetchLancamentos(groupId);
    } catch (error) {
      showError('Erro ao excluir');
    } finally {
      setDeleteConfirmOpen(false);
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilterType('all');
    setFilterAccount('all');
    setFilterCategory('all');
    setFilterPeriod('thisMonth');
    setCustomRange({ start: '', end: '' });
    setSearchTerm('');
    fetchLancamentos(groupId); // Re-fetch with cleared filters
  };

  return (
    <>
      <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-10">
        <LancamentosHeader 
          onNewLancamentoClick={() => { 
            setEditingLancamento(null); 
            setCommonLancamentoModalOpen(true); 
          }} 
          onNewTransferenciaClick={() => { 
            setEditingTransferencia(null); 
            setTransferenciaModalOpen(true); 
          }} 
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
            setFilterType={setFilterType} 
            filterAccount={filterAccount} 
            setFilterAccount={setFilterAccount} 
            filterCategory={filterCategory} 
            setFilterCategory={setFilterCategory} 
            filterPeriod={filterPeriod} 
            setFilterPeriod={setFilterPeriod} 
            customRange={customRange} 
            setCustomRange={setCustomRange} 
            accounts={accounts} 
            categories={categories.filter(c => c.cat_tipo !== 'sistema')} 
            onApplyFilters={() => fetchLancamentos(groupId)} 
            onClearFilters={handleClearFilters} 
          />
        )}
        <LancamentosTable 
          lancamentos={lancamentos.filter(l => 
            l.lan_descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
            l.contas?.con_nome.toLowerCase().includes(searchTerm.toLowerCase())
          )} 
          loading={loading} 
          onEditOperation={handleEditOperation} 
          onDeleteOperation={handleDeleteOperation} 
          formatCurrency={(v) => { 
            if (hideValues) return '••••••'; 
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); 
          }} 
        />
      </div>
      <CommonLancamentoModal 
        open={commonLancamentoModalOpen} 
        onOpenChange={setCommonLancamentoModalOpen} 
        onSuccess={() => fetchLancamentos(groupId)} 
        lancamento={editingLancamento} 
        categories={categories} 
        accounts={accounts} 
        userId={user?.id || ''} 
        grupoId={groupId} 
      />
      <TransferenciaModal 
        open={transferenciaModalOpen} 
        onOpenChange={setTransferenciaModalOpen} 
        onSuccess={() => fetchLancamentos(groupId)} 
        transferencia={editingTransferencia} 
        accounts={accounts} 
        grupoId={groupId} 
        systemCategories={systemCategories} 
      />
      <PagamentoFaturaModal 
        open={pagamentoFaturaModalOpen} 
        onOpenChange={setPagamentoFaturaModalOpen} 
        onSuccess={() => fetchLancamentos(groupId)} 
        pagamento={editingPagamentoFatura} 
        accounts={accounts} 
        creditCardAccounts={creditCardAccounts} 
        grupoId={groupId} 
        systemCategories={systemCategories} 
        hideValues={hideValues} 
      />
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-white rounded-3xl border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-[#141118]">Excluir Operação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação removerá o(s) lançamento(s) permanentemente.</AlertDialogDescription>
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

export default Lancamentos;