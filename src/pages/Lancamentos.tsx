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
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  ChevronDown,
  Calendar,
  Wallet,
  Tag,
  CheckCircle2,
  Clock,
  FileDown
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Lancamentos = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;

      const [lData, cData, aData] = await Promise.all([
        supabase.from('lancamentos').select('*, categorias(cat_nome, cat_tipo), contas(con_nome)').eq('lan_grupo', userData.usu_grupo).order('lan_data', { ascending: false }),
        supabase.from('categorias').select('*').eq('cat_grupo', userData.usu_grupo),
        supabase.from('contas').select('*').eq('con_grupo', userData.usu_grupo)
      ]);

      setLancamentos(lData.data || []);
      setCategories(cData.data || []);
      setAccounts(aData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <MainLayout title="Lançamentos">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#141118] dark:text-white tracking-tight">Lançamentos</h1>
            <p className="text-text-secondary-light dark:text-[#a08cb6] font-medium text-sm">Extrato financeiro detalhado</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#756189] w-4 h-4 group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Pesquisar descrição..." 
                className="w-64 pl-10 rounded-xl bg-white dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] h-11"
              />
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/25 transition-all">
              <Plus className="w-5 h-5 mr-2" /> Novo Lançamento
            </Button>
          </div>
        </div>

        {/* Filter Toggle & Quick Info */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "rounded-xl h-10 px-4 font-bold border border-border-light dark:border-[#2d2438] transition-all",
              showFilters ? "bg-primary/10 text-primary border-primary/20" : "bg-white dark:bg-[#1e1629] text-[#756189]"
            )}
          >
            <Filter className="w-4 h-4 mr-2" /> 
            {showFilters ? "Ocultar Filtros" : "Filtrar Extrato"}
            <ChevronDown className={cn("w-4 h-4 ml-2 transition-transform", showFilters && "rotate-180")} />
          </Button>

          <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest text-text-secondary-light">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Confirmados</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" /> Pendentes</span>
          </div>
        </div>

        {/* Collapsible Filters Bar */}
        {showFilters && (
          <Card className="bg-white dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] rounded-2xl shadow-soft animate-in slide-in-from-top-4 duration-300">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#756189]">Período</label>
                <div className="flex items-center gap-2 bg-background-light dark:bg-[#2c2435] rounded-xl px-3 h-10 border border-transparent focus-within:border-primary/30 transition-all">
                  <Calendar className="w-4 h-4 text-[#756189]" />
                  <span className="text-xs font-bold text-[#141118] dark:text-white">Este Mês</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#756189]">Conta</label>
                <Select>
                  <SelectTrigger className="h-10 rounded-xl bg-background-light dark:bg-[#2c2435] border-none text-xs font-bold">
                    <SelectValue placeholder="Todas as contas" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border-light dark:border-[#2d2438]">
                    {accounts.map(acc => (
                      <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#756189]">Categoria</label>
                <Select>
                  <SelectTrigger className="h-10 rounded-xl bg-background-light dark:bg-[#2c2435] border-none text-xs font-bold">
                    <SelectValue placeholder="Todas categorias" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border-light dark:border-[#2d2438]">
                    {categories.map(cat => (
                      <SelectItem key={cat.cat_id} value={cat.cat_id}>{cat.cat_nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#756189]">Tipo</label>
                <Select>
                  <SelectTrigger className="h-10 rounded-xl bg-background-light dark:bg-[#2c2435] border-none text-xs font-bold">
                    <SelectValue placeholder="Receitas e Despesas" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border-light dark:border-[#2d2438]">
                    <SelectItem value="receita">Apenas Receitas</SelectItem>
                    <SelectItem value="despesa">Apenas Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2">
                <Button variant="outline" className="h-10 flex-1 rounded-xl border-border-light dark:border-[#2d2438] text-xs font-bold">Limpar</Button>
                <Button className="h-10 flex-1 rounded-xl bg-primary text-white text-xs font-bold">Aplicar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions Table Section */}
        <Card className="bg-white dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] rounded-3xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-background-light/50 dark:bg-[#2c2435]/50 sticky top-0 z-10 backdrop-blur-sm">
                <TableRow className="border-border-light dark:border-[#2d2438] hover:bg-transparent">
                  <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14 pl-8">Data</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14">Descrição</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14">Conta</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14">Categoria</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14">Valor</TableHead>
                  <TableHead className="w-[80px] text-center text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14">Tipo</TableHead>
                  <TableHead className="w-[100px] text-right text-[10px] font-black uppercase tracking-[0.1em] text-[#756189] h-14 pr-8">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i} className="animate-pulse border-border-light dark:border-[#2d2438]">
                      <TableCell className="h-16 pl-8"><div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-12" /></TableCell>
                      <TableCell><div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-32" /></TableCell>
                      <TableCell><div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-20" /></TableCell>
                      <TableCell><div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-24" /></TableCell>
                      <TableCell className="text-right"><div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-16 ml-auto" /></TableCell>
                      <TableCell><div className="h-8 w-8 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto" /></TableCell>
                      <TableCell className="pr-8 text-right"><div className="h-8 w-8 bg-gray-100 dark:bg-gray-800 rounded-lg ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : lancamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-40">
                        <Wallet className="w-12 h-12 text-[#756189]" />
                        <p className="text-sm font-bold uppercase tracking-widest">Nenhum lançamento encontrado</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  lancamentos.map((item) => {
                    const isIncome = item.categorias?.cat_tipo === 'receita';
                    return (
                      <TableRow key={item.lan_id} className="border-border-light dark:border-[#2d2438] hover:bg-background-light/30 dark:hover:bg-[#2c2435]/30 group transition-colors cursor-pointer">
                        <TableCell className="pl-8 py-4">
                          <span className="text-xs font-bold text-[#756189]">{format(new Date(item.lan_data), 'dd/MM', { locale: ptBR })}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-[#141118] dark:text-white line-clamp-1">{item.lan_descricao}</span>
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
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background-light dark:bg-[#2c2435] text-[10px] font-black uppercase tracking-wider text-[#756189] border border-border-light dark:border-[#3a3045]">
                            <Tag className="w-3 h-3" />
                            {item.categorias?.cat_nome || "Sem Categoria"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "text-sm font-black tracking-tight",
                            isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          )}>
                            {isIncome ? "+" : "-"} {formatCurrency(Math.abs(item.lan_valor))}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center mx-auto",
                            isIncome ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-rose-100 dark:bg-rose-900/30 text-rose-600"
                          )}>
                            {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                        </TableCell>
                        <TableCell className="pr-8 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30">
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
          
          {/* Footer / Pagination Placeholder */}
          {!loading && lancamentos.length > 0 && (
            <div className="p-6 border-t border-border-light dark:border-[#2d2438] flex items-center justify-between bg-white dark:bg-[#1e1629]">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#756189]">Exibindo {lancamentos.length} lançamentos do período</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-xl h-9 px-4 font-bold border-border-light dark:border-[#2d2438] bg-white dark:bg-[#1e1629] text-[#756189] hover:text-primary transition-all">
                  <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
                </Button>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border-light dark:border-[#2d2438] opacity-50" disabled>
                    <ChevronDown className="w-4 h-4 rotate-90" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border-light dark:border-[#2d2438]">
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
};

export default Lancamentos;