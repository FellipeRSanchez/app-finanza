"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Edit2, 
  Trash2, 
  ChevronDown,
  Calendar,
  Wallet,
  Tag,
  CheckCircle2,
  Clock,
  X
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Added import for table components
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LancamentoModal from '../components/lancamentos/LancamentoModal';
import { showSuccess, showError } from '@/utils/toast';

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
  const [filterCategory, setFilterCategory] = useState('all'); // Added category filter state
  const [filterPeriod, setFilterPeriod] = useState('thisMonth');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  useEffect(() => {
    if (groupId) {
      fetchLancamentos(groupId);
    }
  }, [groupId, filterType, filterAccount, filterCategory, filterPeriod, customRange]); // Re-fetch on filter change

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
      
      // Initial fetch will be triggered by the useEffect above
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
        startStr = format(startOfMonth(now), 'yyyy-MM-dd');
        endStr = format(endOfMonth(now), 'yyyy-MM-dd');
      } else if (filterPeriod === 'lastMonth') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startStr = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        endStr = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
      } else if (filterPeriod === 'last7') {
        startStr = format(subDays(now, 7), 'yyyy-MM-dd');
        endStr = format(now, 'yyyy-MM-dd');
      } else if (filterPeriod === 'last30') {
        startStr = format(subDays(now, 30), 'yyyy-MM-dd');
        endStr = format(now, 'yyyy-MM-dd');
      } else if (filterPeriod === 'custom' && customRange.start && customRange.end) {
        startStr = customRange.start;
        endStr = customRange.end;
      }

      if (startStr) query = query.gte('lan_data', startStr);
      if (endStr) query = query.lte('lan_data', endStr);

      // Other filters
      if (filterAccount !== 'all') query = query.eq('lan_conta', filterAccount);
      if (filterCategory !== 'all') query = query.eq('lan_categoria', filterCategory); // Apply category filter
      if (filterType !== 'all') query = query.filter('categorias.cat_tipo', 'eq', filterType);

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
    setFilterCategory('all'); // Clear category filter
    setFilterPeriod('thisMonth');
    setCustomRange({ start: '', end: '' });
    setSearchTerm('');
    // fetchLancamentos will be triggered by useEffect
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
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#141118] dark:text-white tracking-tight">Lançamentos</h1>
            <p className="text-text-secondary-light dark:text-[#a08cb6] font-medium text-sm">Extrato financeiro detalhado</p>
          </div>
          
          <Button 
            onClick={() => { setEditingLancamento(null); setModalOpen(true); }}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/25 transition-all"
          >
            <Plus className="w-5 h-5 mr-2" /> Novo Lançamento
          </Button>
        </div>

        {/* Search & Filter Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "rounded-xl h-11 px-4 font-bold border border-border-light transition-all",
                showFilters ? "bg-primary/10 text-primary border-primary/20" : "bg-white text-[#756189]"
              )}
            >
              <Filter className="w-4 h-4 mr-2" /> 
              {showFilters ? "Ocultar Filtros" : "Filtros"}
              <ChevronDown className={cn("w-4 h-4 ml-2 transition-transform", showFilters && "rotate-180")} />
            </Button>

            <div className="relative flex-1 sm:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#756189] w-4 h-4 group-focus-within:text-primary" />
              <Input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Pesquisar descrição ou conta..." 
                className="pl-10 rounded-xl bg-white border-border-light h-11 shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest text-text-secondary-light">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Confirmados</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" /> Pendentes</span>
          </div>
        </div>

        {/* Collapsible Filters Bar */}
        {showFilters && (
          <Card className="bg-white border-border-light rounded-3xl shadow-soft animate-in slide-in-from-top-4 duration-300 border">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#756189]">Período</label>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger className="h-11 rounded-xl bg-background-light/50 border-border-light font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg rounded-xl">
                    <SelectItem value="thisMonth">Este Mês</SelectItem>
                    <SelectItem value="lastMonth">Mês Anterior</SelectItem>
                    <SelectItem value="last7">Últimos 7 dias</SelectItem>
                    <SelectItem value="last30">Últimos 30 dias</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filterPeriod === 'custom' && (
                <div className="lg:col-span-1 grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-[#756189]">Início</label>
                    <Input 
                      type="date" 
                      value={customRange.start} 
                      onChange={e => setCustomRange({...customRange, start: e.target.value})}
                      className="rounded-xl h-11 bg-background-light/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-[#756189]">Fim</label>
                    <Input 
                      type="date" 
                      value={customRange.end} 
                      onChange={e => setCustomRange({...customRange, end: e.target.value})}
                      className="rounded-xl h-11 bg-background-light/50"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#756189]">Conta</label>
                <Select value={filterAccount} onValueChange={setFilterAccount}>
                  <SelectTrigger className="h-11 rounded-xl bg-background-light/50 border-border-light font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg rounded-xl">
                    <SelectItem value="all">Todas as contas</SelectItem>
                    {accounts.map(acc => (
                      <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#756189]">Tipo</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-11 rounded-xl bg-background-light/50 border-border-light font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg rounded-xl">
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="receita">Apenas Receitas</SelectItem>
                    <SelectItem value="despesa">Apenas Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter - Problem 3 */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#756189]">Categoria</label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-11 rounded-xl bg-background-light/50 border-border-light font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg rounded-xl">
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.cat_id} value={cat.cat_id}>{cat.cat_nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2 md:col-span-2 lg:col-span-1 pt-4 lg:pt-0">
                <Button 
                  variant="outline" 
                  onClick={handleClearFilters}
                  className="h-11 flex-1 rounded-xl border-border-light font-bold text-[#756189]"
                >
                  Limpar
                </Button>
                <Button 
                  onClick={handleApplyFilters}
                  className="h-11 flex-1 rounded-xl bg-primary text-white font-bold"
                >
                  Aplicar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions Table Section */}
        <Card className="bg-white border-border-light rounded-3xl shadow-soft overflow-hidden border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-background-light/50 sticky top-0 z-10 backdrop-blur-sm">
                <TableRow className="border-border-light hover:bg-transparent">
                  <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14 pl-8">Data</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14">Descrição</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14">Conta</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14">Categoria</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14">Valor</TableHead>
                  <TableHead className="w-[80px] text-center text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14">Tipo</TableHead>
                  <TableHead className="w-[120px] text-right text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14 pr-8">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i} className="animate-pulse border-border-light">
                      <TableCell className="h-16 pl-8"><div className="h-3 bg-gray-100 rounded w-12" /></TableCell>
                      <TableCell><div className="h-3 bg-gray-100 rounded w-32" /></TableCell>
                      <TableCell><div className="h-3 bg-gray-100 rounded w-20" /></TableCell>
                      <TableCell><div className="h-3 bg-gray-100 rounded w-24" /></TableCell>
                      <TableCell className="text-right"><div className="h-3 bg-gray-100 rounded w-16 ml-auto" /></TableCell>
                      <TableCell><div className="h-8 w-8 bg-gray-100 rounded-full mx-auto" /></TableCell>
                      <TableCell className="pr-8 text-right"><div className="h-8 w-20 bg-gray-100 rounded-lg ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-40">
                        <Wallet className="w-12 h-12 text-[#756189]" />
                        <p className="text-sm font-bold uppercase tracking-widest">Nenhum lançamento encontrado</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredList.map((item) => {
                    const isIncome = item.categorias?.cat_tipo === 'receita';
                    return (
                      <TableRow key={item.lan_id} className="border-border-light hover:bg-background-light/30 group transition-colors cursor-pointer">
                        <TableCell className="pl-8 py-4">
                          <span className="text-xs font-bold text-[#756189]">{format(new Date(item.lan_data), 'dd/MM', { locale: ptBR })}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-[#141118] line-clamp-1">{item.lan_descricao}</span>
                            <span className="text-[10px] text-text-secondary-light font-bold flex items-center gap-1">
                              {item.lan_conciliado ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-amber-500" />}
                              {item.lan_conciliado ? "Confirmado" : "Pendente"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-bold text-[#756189] flex items-center gap-2">
                            <Wallet className="w-3 h-3" />
                            {item.contas?.con_nome || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background-light text-[10px] font-black uppercase tracking-wider text-[#756189] border border-border-light">
                            <Tag className="w-3 h-3" />
                            {item.categorias?.cat_nome || "Sem Categoria"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "text-sm font-black tracking-tight",
                            isIncome ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {isIncome ? "+" : "-"} {formatCurrency(Math.abs(item.lan_valor))}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center mx-auto",
                            isIncome ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                          )}>
                            {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                        </TableCell>
                        <TableCell className="pr-8 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { setEditingLancamento(item); setModalOpen(true); }}
                              className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setDeleteId(item.lan_id)}
                              className="h-8 w-8 rounded-lg hover:bg-rose-100 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Functional Components */}
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