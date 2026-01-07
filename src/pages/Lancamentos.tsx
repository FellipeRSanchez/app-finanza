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
import { format, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns'; // Added subMonths
import LancamentoModal from '../components/lancamentos/LancamentoModal';
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
  const [groupId, setGroupId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // States for Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
      fetchLancamentos(groupId);
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
        .select('*, categorias(cat_nome, cat_tipo), contas(con_nome)')
        .eq('lan_grupo', gId)
        .order('lan_data', { ascending: false });

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

      if (startStr) query = query.gte('lan_data', startStr);
      if (endStr) query = query.lte('lan_data', endStr);

      // Other filters
      if (filterAccount !== 'all') query = query.eq('lan_conta', filterAccount);
      if (filterCategory !== 'all') query = query.eq('lan_categoria', filterCategory);
      if (filterType !== 'all') query = query.eq('categorias.cat_tipo', filterType); // Changed .filter to .eq for type filter

      const { data, error } = await query;
      if (error) throw error;
      setLancamentos(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => fetchLancamentos(groupId);

  const handleClearFilters = () => {
    setFilterType('all');
    setFilterAccount('all');
    setFilterCategory('all');
    setFilterPeriod('thisMonth');
    setCustomRange({ start: '', end: '' });
    setSearchTerm('');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('lancamentos').delete().eq('lan_id', deleteId);
      if (error) throw error;
      showSuccess('Lançamento excluído.');
      setDeleteId(null);
      fetchLancamentos(groupId);
    } catch (error) {
      showError('Erro ao excluir.');
    }
  };

  const handleNewLancamentoClick = () => {
    setEditingLancamento(null);
    setModalOpen(true);
  };

  const handleEditLancamento = (item: any) => {
    setEditingLancamento(item);
    setModalOpen(true);
  };

  const handleDeleteLancamento = (id: string) => {
    setDeleteId(id);
  };

  const filteredList = lancamentos.filter(l => 
    l.lan_descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.contas?.con_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <MainLayout title="Lançamentos" hideGlobalSearch>
      <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-10">
        
        <LancamentosHeader onNewLancamentoClick={handleNewLancamentoClick} />

        <LancamentosFilters
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />

        {showFilters && (
          <LancamentosFilterBar
            filterType={filterType}
            setFilterType={(value) => { setFilterType(value); }} // Apply immediately
            filterAccount={filterAccount}
            setFilterAccount={(value) => { setFilterAccount(value); }} // Apply immediately
            filterCategory={filterCategory}
            setFilterCategory={(value) => { setFilterCategory(value); }} // Apply immediately
            filterPeriod={filterPeriod}
            setFilterPeriod={(value) => { setFilterPeriod(value); }} // Apply immediately
            customRange={customRange}
            setCustomRange={(range) => { setCustomRange(range); }} // Apply immediately
            accounts={accounts}
            categories={categories}
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
          />
        )}

        <LancamentosTable
          lancamentos={filteredList}
          loading={loading}
          onEditLancamento={handleEditLancamento}
          onDeleteLancamento={handleDeleteLancamento}
          formatCurrency={formatCurrency}
        />
      </div>

      <LancamentoModal 
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => fetchLancamentos(groupId)}
        lancamento={editingLancamento}
        categories={categories}
        accounts={accounts}
        userId={user?.id || ''}
        grupoId={groupId}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-white rounded-3xl border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-[#141118]">Excluir Lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lançamento será removido permanentemente do seu extrato.
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