"use client";
import { Card } from '@/components/ui/card';
import { TrendingUp, Landmark, Search, Database, ArrowUp, ChevronRight, ChevronLeft, Wallet, Trash2, Settings, AlertCircle, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import AddInvestmentForm from '@/components/investments/AddInvestmentForm';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const Investimentos = ({ hideValues }: { hideValues: boolean }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [investimentos, setInvestimentos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchInvestments();
    }
  }, [user, searchTerm, filterType]);

  const fetchInvestments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('investimentos')
        .select('*')
        .eq('user_id', user?.id);
      if (searchTerm) {
        query = query.ilike('inv_name', `%${searchTerm}%`);
      }
      if (filterType !== 'Todos') {
        query = query.eq('inv_type', filterType);
      }
      const { data, error } = await query;
      if (error) throw error;
      setInvestimentos(data || []);
    } catch (error) {
      console.error("Error fetching investments:", error);
      showError("Erro ao carregar investimentos.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleOpenDeleteConfirm = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('investimentos')
        .delete()
        .eq('inv_id', deleteTarget.id);
      if (error) throw error;
      showSuccess(`${deleteTarget.name} excluído com sucesso!`);
      fetchInvestments();
    } catch (error) {
      console.error("Erro ao excluir investimento:", error);
      showError(`Erro ao excluir ${deleteTarget.name}.`);
    } finally {
      setDeleteConfirmOpen(false);
      setLoading(false);
    }
  };

  const handleEditInvestment = (investment: any) => {
    showError("Funcionalidade de edição de investimento ainda não implementada.");
  };

  const totalInvestido = investimentos.reduce((sum, inv) => sum + Number(inv.inv_avg_price || 0), 0);
  const saldoAtual = investimentos.reduce((sum, inv) => sum + Number(inv.inv_current_value || 0), 0);
  const rentabilidadeValor = investimentos.reduce((sum, inv) => sum + Number(inv.inv_performance_value || 0), 0);
  const rentabilidadePercent = totalInvestido > 0 ? (rentabilidadeValor / totalInvestido) * 100 : 0;

  return (
    <>
      <div className="container mx-auto max-w-7xl p-4 lg:p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <span>Finanças</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-primary">Investimentos</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-4xl"> Meus Investimentos </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400"> Acompanhe a performance detalhada da sua carteira. </p>
          </div>
          <AddInvestmentForm onInvestmentAdded={fetchInvestments} hideValues={hideValues} />
        </div>
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#1e1629] p-6 shadow-sm transition-all hover:shadow-md border border-transparent dark:border-[#2d2438]">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/5 transition-transform group-hover:scale-110 dark:bg-primary/10"></div>
            <div className="relative z-10 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Landmark size={20} />
                <span className="text-sm font-medium">Total Investido</span>
              </div>
              <span className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-3xl">{formatCurrency(totalInvestido)}</span>
            </div>
          </Card>
          <Card className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#1e1629] p-6 shadow-sm transition-all hover:shadow-md border border-transparent dark:border-[#2d2438]">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-emerald-500/5 transition-transform group-hover:scale-110 dark:bg-emerald-500/10"></div>
            <div className="relative z-10 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Wallet size={20} />
                <span className="text-sm font-medium">Saldo Atual</span>
              </div>
              <span className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-3xl">{formatCurrency(saldoAtual)}</span>
            </div>
          </Card>
          <Card className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#1e1629] p-6 shadow-sm transition-all hover:shadow-md border border-transparent dark:border-[#2d2438]">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-emerald-500/5 transition-transform group-hover:scale-110 dark:bg-emerald-500/10"></div>
            <div className="relative z-10 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <TrendingUp size={20} />
                <span className="text-sm font-medium">Rentabilidade</span>
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className={cn("text-2xl font-bold tracking-tight lg:text-3xl", rentabilidadeValor >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                  {formatCurrency(rentabilidadeValor)}
                </span>
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold", rentabilidadePercent >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400")}>
                  {rentabilidadePercent >= 0 ? <ArrowUp size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                  {rentabilidadePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </Card>
        </div>
        <Card className="flex flex-col gap-6 rounded-2xl bg-white dark:bg-[#1e1629] p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 h-10 w-10 p-2.5" />
              <Input 
                className="block w-full rounded-xl border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary dark:border-[#2d2438] dark:bg-[#251b30] dark:text-white" 
                placeholder="Buscar ativo..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                className={cn("rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all hover:bg-primary/90", filterType === 'Todos' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200 dark:border-[#2d2438] dark:bg-[#251b30] dark:text-slate-300')} 
                onClick={() => setFilterType('Todos')}
              >
                Todos
              </Button>
              {['Ações BDR', 'Renda Fixa', 'Ações Brasil', 'Cripto', 'FIIs'].map(chip => (
                <Button 
                  key={chip} 
                  variant="ghost" 
                  className={cn("rounded-lg border px-4 py-2 text-sm font-medium", filterType === chip ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 dark:border-[#2d2438] dark:bg-[#251b30] dark:text-slate-300')} 
                  onClick={() => setFilterType(chip)}
                >
                  {chip}
                </Button>
              ))}
            </div>
          </div>
          <div className="relative overflow-x-auto rounded-xl border border-slate-100 dark:border-[#2d2438]">
            <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="bg-slate-50 text-xs uppercase text-slate-700 dark:bg-[#251b30] dark:text-slate-300">
                <tr>
                  <th className="px-6 py-4 font-semibold">Ativo</th>
                  <th className="px-6 py-4 font-semibold">Tipo</th>
                  <th className="px-6 py-4 font-semibold text-right">Preço Médio</th>
                  <th className="px-6 py-4 font-semibold text-right">Saldo Atual</th>
                  <th className="px-6 py-4 font-semibold text-right">Rentabilidade</th>
                  <th className="px-6 py-4 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2d2438]">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="h-16 animate-pulse">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : investimentos.length === 0 ? (
                  <tr className="bg-white dark:bg-[#1e1629]">
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                      <AlertCircle className="mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-4" size={48} />
                      Nenhum investimento encontrado.
                    </td>
                  </tr>
                ) : (
                  investimentos.map((item) => (
                    <tr key={item.inv_id} className="bg-white transition-colors hover:bg-slate-50 dark:bg-[#1e1629] dark:hover:bg-[#251b30]">
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-[#2d2438] text-slate-600 dark:text-slate-300">
                            <Database size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold">{item.inv_symbol}</span>
                            <span className="text-xs font-normal text-slate-500">{item.inv_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset", 
                          item.inv_type === 'Renda Fixa' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30' :
                          item.inv_type === 'Ações BDR' ? 'bg-purple-50 text-purple-700 ring-purple-700/10 dark:bg-purple-400/10 dark:text-purple-400 dark:ring-purple-400/30' :
                          item.inv_type === 'Ações Brasil' ? 'bg-blue-50 text-blue-700 ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/30' :
                          item.inv_type === 'Cripto' ? 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-400/10 dark:text-orange-400 dark:ring-orange-400/30' :
                          item.inv_type === 'FIIs' ? 'bg-indigo-50 text-indigo-700 ring-indigo-700/10 dark:bg-indigo-400/10 dark:text-indigo-400 dark:ring-indigo-400/30' :
                          'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-400/10 dark:text-gray-400 dark:ring-gray-400/30'
                        )}>{item.inv_type}</span>
                      </td>
                      <td className="px-6 py-4 text-right">{formatCurrency(Number(item.inv_avg_price || 0))}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(Number(item.inv_current_value || 0))}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className={cn("text-sm font-bold", item.inv_positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>{formatCurrency(Number(item.inv_performance_value || 0))}</span>
                          <span className={cn("text-xs", item.inv_positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>{Number(item.inv_performance_percent || 0).toFixed(2)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#2d2438] dark:hover:text-white" onClick={() => handleEditInvestment(item)}><Settings size={20} /></Button>
                        <Button variant="ghost" size="icon" className="rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20" onClick={() => handleOpenDeleteConfirm(item.inv_id, item.inv_name)}><Trash2 size={20} /></Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-[#2d2438]">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Mostrando <span className="font-semibold text-slate-900 dark:text-white">1-{investimentos.length}</span> de <span className="font-semibold text-slate-900 dark:text-white">{investimentos.length}</span> ativos
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border border-slate-200 text-slate-400" disabled><ChevronLeft size={18} /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border border-slate-200 text-slate-400"><ChevronRight size={18} /></Button>
            </div>
          </div>
        </Card>
      </div>
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-white rounded-3xl border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-[#141118]">Excluir {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente "{deleteTarget?.name}" dos seus investimentos.
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

export default Investimentos;