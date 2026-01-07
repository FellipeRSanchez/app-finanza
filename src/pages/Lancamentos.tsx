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
        transferenciaId: cData.data?.find((cat: any) => cat.cat_tipo === 'sistema' && cat.cat_nome.includes('Transferência'))?.cat_id || null,
        pagamentoFaturaId: cData.data?.find((cat: any) => cat.cat_tipo === 'sistema' && cat.cat_nome.includes('Pagamento'))?.cat_id || null,
      });
    } catch (error) { console.error(error); } finally { setLoading(false); }
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
      if (filterPeriod === 'thisMonth') query = query.gte('lan_data', format(startOfMonth(now), 'yyyy-MM-dd')).lte('lan_data', format(endOfMonth(now), 'yyyy-MM-dd'));
      if (filterAccount !== 'all') query = query.eq('lan_conta', filterAccount);
      if (filterCategory !== 'all') query = query.eq('lan_categoria', filterCategory);
      if (filterType === 'receita') query = query.gt('lan_valor', 0);
      if (filterType === 'despesa') query = query.lt('lan_valor', 0);

      const { data, error } = await query;
      if (error) throw error;
      setLancamentos(data?.map(l => ({ ...l, operationType: 'lancamento' })) || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleEditOperation = async (item: any) => {
    if (item.lan_transferencia) {
      const { data } = await supabase.from('transferencias').select('*').eq('tra_id', item.lan_transferencia).single();
      setEditingTransferencia(data);
      setTransferenciaModalOpen(true);
    } else if (item.lan_pagamento) {
      const { data } = await supabase.from('pagamentos_fatura').select('*').eq('pag_id', item.lan_pagamento).single();
      setEditingPagamentoFatura(data);
      setPagamentoFaturaModalOpen(true);
    } else {
      setEditingLancamento(item);
      setCommonLancamentoModalOpen(true);
    }
  };

  const handleDeleteOperation = (id: string, type: string) => {
    const l = lancamentos.find(item => item.lan_id === id);
    if (l?.lan_transferencia) {
      setDeleteTarget({ id: l.lan_transferencia, type: 'transferencia' });
    } else if (l?.lan_pagamento) {
      setDeleteTarget({ id: l.lan_pagamento, type: 'pagamento' });
    } else {
      setDeleteTarget({ id, type: 'lancamento' });
    }
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      if (deleteTarget.type === 'transferencia') {
        const { data } = await supabase.from('transferencias').select('*').eq('tra_id', deleteTarget.id).single();
        if (data) await supabase.from('lancamentos').delete().in('lan_id', [data.tra_lancamento_origem, data.tra_lancamento_destino]);
        await supabase.from('transferencias').delete().eq('tra_id', deleteTarget.id);
      } else {
        await supabase.from('lancamentos').delete().eq('lan_id', deleteTarget.id);
      }
      showSuccess('Excluído!');
      fetchLancamentos(groupId);
    } catch (error) { showError('Erro ao excluir'); } finally { setDeleteConfirmOpen(false); setLoading(false); }
  };

  return (
    <MainLayout title="Lançamentos" hideGlobalSearch>
      <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-10">
        <LancamentosHeader onNewLancamentoClick={() => { setEditingLancamento(null); setCommonLancamentoModalOpen(true); }} onNewTransferenciaClick={() => { setEditingTransferencia(null); setTransferenciaModalOpen(true); }} />
        <LancamentosFilters showFilters={showFilters} setShowFilters={setShowFilters} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        {showFilters && <LancamentosFilterBar filterType={filterType} setFilterType={setFilterType} filterAccount={filterAccount} setFilterAccount={setFilterAccount} filterCategory={filterCategory} setFilterCategory={setFilterCategory} filterPeriod={filterPeriod} setFilterPeriod={setFilterPeriod} customRange={customRange} setCustomRange={setCustomRange} accounts={accounts} categories={categories.filter(c => c.cat_tipo !== 'sistema')} onApplyFilters={() => fetchLancamentos(groupId)} onClearFilters={() => {setFilterType('all'); setFilterPeriod('thisMonth'); fetchLancamentos(groupId);}} />}
        <LancamentosTable lancamentos={lancamentos.filter(l => l.lan_descricao.toLowerCase().includes(searchTerm.toLowerCase()))} loading={loading} onEditOperation={handleEditOperation} onDeleteOperation={handleDeleteOperation} formatCurrency={(v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)} />
      </div>
      <CommonLancamentoModal open={commonLancamentoModalOpen} onOpenChange={setCommonLancamentoModalOpen} onSuccess={() => fetchLancamentos(groupId)} lancamento={editingLancamento} categories={categories} accounts={accounts} userId={user?.id || ''} grupoId={groupId} />
      <TransferenciaModal open={transferenciaModalOpen} onOpenChange={setTransferenciaModalOpen} onSuccess={() => fetchLancamentos(groupId)} transferencia={editingTransferencia} accounts={accounts} grupoId={groupId} systemCategories={systemCategories} />
      <PagamentoFaturaModal open={pagamentoFaturaModalOpen} onOpenChange={setPagamentoFaturaModalOpen} onSuccess={() => fetchLancamentos(groupId)} pagamento={editingPagamentoFatura} accounts={accounts} creditCardAccounts={creditCardAccounts} grupoId={groupId} systemCategories={systemCategories} />
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-white rounded-3xl border">
          <AlertDialogHeader><AlertDialogTitle className="font-black">Excluir Operação?</AlertDialogTitle><AlertDialogDescription>Esta ação removerá o(s) lançamento(s) permanentemente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-rose-600 text-white rounded-xl">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Lancamentos;