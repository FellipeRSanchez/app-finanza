"use client";
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Search, Database, Landmark, ShoppingCart, Bitcoin, Building, ArrowUp, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import AddInvestmentForm from '@/components/investments/AddInvestmentForm'; // Fixed import path

interface Investment {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  type: string;
  avg_price: number;
  current_value: number;
  performance_value: number;
  performance_percent: number;
  positive: boolean;
  created_at: string;
}

const Investimentos = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchInvestments();
    }
  }, [user]);

  const fetchInvestments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('investimentos')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvestments(data || []);
    } catch (error) {
      console.error('Error fetching investments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredInvestments = investments.filter(investment =>
    investment.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    investment.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIconForType = (type: string) => {
    switch(type) {
      case 'Ações BDR': return <Database size={20} />;
      case 'Renda Fixa': return <Landmark size={20} />;
      case 'Ações Brasil': return <ShoppingCart size={20} />;
      case 'Cripto': return <Bitcoin size={20} />;
      case 'FIIs': return <Building size={20} />;
      default: return <Database size={20} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'Ações BDR': return 'bg-purple-50 text-purple-700 ring-purple-700/10 dark:bg-purple-400/10 dark:text-purple-400 dark:ring-purple-400/30';
      case 'Renda Fixa': return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30';
      case 'Ações Brasil': return 'bg-blue-50 text-blue-700 ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/30';
      case 'Cripto': return 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-400/10 dark:text-orange-400 dark:ring-orange-400/30';
      case 'FIIs': return 'bg-indigo-50 text-indigo-700 ring-indigo-700/10 dark:bg-indigo-400/10 dark:text-indigo-400 dark:ring-indigo-400/30';
      default: return 'bg-gray-50 text-gray-700 ring-gray-700/10 dark:bg-gray-400/10 dark:text-gray-400 dark:ring-gray-400/30';
    }
  };

  const totalInvestido = investments.reduce((sum, inv) => sum + (inv.avg_price || 0), 0);
  const saldoAtual = investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
  const rentabilidadeTotal = investments.reduce((sum, inv) => sum + (inv.performance_value || 0), 0);
  const rentabilidadePercent = totalInvestido > 0 ? (rentabilidadeTotal / totalInvestido) * 100 : 0;

  if (loading) {
    return (
      <MainLayout title="Investimentos">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Investimentos">
      <div className="container mx-auto max-w-7xl p-4 lg:p-8">
        {/* Page Heading */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
              <span>Finanças</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-primary-new">Investimentos</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-main-light dark:text-text-main-dark lg:text-4xl">
              Meus Investimentos
            </h1>
            <p className="mt-1 text-text-secondary-light dark:text-text-secondary-dark">
              Acompanhe a performance detalhada da sua carteira.
            </p>
          </div>
          <AddInvestmentForm onInvestmentAdded={fetchInvestments} />
        </div>

        {/* Summary Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1 */}
          <Card className="group relative overflow-hidden rounded-2xl bg-card-light p-6 shadow-soft transition-all hover:shadow-md dark:bg-[#1e1629] border border-transparent dark:border-[#2d2438]">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary-new/5 transition-transform group-hover:scale-110 dark:bg-primary-new/10"></div>
            <div className="relative z-10 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-text-secondary-light dark:text-text-secondary-dark">
                <Landmark size={20} />
                <span className="text-sm font-medium">Total Investido</span>
              </div>
              <span className="mt-2 text-2xl font-bold tracking-tight text-text-main-light dark:text-text-main-dark lg:text-3xl">
                {formatCurrency(totalInvestido)}
              </span>
            </div>
          </Card>

          {/* Card 2 */}
          <Card className="group relative overflow-hidden rounded-2xl bg-card-light p-6 shadow-soft transition-all hover:shadow-md dark:bg-[#1e1629] border border-transparent dark:border-[#2d2438]">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-emerald-500/5 transition-transform group-hover:scale-110 dark:bg-emerald-500/10"></div>
            <div className="relative z-10 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-text-secondary-light dark:text-text-secondary-dark">
                <TrendingUp size={20} />
                <span className="text-sm font-medium">Saldo Atual</span>
              </div>
              <span className="mt-2 text-2xl font-bold tracking-tight text-text-main-light dark:text-text-main-dark lg:text-3xl">
                {formatCurrency(saldoAtual)}
              </span>
            </div>
          </Card>

          {/* Card 3 */}
          <Card className="group relative overflow-hidden rounded-2xl bg-card-light p-6 shadow-soft transition-all hover:shadow-md dark:bg-[#1e1629] border border-transparent dark:border-[#2d2438]">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-emerald-500/5 transition-transform group-hover:scale-110 dark:bg-emerald-500/10"></div>
            <div className="relative z-10 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-text-secondary-light dark:text-text-secondary-dark">
                <TrendingUp size={20} />
                <span className="text-sm font-medium">Rentabilidade</span>
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className={cn("text-2xl font-bold tracking-tight lg:text-3xl", rentabilidadeTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                  {rentabilidadeTotal >= 0 ? '+' : ''}{formatCurrency(rentabilidadeTotal)}
                </span>
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold", rentabilidadeTotal >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400')}>
                  {rentabilidadeTotal >= 0 ? <ArrowUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                  {rentabilidadePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Content Area */}
        <Card className="flex flex-col gap-6 rounded-2xl bg-card-light p-6 shadow-soft dark:bg-[#1e1629]">
          {/* Filters & Search */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative w-full max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="text-text-secondary-light dark:text-text-secondary-dark" size={20} />
              </div>
              <Input
                placeholder="Buscar ativo por nome ou símbolo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-xl border-border-light bg-background-light py-3 pl-10 pr-4 text-sm text-text-main-light placeholder-text-secondary-light focus:border-primary-new focus:bg-white focus:ring-1 focus:ring-primary-new dark:border-[#2d2438] dark:bg-[#1e1629] dark:text-text-main-dark dark:placeholder-text-secondary-dark dark:focus:border-primary-new"
              />
            </div>

            {/* Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <Button className="rounded-lg bg-primary-new px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-new/90">
                Todos
              </Button>
              <Button className="rounded-lg border border-border-light bg-card-light px-4 py-2 text-sm font-medium text-text-secondary-light hover:bg-background-light hover:text-text-main-light dark:border-[#2d2438] dark:bg-[#1e1629] dark:text-text-secondary-dark dark:hover:bg-[#2d2438]/80 dark:hover:text-text-main-dark">
                Ações
              </Button>
              <Button className="rounded-lg border border-border-light bg-card-light px-4 py-2 text-sm font-medium text-text-secondary-light hover:bg-background-light hover:text-text-main-light dark:border-[#2d2438] dark:bg-[#1e1629] dark:text-text-secondary-dark dark:hover:bg-[#2d2438]/80 dark:hover:text-text-main-dark">
                Renda Fixa
              </Button>
              <Button className="rounded-lg border border-border-light bg-card-light px-4 py-2 text-sm font-medium text-text-secondary-light hover:bg-background-light hover:text-text-main-light dark:border-[#2d2438] dark:bg-[#1e1629] dark:text-text-secondary-dark dark:hover:bg-[#2d2438]/80 dark:hover:text-text-main-dark">
                FIIs
              </Button>
              <Button className="rounded-lg border border-border-light bg-card-light px-4 py-2 text-sm font-medium text-text-secondary-light hover:bg-background-light hover:text-text-main-light dark:border-[#2d2438] dark:bg-[#1e1629] dark:text-text-secondary-dark dark:hover:bg-[#2d2438]/80 dark:hover:text-text-main-dark">
                Cripto
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="relative overflow-x-auto rounded-xl border border-border-light dark:border-[#2d2438]">
            <Table>
              <TableHeader>
                <TableRow className="bg-background-light text-xs uppercase text-text-secondary-light dark:bg-[#1e1629] dark:text-text-secondary-dark">
                  <TableHead className="px-6 py-4 font-semibold" scope="col">
                    Ativo
                  </TableHead>
                  <TableHead className="px-6 py-4 font-semibold" scope="col">
                    Tipo
                  </TableHead>
                  <TableHead className="px-6 py-4 font-semibold text-right" scope="col">
                    Preço Médio
                  </TableHead>
                  <TableHead className="px-6 py-4 font-semibold text-right" scope="col">
                    Saldo Atual
                  </TableHead>
                  <TableHead className="px-6 py-4 font-semibold text-right" scope="col">
                    Rentabilidade
                  </TableHead>
                  <TableHead className="px-6 py-4 font-semibold text-center" scope="col">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border-light dark:divide-[#2d2438]">
                {filteredInvestments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-text-secondary-light dark:text-text-secondary-dark">
                      Nenhum investimento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvestments.map((investment) => (
                    <TableRow
                      key={investment.id}
                      className="bg-card-light transition-colors hover:bg-background-light dark:bg-[#1e1629] dark:hover:bg-[#251b30]"
                    >
                      <TableCell className="whitespace-nowrap px-6 py-4 font-medium text-text-main-light dark:text-text-main-dark">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background-light text-text-secondary-light dark:bg-[#2d2438] dark:text-text-secondary-dark">
                            {getIconForType(investment.type)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold">{investment.symbol}</span>
                            <span className="text-xs font-normal text-text-secondary-light">{investment.name}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span
                          className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset", getTypeColor(
                            investment.type
                          ))}
                        >
                          {investment.type}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">{formatCurrency(investment.avg_price || 0)}</TableCell>
                      <TableCell className="px-6 py-4 text-right font-bold text-text-main-light dark:text-text-main-dark">
                        {formatCurrency(investment.current_value || 0)}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={cn("text-sm font-bold",
                              investment.positive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            )}
                          >
                            {investment.positive ? '+' : ''}{formatCurrency(investment.performance_value || 0)}
                          </span>
                          <span
                            className={cn("text-xs",
                              investment.positive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            )}
                          >
                            {investment.performance_percent.toFixed(2)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full p-2 text-text-secondary-light hover:bg-background-light hover:text-text-main-light dark:hover:bg-[#2d2438] dark:hover:text-text-main-dark"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border-light pt-4 dark:border-[#2d2438]">
            <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Mostrando <span className="font-semibold text-text-main-light dark:text-text-main-dark">1-{filteredInvestments.length}</span> de{' '}
              <span className="font-semibold text-text-main-light dark:text-text-main-dark">{investments.length}</span> ativos
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-light text-text-secondary-light hover:bg-background-light hover:text-text-main-light dark:border-[#2d2438] dark:hover:bg-[#1e1629] dark:hover:text-text-main-dark disabled:opacity-50"
                disabled
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-light text-text-secondary-light hover:bg-background-light hover:text-text-main-light dark:border-[#2d2438] dark:hover:bg-[#1e1629] dark:hover:text-text-main-dark"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Investimentos;