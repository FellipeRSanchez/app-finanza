"use client";
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Search, Database, Landmark, ShoppingCart, Bitcoin, Building, ArrowUp, ArrowDown, Wallet, PiggyBank, Coins } from 'lucide-react';
import { useState } from 'react';

const Investimentos = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Sample investment data
  const investments = [
    {
      id: 1,
      symbol: 'AAPL34',
      name: 'Apple Inc.',
      type: 'Ações BDR',
      avgPrice: 'R$ 42,50',
      currentValue: 'R$ 18.450,00',
      performanceValue: '+R$ 2.450,00',
      performancePercent: '15,31%',
      positive: true
    },
    {
      id: 2,
      symbol: 'Tesouro Selic',
      name: 'Vencimento 2027',
      type: 'Renda Fixa',
      avgPrice: '-',
      currentValue: 'R$ 45.000,00',
      performanceValue: '+R$ 3.120,00',
      performancePercent: '7,45%',
      positive: true
    },
    {
      id: 3,
      symbol: 'MGLU3',
      name: 'Magazine Luiza',
      type: 'Ações Brasil',
      avgPrice: 'R$ 12,40',
      currentValue: 'R$ 2.300,00',
      performanceValue: '-R$ 2.700,00',
      performancePercent: '54,00%',
      positive: false
    },
    {
      id: 4,
      symbol: 'BTC',
      name: 'Bitcoin',
      type: 'Cripto',
      avgPrice: 'R$ 310.000',
      currentValue: 'R$ 15.600,00',
      performanceValue: '+R$ 8.900,00',
      performancePercent: '132,80%',
      positive: true
    },
    {
      id: 5,
      symbol: 'HGLG11',
      name: 'CSHG Logística',
      type: 'FIIs',
      avgPrice: 'R$ 162,00',
      currentValue: 'R$ 51.100,00',
      performanceValue: '+R$ 680,00',
      performancePercent: '1,35%',
      positive: true
    }
  ];

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

  return (
    <MainLayout title="Investimentos">
      <div className="container mx-auto max-w-7xl p-4 lg:p-8">
        {/* Page Heading */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
              <span>Finanças</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="text-primary-new">Investimentos</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-main-light dark:text-text-main-dark lg:text-4xl">
              Meus Investimentos
            </h1>
            <p className="mt-1 text-text-secondary-light dark:text-text-secondary-dark">
              Acompanhe a performance detalhada da sua carteira.
            </p>
          </div>
          <Button className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary-new px-5 text-sm font-semibold text-white shadow-lg shadow-primary-new/30 transition-all hover:bg-primary-new/90 focus:ring-2 focus:ring-primary-new focus:ring-offset-2 dark:focus:ring-offset-[#191022]">
            <ArrowUp size={20} />
            Novo Aporte
          </Button>
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
                R$ 120.000,00
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
                R$ 132.450,00
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
                <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 lg:text-3xl">
                  +R$ 12.450,00
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <ArrowUp size={12} className="mr-1" />
                  10,3%
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
                {filteredInvestments.map((investment) => (
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
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getTypeColor(
                          investment.type
                        )}`}
                      >
                        {investment.type}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">{investment.avgPrice}</TableCell>
                    <TableCell className="px-6 py-4 text-right font-bold text-text-main-light dark:text-text-main-dark">
                      {investment.currentValue}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span
                          className={`text-sm font-bold ${
                            investment.positive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {investment.performanceValue}
                        </span>
                        <span
                          className={`text-xs ${
                            investment.positive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {investment.performancePercent}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full p-2 text-text-secondary-light hover:bg-background-light hover:text-text-main-light dark:hover:bg-[#2d2438] dark:hover:text-text-main-dark"
                      >
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border-light pt-4 dark:border-[#2d2438]">
            <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Mostrando <span className="font-semibold text-text-main-light dark:text-text-main-dark">1-{filteredInvestments.length}</span> de{' '}
              <span className="font-semibold text-text-main-light dark:text-text-main-dark">{filteredInvestments.length}</span> ativos
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-light text-text-secondary-light hover:bg-background-light hover:text-text-main-light dark:border-[#2d2438] dark:hover:bg-[#1e1629] dark:hover:text-text-main-dark disabled:opacity-50"
                disabled
              >
                <ArrowDown size={18} className="rotate-90" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-light text-text-secondary-light hover:bg-background-light hover:text-text-main-light dark:border-[#2d2438] dark:hover:bg-[#1e1629] dark:hover:text-text-main-dark"
              >
                <ArrowDown size={18} className="-rotate-90" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Investimentos;