"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Filter, Trash2, Edit, ShoppingCart, Banknote, Film, Car, ShoppingBag, FileText, ArrowUp, ArrowDown } from 'lucide-react'; // Ícones corrigidos e FileText adicionado
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Lancamento {
  lan_id: string;
  lan_data: string;
  lan_descricao: string;
  lan_valor: number;
  lan_categoria: string;
  lan_conta: string;
  lan_grupo: string;
  // Adicionar campos para status, se necessário, ou simular
}

interface Categoria {
  cat_id: string;
  cat_nome: string;
  cat_tipo: string;
}

const Lancamentos = () => {
  const { user } = useAuth();
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchLancamentosAndCategories();
    }
  }, [user]);

  const fetchLancamentosAndCategories = async () => {
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;

      const grupoId = userData.usu_grupo;

      const [{ data: lancamentosData, error: lancamentosError }, { data: categoriesData, error: categoriesError }] = await Promise.all([
        supabase
          .from('lancamentos')
          .select('*')
          .eq('lan_grupo', grupoId)
          .order('lan_data', { ascending: false }),
        supabase
          .from('categorias')
          .select('*')
          .eq('cat_grupo', grupoId),
      ]);

      if (lancamentosError) throw lancamentosError;
      if (categoriesError) throw categoriesError;

      setLancamentos(lancamentosData || []);
      setCategorias(categoriesData || []);
    } catch (error) {
      console.error('Error fetching lançamentos or categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categorias.find(cat => cat.cat_id === categoryId)?.cat_nome || 'Sem Categoria';
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case 'alimentação': return <ShoppingCart className="h-4 w-4" />;
      case 'salário': return <Banknote className="h-4 w-4" />;
      case 'assinaturas': return <Film className="h-4 w-4" />;
      case 'transporte': return <Car className="h-4 w-4" />;
      case 'compras': return <ShoppingBag className="h-4 w-4" />;
      case 'outras receitas': return <ArrowDown className="h-4 w-4" />;
      case 'outras despesas': return <ArrowUp className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredLancamentos = lancamentos.filter(l =>
    l.lan_descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCategoryName(l.lan_categoria).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <MainLayout title="Lançamentos">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Lançamentos">
      <div className="max-w-7xl mx-auto p-4 lg:p-8 flex flex-col gap-8 pb-20">
        {/* Page Heading */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-text-secondary-light dark:text-text-secondary-dark text-sm mb-1">
            <a className="hover:text-primary-new" href="#">Finanças</a>
            <span className="text-[16px]">/</span> {/* Usando '/' como separador */}
            <span className="text-text-main-light dark:text-text-main-dark font-medium">Lançamentos</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-text-main-light dark:text-text-main-dark">Extrato de Lançamentos</h1>
          <p className="text-text-secondary-light dark:text-text-secondary-dark text-lg max-w-2xl">Visualize e gerencie todas as suas transações financeiras.</p>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar lançamentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl border-border-light dark:border-[#2d2438] bg-background-light dark:bg-[#1e1629] text-text-main-light dark:text-text-main-dark placeholder-text-secondary-light dark:placeholder-text-secondary-dark focus:ring-primary-new focus:border-primary-new"
            />
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all active:scale-95">
            <Plus className="h-4 w-4 mr-2" />
            Novo Lançamento
          </Button>
        </div>

        {/* Transactions List */}
        <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl shadow-soft border border-border-light dark:border-[#2d2438] flex flex-col">
          <CardHeader className="p-6 border-b border-border-light dark:border-[#2d2438] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-bold text-text-main-light dark:text-text-main-dark">Transações Recentes</CardTitle>
            <div className="flex gap-3">
              <Button variant="outline" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark bg-background-light dark:bg-[#2d2438] hover:bg-background-light/70 dark:hover:bg-[#2d2438]/70 rounded-lg border border-border-light dark:border-[#3a3045] transition-colors">
                <Filter className="h-4 w-4" />
                Filtrar
              </Button>
              <Button variant="outline" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark bg-background-light dark:bg-[#2d2438] hover:bg-background-light/70 dark:hover:bg-[#2d2438]/70 rounded-lg border border-border-light dark:border-[#3a3045] transition-colors">
                <Plus className="h-4 w-4" /> {/* Usando Plus como um ícone genérico para exportar */}
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLancamentos.length === 0 ? (
              <div className="text-center py-12 text-text-secondary-light dark:text-text-secondary-dark">
                Nenhum lançamento encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark uppercase bg-background-light/50 dark:bg-[#2d2438]/30 border-b border-border-light dark:border-[#2d2438]">
                      <th className="px-6 py-4 whitespace-nowrap">Data</th>
                      <th className="px-6 py-4 w-1/3">Descrição</th>
                      <th className="px-6 py-4">Categoria</th>
                      <th className="px-6 py-4 text-right">Valor</th>
                      <th className="px-6 py-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-[#2d2438] text-sm">
                    {filteredLancamentos.map((lancamento) => {
                      const categoryName = getCategoryName(lancamento.lan_categoria);
                      const isExpense = categorias.find(cat => cat.cat_id === lancamento.lan_categoria)?.cat_tipo === 'despesa';
                      const valueColorClass = isExpense ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400';
                      const formattedValue = formatCurrency(Number(lancamento.lan_valor));

                      return (
                        <tr
                          key={lancamento.lan_id}
                          className="group hover:bg-background-light dark:hover:bg-[#2d2438]/50 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4 text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap">
                            {format(new Date(lancamento.lan_data), "dd MMM, yyyy", { locale: ptBR })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "size-8 rounded-full flex items-center justify-center",
                                isExpense ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                              )}>
                                {getCategoryIcon(categoryName)}
                              </div>
                              <span className="font-medium text-text-main-light dark:text-text-main-dark">
                                {lancamento.lan_descricao || 'Sem descrição'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full bg-background-light dark:bg-[#2d2438] text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
                              {categoryName}
                            </span>
                          </td>
                          <td className={cn("px-6 py-4 text-right font-medium", valueColorClass)}>
                            {isExpense ? '-' : '+'} {formattedValue}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex gap-2 justify-center">
                              <Button variant="ghost" size="icon" className="text-text-secondary-light dark:text-text-secondary-dark hover:bg-background-light dark:hover:bg-[#3a3045]">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Footer Pagination (Simplified) */}
        <div className="p-4 border-t border-border-light dark:border-[#2d2438] flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Mostrando 1 a {filteredLancamentos.length} de {lancamentos.length} resultados</span>
          <div className="flex gap-2">
            <Button variant="outline" className="px-3 py-1.5 rounded border border-border-light dark:border-[#2d2438] text-text-secondary-light dark:text-text-secondary-dark text-sm hover:bg-background-light dark:hover:bg-[#2d2438] disabled:opacity-50" disabled>Anterior</Button>
            <Button variant="outline" className="px-3 py-1.5 rounded border border-border-light dark:border-[#2d2438] text-text-main-light dark:text-text-main-dark text-sm hover:bg-background-light dark:hover:bg-[#2d2438]">Próximo</Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Lancamentos;